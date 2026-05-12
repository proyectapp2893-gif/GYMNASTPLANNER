import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase-server'

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'Gymnastplanner@gmail.com').trim().toLowerCase()
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

type GeminiModel = {
  name: string
  supportedGenerationMethods?: string[]
}

type GeminiListModelsResponse = {
  models?: GeminiModel[]
  error?: { message?: string; status?: string; code?: number }
}

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  error?: { message?: string; status?: string; code?: number }
}

async function ensureSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return Boolean(!error && user?.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL)
}

export async function GET() {
  const allowed = await ensureSuperAdmin()
  if (!allowed) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY || ''
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      keyConfigured: false,
      error: 'GEMINI_API_KEY no está configurada en Vercel',
    }, { status: 500 })
  }

  const listResult = await fetch(`${GEMINI_API_BASE}/models?key=${encodeURIComponent(apiKey)}`, {
    method: 'GET',
    cache: 'no-store',
  })

  const listData = await listResult.json().catch(() => null) as GeminiListModelsResponse | null
  if (!listResult.ok || listData?.error) {
    return NextResponse.json({
      ok: false,
      keyConfigured: true,
      listModelsOk: false,
      status: listResult.status,
      error: listData?.error?.message || 'No se pudo listar modelos Gemini',
      googleStatus: listData?.error?.status || null,
    }, { status: 200 })
  }

  const models = (listData?.models || [])
    .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
    .map(model => model.name)
    .sort(scoreModelName)

  const selectedModel = models[0] || null
  if (!selectedModel) {
    return NextResponse.json({
      ok: false,
      keyConfigured: true,
      listModelsOk: true,
      generateContentModels: [],
      error: 'La clave lista modelos, pero ninguno permite generateContent',
    }, { status: 200 })
  }

  const generateResult = await fetch(`${GEMINI_API_BASE}/${selectedModel}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Responde solo: OK' }] }],
      generationConfig: { temperature: 0 },
    }),
  })

  const generateData = await generateResult.json().catch(() => null) as GeminiGenerateResponse | null
  const text = generateData?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() || ''

  return NextResponse.json({
    ok: generateResult.ok && Boolean(text),
    keyConfigured: true,
    listModelsOk: true,
    modelCount: models.length,
    selectedModel,
    sampleModels: models.slice(0, 8),
    generateOk: generateResult.ok,
    generateStatus: generateResult.status,
    responsePreview: text.slice(0, 40),
    error: generateData?.error?.message || null,
    googleStatus: generateData?.error?.status || null,
  }, { status: 200 })
}

function scoreModelName(a: string, b: string) {
  return score(b) - score(a)
}

function score(modelName: string) {
  const name = modelName.toLowerCase()
  let value = 0
  if (name.includes('2.5')) value += 100
  if (name.includes('2.0')) value += 80
  if (name.includes('flash')) value += 40
  if (name.includes('lite')) value -= 10
  if (name.includes('pro')) value -= 20
  if (name.includes('embedding')) value -= 100
  return value
}
