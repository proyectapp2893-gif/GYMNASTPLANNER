import AthleteDevelopmentProfile from '../../../../components/gymnasts/AthleteDevelopmentProfile'
import {getAthleteDevelopmentWorkspace} from '../../../../lib/athlete-development/server'

export default async function AthleteDevelopmentPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  return <AthleteDevelopmentProfile athleteId={id} initialData={await getAthleteDevelopmentWorkspace(id)}/>
}
