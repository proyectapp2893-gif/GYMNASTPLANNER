import {describe,expect,it} from 'vitest'
import {adaptGeneralSession} from './general-adapter'

describe('adaptGeneralSession',()=>{
  it('inherits legacy general blocks without duplicating repeated exercises',()=>{
    let sequence=0
    const result=adaptGeneralSession({id:'11111111-1111-4111-8111-111111111111',date:'2026-08-05',objective:'Coreografía y prevención',exercises:{calentamiento_general:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',contenido:'Movilidad'}],tecnico_aparato1:[{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',contenido:'Ballet'}],rutinas:[{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',contenido:'Ballet'}]}},()=>`00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`)
    expect(result.sourceSessionId).toBe('11111111-1111-4111-8111-111111111111')
    expect(result.blocks).toHaveLength(5)
    expect(result.blocks.every(block=>block.origin==='heredado')).toBe(true)
    expect(result.blocks.find(block=>block.phase==='tecnico')?.exercises).toHaveLength(1)
  })

  it('ignores malformed legacy exercises safely',()=>{
    const result=adaptGeneralSession({id:'11111111-1111-4111-8111-111111111111',date:'2026-08-05',objective:'Sesión',exercises:{tecnico:[null,{contenido:'Sin id'}]}})
    expect(result.blocks.flatMap(block=>block.exercises)).toEqual([])
  })
})
