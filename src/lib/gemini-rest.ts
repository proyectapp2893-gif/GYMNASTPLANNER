type GeminiModel = {
  name: string
  supportedGenerationMethods?: string[]
}

type GeminiListModelsResponse = {
  models?: GeminiModel[]
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const FALLBACK_MODELS = [
  'models/gemini-2.5-flash',
  'models/gemini-2.5-flash-lite',
  'models/gemini-2.0-flash',
  'models/gemini-2.0-flash-lite',
]

let cachedModelName: string | null = null

export async function generateGeminiTextRest(prompt: string, apiKey: string) {
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada')

  const modelNames = await getAvailableModelNames(apiKey)
  let lastError: unknown

  for (const modelName of modelNames) {
    try {
      const text = await generateWithModel(prompt, apiKey, modelName)
      cachedModelName = modelName
      return { text, modelName }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No se pudo generar texto con Gemini')
}

async function getAvailableModelNames(apiKey: string) {
  if (cachedModelName) return [cachedModelName, ...FALLBACK_MODELS.filter(model => model !== cachedModelName)]

  try {
    const response = await fetch(`${GEMINI_API_BASE}/models?key=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) throw new Error(`ListModels falló: ${response.status}`)

    const data = await response.json() as GeminiListModelsResponse
    const models = (data.models || [])
      .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
      .map(model => model.name)
      .sort(scoreModelName)

    if (models.length > 0) return [...models, ...FALLBACK_MODELS.filter(model => !models.includes(model))]
  } catch (error) {
    console.error('No se pudo listar modelos Gemini:', error)
  }

  return FALLBACK_MODELS
}

async function generateWithModel(prompt: string, apiKey: string, modelName: string) {
  const response = await fetch(`${GEMINI_API_BASE}/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
      },
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = getGeminiErrorMessage(data) || `Gemini respondió ${response.status}`
    throw new Error(`${message} (${modelName})`)
  }

  const parsed = data as GeminiGenerateResponse
  const text = parsed.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim()
  if (!text) throw new Error(`Gemini no devolvió texto (${modelName})`)

  return text
}

function getGeminiErrorMessage(data: unknown) {
  if (typeof data !== 'object' || data === null || !('error' in data)) return ''
  const error = (data as { error?: { message?: unknown } }).error
  return typeof error?.message === 'string' ? error.message : ''
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
