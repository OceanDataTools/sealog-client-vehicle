// These constants build lowercase and titlecase versions of the cruise names
// Credit rgov (WHOIGit/ndsf-sealog-client)

import { CUSTOM_CRUISE_NAME, CUSTOM_LOWERING_NAME } from './client_config'
import { toTitlecase } from './utils'

export const [_cruise_, _cruises_] = CUSTOM_CRUISE_NAME || ['cruises', 'cruises']

export const [_Cruise_, _Cruises_] = [toTitlecase(_cruise_), toTitlecase(_cruises_)]

export const [_lowering_, _lowerings_] = CUSTOM_LOWERING_NAME || ['lowering', 'lowerings']

export const [_Lowering_, _Lowerings_] = [toTitlecase(_lowering_), toTitlecase(_lowerings_)]
