import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__编者按, 'src/assets', filename)
      }
    },
  }
}

// 真模型代理：把 /api/generate 转发到 DeepSeek（避免前端直连 CORS / 暴露 key）
function deepseekProxy() {
  return {
    name: 'deepseek-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/generate', async (req: any, res: any) => {
        const key = process.env.DEEPSEEK_API_KEY
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
            const prompt = `你是中小学老师的好帮手。根据以下信息生成一段微信长文和一段口语化语音脚本（各 80-120 字），语气亲切、带 emoji：\n学科：${ctx.subject}\n专注度：${ctx.focusStar}/5\n吸收度：${ctx.absorbStar}/5\n表现标签：${ctx.tags.map((t: any) => t.tag).join('、')}\n老师备注：${ctx.note}\n学生：${student.name}（${student.personality || '无特殊备注'}）`
            const r = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
              body: JSON.stringify({ model: 'deepseek-ai/DeepSeek-V3', messages: [{ role: 'user', content: prompt }], stream: false }),
            })
            const data = await r.json()
            const text = data?.choices?.[0]?.message?.content || ''
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ wechat: text, voice: text }))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(e) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    deepseekProxy(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
