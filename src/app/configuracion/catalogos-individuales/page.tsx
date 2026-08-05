import BatteryManager from '../../../components/gymnasts/BatteryManager'
import CatalogManager from '../../../components/gymnasts/CatalogManager'
import EvidenceSettings from '../../../components/gymnasts/EvidenceSettings'
import LoadThresholdSettings from '../../../components/gymnasts/LoadThresholdSettings'
import {getAdminCatalogWorkspace} from '../../../lib/gymnasts/server'

export default async function CatalogsPage(){
  const data=await getAdminCatalogWorkspace()
  const tests=data.tests.map(item=>({id:String(item.id),name:String(item.nombre),code:String(item.codigo),unit:String(item.unidad),active:Boolean(item.activo),owned:String(item.club_id)===data.clubId}))
  return <div className="mx-auto max-w-7xl space-y-6">
    <header><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Administración deportiva</p><h1 className="text-3xl font-black">Catálogos del módulo individual</h1><p className="text-sm text-slate-500">Estados, aparatos, errores, niveles de ayuda, objetivos, pruebas y límites sin cambios de código.</p></header>
    <div className="grid gap-5 lg:grid-cols-2"><LoadThresholdSettings initial={{weeklyIncrease:Number(data.loadSettings.aumento_semanal_aviso_pct),highRpe:Number(data.loadSettings.rpe_alto),highFatigue:Number(data.loadSettings.fatiga_alta)}}/><EvidenceSettings initialMaximumMb={Number(data.evidenceSettings.tamano_maximo_mb)}/></div>
    <CatalogManager catalogs={data.catalogs.map(item=>({id:String(item.id),name:String(item.nombre),code:String(item.codigo),editable:Boolean(item.editable)}))} items={data.items.map(item=>({id:String(item.id),catalogId:String(item.catalogo_id),name:String(item.nombre),code:String(item.codigo),active:Boolean(item.activo),owned:String(item.club_id)===data.clubId}))} tests={tests}/>
    <BatteryManager tests={tests.filter(test=>test.active)} batteries={data.batteries.map(battery=>({id:String(battery.id),name:String(battery.nombre),description:String(battery.descripcion||''),active:Boolean(battery.activa),testIds:(Array.isArray(battery.bateria_pruebas_items)?battery.bateria_pruebas_items:[]).sort((a,b)=>Number(a.orden)-Number(b.orden)).map(item=>String(item.prueba_id))}))}/>
  </div>
}
