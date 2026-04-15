import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../../../../lib/supabase' // Ajusta esta ruta si es diferente en tu archivo original

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})); 
    // 🔥 Recibimos el clubId (seguridad), el tema y la cantidad desde el nuevo modal
    const { clubId, tema, cantidad } = body;

    const cant = cantidad || 10;
    const enfoque = tema || 'ejercicios variados de gimnasia artística';

    const urlModelos = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    const respuestaModelos = await fetch(urlModelos)
    const datosModelos = await respuestaModelos.json()
    const modelosValidos = datosModelos.models || []
    const modeloIdeal = modelosValidos.find((m: any) => 
      m.supportedGenerationMethods?.includes('generateContent') && 
      (m.name.includes('flash') || m.name.includes('pro'))
    )
    const nombreModelo = modeloIdeal ? modeloIdeal.name.replace('models/', '') : 'gemini-1.5-flash'

    // 🔥 EL NUEVO PROMPT DINÁMICO Y ESTRICTO
    const prompt = `
      Actúa como un experto mundial en Gimnasia Artística Femenina y Biomecánica.
      Genera exactamente ${cant} ejercicios enfocados EXCLUSIVAMENTE en este tema: "${enfoque}".

      Reglas Estrictas de Formato (Devuelve ÚNICAMENTE un arreglo JSON válido, sin marcas de markdown, sin texto adicional):
      [
        {
          "nombre": "Nombre del ejercicio",
          "categoria": "Elige SOLO UNA: Técnico, Prep. Física - General, Prep. Física - Tarjeta Roja, Flexibilidad, Calentamiento, Calma / Cierre, Rutina Completa, Secuencia / Conexión",
          "aparato": "Elige SOLO UNO: General, Barras Asimétricas, Viga de Equilibrio, Suelo, Salto, Trampolín",
          "dificultad": "Elige SOLO UNA: Básico, Intermedio, Avanzado, Élite",
          "descripcion_corta": "Descripción técnica breve, máximo 15 palabras",
          "rangos_repeticiones": "Ej: 10-20 reps o 30-60 seg",
          "etiquetas": "2 o 3 palabras clave separadas por comas. Ej: Kip, Core, Fuerza"
        }
      ]
    `

    const model = genAI.getGenerativeModel({ model: nombreModelo })
    const result = await model.generateContent(prompt)
    
    // Limpieza extrema del JSON por si Gemini envía texto extra
    const responseText = result.response.text()
    const cleanJson = responseText.substring(responseText.indexOf('['), responseText.lastIndexOf(']') + 1) || responseText.replace(/```json/g, '').replace(/```/g, '').trim()
    
    const ejerciciosGenerados = JSON.parse(cleanJson)

    // Agregamos la capa de seguridad Multiclub
    const ejerciciosParaGuardar = ejerciciosGenerados.map((ej: any) => ({
      ...ej,
      club_id: clubId || null 
    }))

    // Inserción directa en la base de datos
    const { error } = await supabase.from('ejercicios').insert(ejerciciosParaGuardar)
    
    if (error) throw error

    return NextResponse.json({ success: true, count: ejerciciosParaGuardar.length })

  } catch (error) {
    console.error('Error generando ejercicios:', error)
    return NextResponse.json({ error: 'Fallo al generar' }, { status: 500 })
  }
}