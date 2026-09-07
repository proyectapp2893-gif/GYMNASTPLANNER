export type HeightMeasurement={date:string;standingHeightCm:number|null}

export type GrowthObservation={
  status:'insufficient_data'|'observation_available'
  days:number|null
  changeCm:number|null
  annualizedCm:number|null
  message:string
}

export function calculateGrowthObservation(rows:HeightMeasurement[]):GrowthObservation{
  const usable=rows.filter((row):row is {date:string;standingHeightCm:number}=>Number.isFinite(row.standingHeightCm))
    .sort((a,b)=>a.date.localeCompare(b.date))
  if(usable.length<2)return{status:'insufficient_data',days:null,changeCm:null,annualizedCm:null,message:'Se necesitan al menos dos estaturas de pie comparables.'}
  const first=usable[0],last=usable[usable.length-1]
  const days=Math.round((Date.parse(`${last.date}T12:00:00Z`)-Date.parse(`${first.date}T12:00:00Z`))/86400000)
  if(!Number.isFinite(days)||days<60)return{status:'insufficient_data',days,changeCm:null,annualizedCm:null,message:'Se requieren al menos 60 días entre mediciones comparables.'}
  const change=round(last.standingHeightCm-first.standingHeightCm)
  return{status:'observation_available',days,changeCm:change,annualizedCm:round(change*365.25/days),message:'Tendencia descriptiva para revisión del entrenador; no determina maduración ni diagnóstico.'}
}

function round(value:number){return Math.round(value*10)/10}
