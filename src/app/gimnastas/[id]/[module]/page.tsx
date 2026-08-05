import ModuleEmptyState from '../../../../components/gymnasts/ModuleEmptyState'
import { getModuleRows } from '../../../../lib/gymnasts/server'

const modules:Record<string,{title:string;description:string}>={
  sesiones:{title:'Sesiones individuales',description:'Sesiones programadas, publicadas y ejecutadas para esta gimnasta.'},
  tecnica:{title:'Matriz técnica',description:'Elementos, estados de dominio, progresiones y evaluaciones.'},
  'preparacion-fisica':{title:'Preparación física',description:'Capacidades físicas y trabajo complementario relacionado con necesidades técnicas.'},
  evaluaciones:{title:'Evaluaciones',description:'Historial de baterías y resultados de pruebas configurables.'},
  objetivos:{title:'Objetivos individuales',description:'Objetivos técnicos, físicos, pedagógicos y competitivos.'},
  cargas:{title:'Carga y bienestar',description:'Duración, RPE y carga interna transparente por sesión.'},
  evidencias:{title:'Evidencias',description:'Videos e imágenes privadas vinculadas con sesiones y elementos.'},
  restricciones:{title:'Restricciones y reintegro',description:'Adaptaciones temporales y advertencias preventivas activas.'},
  competencias:{title:'Preparación competitiva',description:'Objetivos, rutinas y elementos requeridos para próximas competencias.'},
  informes:{title:'Informes',description:'Información técnica, física, pedagógica y de cumplimiento.'},
}

export default async function GymnastModulePage({params}:{params:Promise<{id:string;module:string}>}){
  const {id,module}=await params;const config=modules[module]
  if(!config)return <ModuleEmptyState title="Sección no disponible" description="La ruta solicitada no pertenece al perfil individual."/>
  const rows=await getModuleRows(id,module)
  return <div className="mx-auto max-w-7xl space-y-5"><header><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Seguimiento individual</p><h2 className="mt-1 text-2xl font-black text-slate-900">{config.title}</h2><p className="mt-2 text-sm text-slate-500">{config.description}</p></header>{rows.length===0?<ModuleEmptyState title={`Sin registros en ${config.title.toLowerCase()}`} description="Esta sección está conectada a Supabase y mostrará el historial cuando se registren datos."/>:<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100">{rows.map((row,index)=><article key={String(row.id||index)} className="p-4"><RecordSummary row={row}/></article>)}</div></div>}</div>
}

function RecordSummary({row}:{row:Record<string,unknown>}){const preferred=['descripcion','objetivo','comentario_entrenador','zona_corporal','estado','fecha','fecha_calendario','created_at','porcentaje_dominio','rpe_sesion','carga_interna'];const values=preferred.filter(key=>row[key]!==null&&row[key]!==undefined).slice(0,4);return <div className="flex flex-wrap gap-x-6 gap-y-2">{values.map(key=><div key={key}><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{key.replaceAll('_',' ')}</p><p className="max-w-xl text-sm font-semibold text-slate-700">{formatValue(row[key])}</p></div>)}</div>}
function formatValue(value:unknown){if(typeof value==='string'||typeof value==='number')return String(value);if(typeof value==='boolean')return value?'Sí':'No';return 'Registro relacionado'}
