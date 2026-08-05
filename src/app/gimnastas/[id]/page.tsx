import { redirect } from 'next/navigation'
export default async function GymnastPage({params}:{params:Promise<{id:string}>}){const {id}=await params;redirect(`/gimnastas/${id}/resumen`)}
