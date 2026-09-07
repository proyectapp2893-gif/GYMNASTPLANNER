import {describe,expect,it} from 'vitest'
import {buildMonitoringSignals} from './engine'

const base={loads:[],wellness:[],currentLoad:100,previousLoad:100,loadIncreaseThreshold:20,highRpeThreshold:8,highFatigueThreshold:4}
describe('adaptive monitoring engine',()=>{
  it('detects a configured weekly load increase',()=>{expect(buildMonitoringSignals({...base,currentLoad:130}).map(x=>x.code)).toContain('load_increase')})
  it('detects athlete-reported discomfort without diagnosing it',()=>{const result=buildMonitoringSignals({...base,wellness:[{date:'2026-09-04',fatigue:2,readiness:4,discomfort:true}]});expect(result[0]).toMatchObject({code:'discomfort',level:'review'});expect(result[0].recommendation).toContain('No interpretar como diagnóstico')})
  it('stays quiet when observations remain below configured thresholds',()=>{expect(buildMonitoringSignals(base)).toEqual([])})
  it('uses club calibration instead of fixed intensity values',()=>{const loads=[{date:'2026-09-04',plannedDuration:90,actualDuration:90,plannedIntensity:50,actualIntensity:60,rpe:5,internalLoad:450}];expect(buildMonitoringSignals({...base,loads,intensityDeviationThreshold:9}).some(x=>x.code==='intensity_deviation')).toBe(true);expect(buildMonitoringSignals({...base,loads,intensityDeviationThreshold:15}).some(x=>x.code==='intensity_deviation')).toBe(false)})
})
