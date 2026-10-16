import type { ReportInput } from './model'

export const pdfSample: ReportInput = {
  grupoId: '08d57d49-7f7c-4c12-aa97-ea47a185d8f4', mes: '2026-09', modalidad: 'Gimnasia artística', categoria: 'Femenino',
  entrenador: 'Entrenador de ejemplo', observaciones: 'Documento de muestra con datos ficticios. Priorizar el control postural, la calidad de las recepciones y la consistencia técnica. Ajustar la dosificación según la respuesta del grupo.',
  club: 'Club de Gimnasia · EJEMPLO', grupo: 'Selección deportiva',
  config: { horario_semanal: [{ dia: 'Martes' }, { dia: 'Jueves' }, { dia: 'Sábado' }], fecha_inicio: '2026-01-05', semanas_totales: 50, semanas_preparatorio: 36, semanas_competitivo: 14, fecha_competencia: '2026-11-14' },
  sessions: ['2026-09-01', '2026-09-03', '2026-09-08', '2026-09-10'].map((date, index) => ({
    id: `demo-${index}`, fecha_calendario: date, nivel: 'Nivel 3', objetivo: 'Desarrollar el control corporal y consolidar las secuencias técnicas en viga y suelo.',
    ejercicios: {
      calentamiento_general: [{ contenido: 'Movilidad articular y activación dinámica', descripcion: 'Desplazamientos suaves, movilidad de hombros y cadera, y activación progresiva del tronco.', dosificacion: '2 series de 8 repeticiones por movimiento' }],
      prep_fisica_core: [{ contenido: 'Circuito de estabilidad del tronco', descripcion: 'Alternar plancha frontal, plancha lateral y posición de hollow. Mantener la alineación y respirar durante cada tarea.', dosificacion: { base: '3 × 20 segundos', avanzado: '3 × 30 segundos' } }],
      tecnico_aparato1: [{ contenido: 'Equilibrios y enlace de saltos', aparato: 'Viga', descripcion: 'Realizar la secuencia con mirada al frente y brazos definidos. Estabilizar cada recepción antes de iniciar el siguiente elemento.', dosificacion: '4 series de 3 secuencias' }],
      tecnico_aparato2: [{ contenido: 'Parada de manos y rodada adelante', aparato: 'Suelo', descripcion: 'Practicar la alineación en la vertical y enlazar la rodada con control. Emplear ayuda del entrenador cuando sea necesario.', dosificacion: '3 series de 5 repeticiones' }],
      cierre_retroalimentacion: [{ contenido: 'Vuelta a la calma y reflexión', descripcion: 'Respiración tranquila y elongación suave. Cada gimnasta identifica un logro y un aspecto por mejorar.', dosificacion: '1 recorrido de cierre' }],
    },
  })),
}
