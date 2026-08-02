// Cloudflare Pages Functions — /api/generate
// 与 Vercel 的 api/generate.ts 逻辑完全一致，仅适配 Cloudflare 的 Web API 格式

interface Env {
  DEEPSEEK_API_KEY: string
  DEEPSEEK_MODEL?: string
}

const SILICONFLOW_BASE = 'https://api.siliconflow.cn/v1/chat/completions'

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const apiKey = env.DEEPSEEK_API_KEY
  const model = env.DEEPSEEK_MODEL || 'Qwen/Qwen3-VL-30B-A3B-Instruct'
  const t0 = Date.now()

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'missing DEEPSEEK_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const bodyObj = await request.json() as any
    const { ctx, student } = bodyObj

    if (!ctx || !student) {
      return new Response(JSON.stringify({ error: 'missing ctx or student' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tags = (ctx.tags || []).map((t: any) => t.tag || '').filter(Boolean)
    const prompt = `你是一位资深教培老师，请基于以下真实信息，为家长撰写两条个性化反馈文案。

【背景资料】学科：${ctx.subject || '本次课'}｜专注度：${ctx.focusStar}/5｜吸收度：${ctx.absorbStar}/5｜表现标签：${tags.join('、') || '无'}｜老师备注：${ctx.note || '无'}
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

    const r = await fetch(SILICONFLOW_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        temperature: 0.7,
      }),
    })
    const data = await r.json() as any

    if (!r.ok) {
      console.error('[generate] siliconflow error:', r.status, JSON.stringify(data))
      return new Response(JSON.stringify({ error: data?.message || ('siliconflow ' + r.status), code: data?.code }), {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const text: string = data?.choices?.[0]?.message?.content || ''
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
      console.warn('[generate] JSON parse failed, fallback raw text:', pe?.message)
    }

    console.log(`[generate] ok in ${Date.now() - t0}ms, wechat ${wechat.length}c / voice ${voice.length}c`)
    return new Response(JSON.stringify({ wechat, voice }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch (e: any) {
    console.error('[generate] unexpected error:', e)
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// 非 POST 请求返回 405
export const onRequest = async ({ request }: { request: Request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
    })
  }
  return onRequestPost({ request, env: {} as Env })
}
