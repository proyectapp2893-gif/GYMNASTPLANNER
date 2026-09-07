import AdaptiveMonitoringPanel from '../../../../components/gymnasts/AdaptiveMonitoringPanel'
import {getAdaptiveMonitoringWorkspace} from '../../../../lib/gymnasts/server'

export default async function LoadsPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdaptiveMonitoringPanel athleteId={id} data={await getAdaptiveMonitoringWorkspace(id)}/>}
