import {describe,expect,it} from 'vitest'
import {validateEvidencePolicy} from './schema'

const policy={maximumMb:75,allowedMimeTypes:['video/mp4','image/jpeg']}
describe('política configurable de evidencias',()=>{
  it('acepta un archivo dentro del límite y formato permitido',()=>expect(validateEvidencePolicy(20*1024*1024,'video/mp4',policy)).toBeNull())
  it('rechaza un archivo que excede el límite de la organización',()=>expect(validateEvidencePolicy(76*1024*1024,'video/mp4',policy)).toContain('75 MB'))
  it('rechaza un formato no autorizado',()=>expect(validateEvidencePolicy(10,'image/png',policy)).toContain('formato'))
})
