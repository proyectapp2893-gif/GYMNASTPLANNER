'use client'
import {Download,Printer,Users} from 'lucide-react'

export default function ReportActions({fileName,csv}:{fileName:string;csv:string}){
  const download=()=>{const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=fileName;link.click();URL.revokeObjectURL(url)}
  return <div className="flex flex-wrap gap-2 print:hidden"><button onClick={()=>window.print()} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold"><Printer className="mr-2 inline h-4 w-4"/>Imprimir / PDF</button><button onClick={download} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"><Download className="mr-2 inline h-4 w-4"/>CSV técnico</button><a href="informes/familia" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800"><Users className="mr-2 inline h-4 w-4"/>Versión para familia</a></div>
}
