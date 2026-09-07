import {describe,expect,it} from 'vitest'
import {calculateGrowthObservation} from './metrics'

describe('growth observations',()=>{
  it('does not infer a trend from close measurements',()=>{expect(calculateGrowthObservation([{date:'2026-01-01',standingHeightCm:140},{date:'2026-01-20',standingHeightCm:141}]).status).toBe('insufficient_data')})
  it('calculates a descriptive longitudinal change',()=>{expect(calculateGrowthObservation([{date:'2026-01-01',standingHeightCm:140},{date:'2026-07-01',standingHeightCm:143}])).toMatchObject({status:'observation_available',days:181,changeCm:3,annualizedCm:6.1})})
})
