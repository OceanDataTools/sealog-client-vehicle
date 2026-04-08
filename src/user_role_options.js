import { _Cruise_, _cruises_, _lowerings_ } from './vocab'

export const ADMIN = 'admin'
export const CRUISE_MANAGER = 'cruise_manager'
export const TEMPLATE_MANAGER = 'template_manager'
export const EVENT_MANAGER = 'event_manager'
export const EVENT_LOGGER = 'event_logger'
export const EVENT_WATCHER = 'event_watcher'
export const POWER_LOGGER = 'power_logger'

export const systemUserRoleOptions = [{ value: ADMIN, label: 'Admin', description: 'Basically God-like' }]

export const standardUserRoleOptions = [
  { value: CRUISE_MANAGER, label: `${_Cruise_} Manager`, description: `Ability to edit ${_cruises_} and ${_lowerings_}.` },
  { value: TEMPLATE_MANAGER, label: 'Template Manager', description: 'Ability to edit event templates.' },
  { value: EVENT_MANAGER, label: 'Event Manager', description: `Ability to review events independent of ${_lowerings_}.` },
  { value: EVENT_LOGGER, label: 'Event Logger', description: 'Abiltiy to submit new events.' },
  { value: EVENT_WATCHER, label: 'Event Watcher', description: 'Abilty to view events.' },
  { value: POWER_LOGGER, label: 'Power Logger', description: 'Abiltiy to submit new events from admin_only event templates.' }
]
