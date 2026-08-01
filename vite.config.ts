import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// 真模型代理：把 /api/generate 转发到 DeepSeek（避免前端直连 CORS / 暴露 key）
function deepseekProxy(key: string, model: string) {
  return {
    name: 'deepseek-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/generate', async (req: any, res: any) => {
        const apiKey = key
        const t0 = Date.now()
        console.log('[deepseek-proxy] >>> 收到 /api/generate 请求', new Date().toISOString())
        let body = ''
        req.on('data', (c: any) => (body += c))
        req.on('end', async () => {
          if (!key) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'missing DEEPSEEK_API_KEY' }))
            return
          }
          try {
            const { ctx, student } = JSON.parse(body)
            const prompt = `你是一位资深教培老师，请基于以下真实信息，为家长撰写两条个性化反馈文案。

【背景资料】学科：${ctx.subject || '本次课'}｜专注度：${ctx.focusStar}/5｜吸收度：${ctx.absorbStar}/5｜表现标签：${ctx.tags.map((t: any) => t.tag).join('、') || '无'}｜老师备注：${ctx.note || '无'}
【对象】姓名：${student.name}｜性格：${student.personality || '无特殊备注'}

【输出要求】
1. wechat：80-120 字微信长文，亲切自然的书面语，发给家长的文字反馈
2. voice：80-120 字口语化语音脚本，老师口吻，像跟家长当面沟通
3. 纯中文，严禁夹带英文单词或拼音
4. emoji 最多 1-2 个，自然点缀，禁止堆砌
5. 直接把「${student.name}」写进文案，给具体真实的评语，禁止占位符
6. 严禁编造背景资料未提及的具体事实：未写"老师备注"则不得虚构具体事件/回答次数/题目/作业情况；未提供学科则只写"本次课"，不得编造科目
7. 禁止输出"长文""语音脚本""个性化"等任何标签、前缀、标题
8. 称呼一律用"家长您好"或"您好"，严禁自行虚构"xx妈妈""xx爸爸"等亲属称谓
9. 严禁出现"istikin"等无意义字符
10. 严格输出 JSON：{"wechat":"...","voice":"..."}，不要 markdown 代码块、不要额外解释`
            const r = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({ model: model, messages: [{ role: 'user', content: prompt }], stream: false, temperature: 0.7 }),
            })
            const data = await r.json()
            if (!r.ok) {
              console.error('[deepseek-proxy] siliconflow 返回非 2xx：', r.status, JSON.stringify(data))
              res.statusCode = r.status
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: data?.message || ('siliconflow ' + r.status), code: data?.code }))
              return
            }
            const text = data?.choices?.[0]?.message?.content || ''
            // 解析 AI 返回的 JSON，分离 wechat 与 voice；失败则回退到同文本
            let wechat = text
            let voice = text
            try {
              const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '').trim()
              const m = cleaned.match(/\{[\s\S]*\}/)
              if (m) {
                const parsed = JSON.parse(m[0])
                if (parsed.wechat) wechat = String(parsed.wechat).trim()
                if (parsed.voice) voice = String(parsed.voice).trim()
              }
            } catch (pe) {
              console.warn('[deepseek-proxy] JSON 解析失败，回退到原文：', pe?.message)
            }
            console.log(`[deepseek-proxy] <<< 成功，耗时 ${Date.now() - t0}ms，wechat ${wechat.length} 字 / voice ${voice.length} 字`)
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ wechat, voice }))
          } catch (e) {
            console.error('[deepseek-proxy] 代理异常：', e)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: String(e?.message || e) }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // 显式加载 .env（空前缀），拿到 DEEPSEEK_API_KEY 并直接传给代理，
  // 避免依赖 process.env 注入（Vite 默认只把 VITE_ 前缀注入 process.env）
  const env = loadEnv(mode, process.cwd(), '')
  const deepseekKey = env.DEEPSEEK_API_KEY || ''
  const deepseekModel = env.DEEPSEEK_MODEL || 'Qwen/Qwen3-VL-30B-A3B-Instruct'
  const basePath = env.VITE_BASE_URL || '/'
  return {
    base: basePath,
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
      deepseekProxy(deepseekKey, deepseekModel),
    ],
    resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
