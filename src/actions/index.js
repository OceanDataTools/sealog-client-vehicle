import cookies from '../cookies'
import { push } from 'connected-react-router'
import { show } from 'redux-modal'
import { change, untouch } from 'redux-form'
import { _Cruise_, _Lowering_ } from '../vocab'
import {
  create_cruise,
  create_event,
  create_event_template,
  create_lowering,
  create_user,
  delete_cruise,
  delete_event_template,
  delete_event,
  delete_lowering,
  delete_user,
  forgot_password,
  get_cruises,
  get_event_exports,
  get_event_templates,
  get_events,
  get_events_by_lowering,
  get_lowerings,
  get_profile,
  get_users,
  post_login,
  register_user,
  reset_password,
  update_cruise,
  update_event,
  update_event_template,
  update_lowering,
  update_user,
  validate_jwt
} from '../api'

import {
  AUTH_ERROR,
  AUTH_SUCCESS,
  AUTH_USER,
  CLEAR_SELECTED_EVENT,
  CREATE_CRUISE_ERROR,
  CREATE_CRUISE_SUCCESS,
  CREATE_EVENT_TEMPLATE_ERROR,
  CREATE_EVENT_TEMPLATE_SUCCESS,
  CREATE_LOWERING_ERROR,
  CREATE_LOWERING_SUCCESS,
  CREATE_USER_ERROR,
  CREATE_USER_SUCCESS,
  EVENT_FETCHING,
  FETCH_CRUISES,
  FETCH_EVENT_TEMPLATES,
  FETCH_EVENTS,
  FETCH_FILTERED_EVENTS,
  FETCH_LOWERINGS,
  FETCH_USERS,
  INIT_CRUISE,
  INIT_EVENT,
  INIT_EVENT_TEMPLATE,
  INIT_LOWERING,
  INIT_USER,
  LEAVE_AUTH_LOGIN_FORM,
  LEAVE_CRUISE_FORM,
  LEAVE_EVENT_FILTER_FORM,
  LEAVE_EVENT_TEMPLATE_FORM,
  LEAVE_LOWERING_FORM,
  LEAVE_REGISTER_USER_FORM,
  LEAVE_UPDATE_PROFILE_FORM,
  LEAVE_USER_FORM,
  REGISTER_USER_ERROR,
  REGISTER_USER_SUCCESS,
  SET_SELECTED_EVENT,
  TOGGLE_ASNAP,
  UNAUTH_USER,
  UPDATE_CRUISE_ERROR,
  UPDATE_CRUISE_SUCCESS,
  UPDATE_EVENT,
  UPDATE_EVENT_FILTER_FORM,
  UPDATE_EVENT_TEMPLATE_CATEGORY,
  UPDATE_EVENT_TEMPLATE_ERROR,
  UPDATE_EVENT_TEMPLATE_SUCCESS,
  UPDATE_EVENTS,
  UPDATE_LOWERING_ERROR,
  UPDATE_LOWERING_SUCCESS,
  UPDATE_PROFILE,
  UPDATE_PROFILE_ERROR,
  UPDATE_PROFILE_SUCCESS,
  UPDATE_USER_ERROR,
  UPDATE_USER_SUCCESS
} from './types'

import { ROOT_PATH } from '../client_settings'

const port = window.location.port ? ':' + window.location.port : ''
export const resetURL = window.location.protocol + '//' + window.location.hostname + port + ROOT_PATH + 'resetPassword/'

export const advanceLoweringReplayTo = (id) => {
  return async (dispatch) => {
    const payload = (await get_event_exports({}, id)) || {}
    return dispatch({ type: SET_SELECTED_EVENT, payload })
  }
}

export const authError = (error) => {
  return {
    type: AUTH_ERROR,
    payload: error
  }
}

export const authSuccess = (message) => {
  return {
    type: AUTH_SUCCESS,
    payload: message
  }
}

export const autoLogin = ({ loginToken, reCaptcha = null }) => {
  const payload = reCaptcha !== null ? { loginToken, reCaptcha } : { loginToken }

  return (dispatch) => {
    post_login(payload).then((response) => {
      if (response.success) {
        cookies.set('token', response.data.token)
        cookies.set('id', response.data.id)
        dispatch({ type: AUTH_USER })
        return dispatch(updateProfileState())
      } else {
        if (response.error.response && response.error.response.status !== 401) {
          // If request is unauthenticated
          return dispatch(authError(response.error.response.data.message))
        } else if (response.error.message == 'Network Error') {
          return dispatch(authError('Unable to connect to server'))
        }
        return dispatch(authError(response.error.response.data.message))
      }
    })
  }
}

export const clearEvents = () => {
  return (dispatch) => {
    return dispatch({ type: UPDATE_EVENTS, payload: [] })
  }
}

export const clearSelectedCruise = () => {
  return (dispatch) => {
    return dispatch({ type: LEAVE_CRUISE_FORM, payload: null })
  }
}

export const clearSelectedEvent = () => {
  return (dispatch) => {
    return dispatch({ type: CLEAR_SELECTED_EVENT, payload: null })
  }
}

export const clearSelectedLowering = () => {
  return (dispatch) => {
    return dispatch({ type: LEAVE_LOWERING_FORM, payload: null })
  }
}

export const createCruise = (formProps) => {
  return async (dispatch) => {
    const response = await create_cruise(formProps)
    if (response.success) {
      dispatch(initCruise(response.data.insertedId))
      dispatch(createCruiseSuccess(`${_Cruise_} created`))
      return dispatch(fetchCruises())
    }
    return dispatch(createCruiseError(response.error.response.data.message))
  }
}

export const createCruiseError = (message) => {
  return {
    type: CREATE_CRUISE_ERROR,
    payload: message
  }
}

export const createCruiseSuccess = (message) => {
  return {
    type: CREATE_CRUISE_SUCCESS,
    payload: message
  }
}

export const createEvent = ({ event_value, event_free_text = '', event_options = [], ts = null, publish = true }) => {
  return async () => {
    const fields = { event_value, event_free_text, event_options, ts, publish }
    if (!fields.ts) {
      delete fields.ts
    }

    const response = await createEventRequest(fields)
    if (response.success) {
      return response.data.insertedEvent
    }
  }
}

export const createEventRequest = async (formProps) => {
  let fields = { ...formProps }
  return await create_event(fields)
}

export const createEventTemplate = (formProps) => {
  let fields = { ...formProps }

  return async (dispatch) => {
    const response = await create_event_template(fields)
    if (response.success) {
      dispatch(initEventTemplate(response.data.insertedId))
      dispatch(createEventTemplateSuccess('Event Template created'))
      return dispatch(fetchEventTemplates())
    }
    return dispatch(createEventTemplateError(response.error.response.data.message))
  }
}

export const createEventTemplateError = (message) => {
  return {
    type: CREATE_EVENT_TEMPLATE_ERROR,
    payload: message
  }
}

export const createEventTemplateSuccess = (message) => {
  return {
    type: CREATE_EVENT_TEMPLATE_SUCCESS,
    payload: message
  }
}

export const createLowering = (formProps) => {
  return async (dispatch) => {
    const response = await create_lowering(formProps)
    if (response.success) {
      dispatch(initLowering(response.data.insertedId))
      dispatch(createLoweringSuccess(`${_Lowering_} created`))
      return dispatch(fetchLowerings())
    }
    return dispatch(createLoweringError(response.error.response.data.message))
  }
}

export const createLoweringError = (message) => {
  return {
    type: CREATE_LOWERING_ERROR,
    payload: message
  }
}

export const createLoweringSuccess = (message) => {
  return {
    type: CREATE_LOWERING_SUCCESS,
    payload: message
  }
}

export const createUser = (formProps) => {
  let fields = { ...formProps, resetURL }

  return async (dispatch) => {
    const response = await create_user(fields)
    if (response.success) {
      dispatch(initUser(response.data.insertedId))
      dispatch(createUserSuccess('User created'))
      return dispatch(fetchUsers())
    }
    return dispatch(createUserError(response.error.response.data.message))
  }
}

export const createUserError = (message) => {
  return {
    type: CREATE_USER_ERROR,
    payload: message
  }
}

export const createUserSuccess = (message) => {
  return {
    type: CREATE_USER_SUCCESS,
    payload: message
  }
}

export const deleteAllNonSystemEventTemplates = () => {
  return async (dispatch) => {
    const query = {
      system_template: false
    }

    const event_templates = await get_event_templates(query)
    event_templates.map(async (event_template) => {
      await dispatch(deleteEventTemplate(event_template.id, false))
    })

    return dispatch(fetchEventTemplates())
  }
}

export const deleteAllNonSystemUsers = () => {
  return async (dispatch) => {
    const query = {
      system_user: false
    }

    const users = await get_users(query)
    users.map(async (user) => {
      await dispatch(deleteUser(user.id, false))
    })

    return dispatch(fetchUsers())
  }
}

export const deleteCruise = (id) => {
  return async (dispatch, getState) => {
    const response = await delete_cruise(id)
    if (response.success) {
      if (getState().cruise.cruise.id === id) {
        dispatch(leaveCruiseForm())
      }
      return dispatch(fetchCruises())
    }
  }
}

export const deleteEvent = (event_id) => {
  return async () => {
    return await deleteEventRequest(event_id)
  }
}

export const deleteEventRequest = async (event_id) => {
  return await delete_event(event_id)
}

export const deleteEventTemplate = (id) => {
  return async (dispatch, getState) => {
    const response = await delete_event_template(id)

    if (response.success) {
      if (getState().event_template.event_template.id === id) {
        dispatch(leaveEventTemplateForm())
      }
      return dispatch(fetchEventTemplates())
    }
  }
}

export const deleteLowering = (id) => {
  return async (dispatch, getState) => {
    const response = await delete_lowering(id)
    if (response.success) {
      if (getState().cruise.cruise.id === id) {
        dispatch(leaveLoweringForm())
      }
      return dispatch(fetchLowerings())
    }
  }
}

export const deleteUser = (id) => {
  return async (dispatch, getState) => {
    const response = await delete_user(id)

    if (response.success) {
      if (getState().user.user.id === id) {
        dispatch(leaveUserForm())
      }
      return dispatch(fetchUsers())
    }
  }
}

export const eventUpdate = () => {
  return async (dispatch, getState) => {
    dispatch({ type: EVENT_FETCHING, payload: true })

    const eventFilter = getState().event.eventFilter
    const query = {
      ...eventFilter,
      fulltext: eventFilter.fulltext ? eventFilter.fulltext.split(',') : null,
      author: eventFilter.author ? eventFilter.author.split(',') : null,
      datasource: eventFilter.datasource ? eventFilter.datasource.split(',') : null
    }

    const payload = await get_events(query)

    dispatch({ type: UPDATE_EVENTS, payload })
    return dispatch({ type: EVENT_FETCHING, payload: false })
  }
}

export const eventUpdateLoweringReplay = () => {
  return async (dispatch, getState) => {
    dispatch({ type: EVENT_FETCHING, payload: true })

    const eventFilter = getState().event.eventFilter
    const fulltext = eventFilter.fulltext ? eventFilter.fulltext : getState().event.hideASNAP ? '!ASNAP' : null
    const query = {
      ...eventFilter,
      fulltext: fulltext ? fulltext.split(',') : null,
      author: eventFilter.author ? eventFilter.author.split(',') : null,
      datasource: eventFilter.datasource ? eventFilter.datasource.split(',') : null
    }

    const payload = await get_events_by_lowering(query, getState().lowering.lowering.id)
    dispatch({ type: UPDATE_EVENTS, payload })

    const selected_event = payload.length ? await get_event_exports({}, payload[0].id) : {}
    dispatch({ type: SET_SELECTED_EVENT, payload: selected_event })
    return dispatch({ type: EVENT_FETCHING, payload: false })
  }
}

export const fetchCruises = () => {
  return async (dispatch) => {
    const payload = await get_cruises()
    return dispatch({ type: FETCH_CRUISES, payload })
  }
}

export const fetchEvents = () => {
  return async (dispatch) => {
    const payload = await get_events()
    return dispatch({ type: FETCH_EVENTS, payload })
  }
}

export const fetchEventTemplates = (sort='event_name') => {
  const query = { sort }

  return async (dispatch) => {
    const payload = await get_event_templates(query)
    return dispatch({ type: FETCH_EVENT_TEMPLATES, payload })
  }
}

export const fetchFilteredEvents = (filterParams = {}) => {
  const query = {
    ...filterParams,
    fulltext: filterParams.fulltext ? filterParams.fulltext.split(',') : null,
    author: filterParams.author ? filterParams.author.split(',') : null,
    datasource: filterParams.datasource ? filterParams.datasource.split(',') : null
  }

  return async (dispatch) => {
    const payload = await get_events(query)
    return dispatch({ type: FETCH_FILTERED_EVENTS, payload })
  }
}

export const fetchLowerings = () => {
  return async (dispatch) => {
    const payload = await get_lowerings()
    return dispatch({ type: FETCH_LOWERINGS, payload })
  }
}

export const fetchSelectedEvent = (id) => {
  return async (dispatch) => {
    const payload = (await get_event_exports({}, id)) || {}
    return dispatch({ type: SET_SELECTED_EVENT, payload })
  }
}

export const fetchUsers = () => {
  return async (dispatch) => {
    const payload = await get_users()
    return dispatch({ type: FETCH_USERS, payload })
  }
}

export const forgotPassword = ({ email, reCaptcha = null }) => {
  const payload = reCaptcha ? { email, resetURL, reCaptcha } : { email, resetURL }

  return async (dispatch) => {
    const response = await forgot_password(payload)
    if (response.success) {
      return dispatch(authSuccess(response.data.message))
    }
    return dispatch(authError(response.error.response.data.message))
  }
}

export const gotoCruiseMenu = () => {
  return (dispatch) => {
    return dispatch(push(`/cruise_menu`))
  }
}

export const gotoCruises = () => {
  return (dispatch) => {
    return dispatch(push(`/cruises`))
  }
}

export const gotoEventManagement = () => {
  return (dispatch) => {
    return dispatch(push(`/event_management`))
  }
}

export const gotoEventTemplates = () => {
  return (dispatch) => {
    return dispatch(push(`/event_templates`))
  }
}

export const gotoHome = () => {
  return (dispatch) => {
    return dispatch(push(`/`))
  }
}

export const gotoLoweringGallery = (id) => {
  return (dispatch) => {
    return dispatch(push(`/lowering_gallery/${id}`))
  }
}

export const gotoLoweringMap = (id) => {
  return (dispatch) => {
    return dispatch(push(`/lowering_map/${id}`))
  }
}

export const gotoLoweringReplay = (id) => {
  return (dispatch) => {
    return dispatch(push(`/lowering_replay/${id}`))
  }
}

export const gotoLowerings = () => {
  return (dispatch) => {
    return dispatch(push(`/lowerings`))
  }
}

export const gotoProfile = () => {
  return (dispatch) => {
    return dispatch(push(`/profile`))
  }
}

export const gotoTasks = () => {
  return (dispatch) => {
    return dispatch(push(`/tasks`))
  }
}

export const gotoUsers = () => {
  return (dispatch) => {
    return dispatch(push(`/users`))
  }
}

export const hideCruise = (id) => {
  let fields = { cruise_hidden: true }

  return async (dispatch) => {
    const response = await update_cruise(fields, id)
    if (response.success) {
      return dispatch(fetchCruises())
    }
    return dispatch(updateCruiseError(response.error.response.data.message))
  }
}

export const hideLowering = (id) => {
  let fields = { lowering_hidden: true }

  return async (dispatch) => {
    const response = await update_lowering(fields, id)
    if (response.success) {
      return dispatch(fetchLowerings())
    }
    return dispatch(updateLoweringError(response.error.response.data.message))
  }
}

export const initCruise = (id) => {
  return async (dispatch) => {
    const payload = (await get_cruises({}, id)) || {}
    return dispatch({ type: INIT_CRUISE, payload })
  }
}

export const initEventTemplate = (id) => {
  return async (dispatch) => {
    const payload = await get_event_templates({}, id)
    return dispatch({ type: INIT_EVENT_TEMPLATE, payload })
  }
}

export const initLowering = (id) => {
  return async (dispatch) => {
    const payload = (await get_lowerings({}, id)) || {}
    return dispatch({ type: INIT_LOWERING, payload })
  }
}

export const initLoweringReplay = (id) => {
  return async (dispatch, getState) => {
    dispatch({ type: EVENT_FETCHING, payload: true })
    dispatch(initLowering(id))

    const eventFilter_fulltext = getState().event.eventFilter.fulltext
      ? getState().event.eventFilter.fulltext
      : getState().event.hideASNAP
        ? '!ASNAP'
        : null

    const query = {
      ...getState().event.eventFilter,
      fulltext: eventFilter_fulltext ? eventFilter_fulltext.split(',') : null
    }

    const payload = await get_events_by_lowering(query, id)
    dispatch({ type: INIT_EVENT, payload })

    if (payload.length) {
      dispatch(advanceLoweringReplayTo(payload[0].id))
    }

    return dispatch({ type: EVENT_FETCHING, payload: false })
  }
}

export const initUser = (id) => {
  return async (dispatch) => {
    const payload = await get_users({}, id)
    return dispatch({ type: INIT_USER, payload })
  }
}

export const leaveCruiseForm = () => {
  return (dispatch) => {
    return dispatch({ type: LEAVE_CRUISE_FORM, payload: null })
  }
}

export const leaveEventFilterForm = () => {
  return (dispatch) => {
    return dispatch({ type: LEAVE_EVENT_FILTER_FORM, payload: null })
  }
}

export const leaveEventTemplateForm = () => {
  return (dispatch) => {
    return dispatch({ type: LEAVE_EVENT_TEMPLATE_FORM, payload: null })
  }
}

export const leaveLoginForm = () => {
  return (dispatch) => {
    return dispatch({ type: LEAVE_AUTH_LOGIN_FORM, payload: null })
  }
}

export const leaveLoweringForm = () => {
  return (dispatch) => {
    return dispatch({ type: LEAVE_LOWERING_FORM, payload: null })
  }
}

export const leaveRegisterForm = () => {
  return (dispatch) => {
    return dispatch({ type: LEAVE_REGISTER_USER_FORM, payload: null })
  }
}

export const leaveUpdateProfileForm = () => {
  return (dispatch) => {
    return dispatch({ type: LEAVE_UPDATE_PROFILE_FORM, payload: null })
  }
}

export const leaveUserForm = () => {
  return (dispatch) => {
    return dispatch({ type: LEAVE_USER_FORM, payload: null })
  }
}

export const login = ({ username, password, reCaptcha = null }) => {
  const payload = reCaptcha !== null ? { username, password, reCaptcha } : { username, password }

  return async (dispatch) => {
    post_login(payload).then((response) => {
      if (response.success) {
        cookies.set('token', response.data.token)
        cookies.set('id', response.data.id)
        dispatch(updateProfileState())
        return dispatch({ type: AUTH_USER })
      }

      if (response.error.response && response.error.response.status !== 401) {
        return dispatch(authError(response.error.response.data.message))
      } else if (response.error.message == 'Network Error') {
        return dispatch(authError('Unable to connect to server'))
      }

      return dispatch(authError(response.error.response.data.message))
    })
  }
}

export const logout = () => {
  return (dispatch) => {
    cookies.remove('token')
    cookies.remove('id')
    dispatch(push(`/login`))
    return dispatch({ type: UNAUTH_USER })
  }
}

export const registerUser = ({ username, fullname, password, email, reCaptcha = null }) => {
  const fields = reCaptcha !== null ? { username, fullname, password, email, reCaptcha } : { username, fullname, password, email }

  return async (dispatch) => {
    const response = await register_user(fields)
    if (response.success) {
      return dispatch(registerUserSuccess('User created'))
    }
    return dispatch(registerUserError(response.error.response.data.message))
  }
}

export const registerUserError = (message) => {
  return {
    type: REGISTER_USER_ERROR,
    payload: message
  }
}

export const registerUserSuccess = (message) => {
  return {
    type: REGISTER_USER_SUCCESS,
    payload: message
  }
}

export const resetFields = (formName, fieldsObj) => {
  return (dispatch) => {
    Object.keys(fieldsObj).forEach((fieldKey) => {
      //reset the field's value
      dispatch(change(formName, fieldKey, fieldsObj[fieldKey]))

      //reset the field's error
      return dispatch(untouch(formName, fieldKey))
    })
  }
}

export const resetPassword = ({ token, password, reCaptcha = null }) => {
  const payload = reCaptcha ? { token, password, reCaptcha } : { token, password }

  return (dispatch) => {
    reset_password(payload).then((response) => {
      if (response.success) {
        return dispatch(authSuccess('Password Reset'))
      }
      return dispatch(authError(response.error.response.data.message))
    })
  }
}

export const showCruise = (id) => {
  let fields = { cruise_hidden: false }

  return async (dispatch) => {
    const response = await update_cruise(fields, id)
    if (response.success) {
      return dispatch(fetchCruises())
    }
    return dispatch(updateCruiseError(response.error.response.data.message))
  }
}

export const showLowering = (id) => {
  let fields = { lowering_hidden: false }

  return async (dispatch) => {
    const response = await update_lowering(fields, id)
    if (response.success) {
      return dispatch(fetchLowerings())
    }
    return dispatch(updateLoweringError(response.error.response.data.message))
  }
}

export const showModal = (modal, props) => {
  return (dispatch) => {
    return dispatch(show(modal, props))
  }
}

export const switch2Guest = (reCaptcha = null) => {
  return (dispatch) => {
    return dispatch(login({ username: 'guest', password: '', reCaptcha }))
  }
}

export const toggleASNAP = () => {
  return (dispatch, getState) => {
    return dispatch({ type: TOGGLE_ASNAP, payload: !getState().event.hideASNAP })
  }
}

export const updateCruise = (formProps) => {
  let fields = { ...formProps }
  delete fields.id
  delete fields.cruise_access_list

  return async (dispatch) => {
    const response = await update_cruise(fields, formProps.id)
    if (response.success) {
      dispatch(fetchCruises())
      return dispatch(updateCruiseSuccess(`${_Cruise_} updated`))
    } else {
      return dispatch(updateCruiseError(response.error.response.data.message))
    }
  }
}

export const updateCruiseError = (message) => {
  return {
    type: UPDATE_CRUISE_ERROR,
    payload: message
  }
}

export const updateCruiseReplayEvent = (id) => {
  return async (dispatch) => {
    const payload = await get_events({}, id)
    return dispatch({ type: UPDATE_EVENT, payload })
  }
}

export const updateCruiseSuccess = (message) => {
  return {
    type: UPDATE_CRUISE_SUCCESS,
    payload: message
  }
}

export const updateEvent = (formProps) => {
  return async (dispatch) => {
    const response = await updateEventRequest(formProps)
    if (response.success) {
      return dispatch({ type: UPDATE_EVENT, payload: formProps })
    }
  }
}

export const updateEventFilterForm = (formProps) => {
  return (dispatch) => {
    return dispatch({ type: UPDATE_EVENT_FILTER_FORM, payload: formProps })
  }
}

export const updateEventRequest = async (formProps) => {
  let fields = { ...formProps }
  delete fields.id
  return await update_event(fields, formProps.id)
}

export const updateEventTemplate = (formProps) => {
  let fields = { ...formProps }
  delete fields.id

  return async (dispatch) => {
    const response = await update_event_template(fields, formProps.id)
    if (response.success) {
      dispatch(fetchEventTemplates())
      return dispatch(updateEventTemplateSuccess('Event template updated'))
    }
    return dispatch(updateEventTemplateError(response.error.response.data.message))
  }
}

export const updateEventTemplateCategory = (category) => {
  return { type: UPDATE_EVENT_TEMPLATE_CATEGORY, payload: category }
}

export const updateEventTemplateError = (message) => {
  return {
    type: UPDATE_EVENT_TEMPLATE_ERROR,
    payload: message
  }
}

export const updateEventTemplateSuccess = (message) => {
  return {
    type: UPDATE_EVENT_TEMPLATE_SUCCESS,
    payload: message
  }
}

export const updateLowering = (formProps) => {
  let fields = { ...formProps }
  delete fields.id
  delete fields.lowering_access_list

  return async (dispatch) => {
    const response = await update_lowering(fields, formProps.id)
    if (response.success) {
      dispatch(fetchLowerings())
      return dispatch(updateLoweringSuccess(`${_Lowering_} updated`))
    } else {
      return dispatch(updateLoweringError(response.error.response.data.message))
    }
  }
}

export const updateLoweringError = (message) => {
  return {
    type: UPDATE_LOWERING_ERROR,
    payload: message
  }
}

export const updateLoweringReplayEvent = (id) => {
  return async (dispatch) => {
    const payload = await get_events({}, id)
    return dispatch({ type: UPDATE_EVENT, payload })
  }
}

export const updateLoweringSuccess = (message) => {
  return {
    type: UPDATE_LOWERING_SUCCESS,
    payload: message
  }
}

export const updateProfile = (formProps) => {
  let fields = {}

  if (formProps.username) {
    fields.username = formProps.username
  }

  if (formProps.fullname) {
    fields.fullname = formProps.fullname
  }

  if (formProps.password) {
    fields.password = formProps.password
  }

  return async (dispatch) => {
    const response = await update_user(fields, formProps.id)
    if (response.success) {
      dispatch(updateProfileState())
      return dispatch(updateProfileSuccess('User updated'))
    } else {
      return dispatch(updateProfileError(response.error.response.data.message))
    }
  }
}

export const updateProfileError = (message) => {
  return {
    type: UPDATE_PROFILE_ERROR,
    payload: message
  }
}

export const updateProfileState = () => {
  return (dispatch) => {
    get_profile().then((response) => {
      if (response.success) {
        return dispatch({ type: UPDATE_PROFILE, payload: response.data })
      }
    })
  }
}

export const updateProfileSuccess = (message) => {
  return {
    type: UPDATE_PROFILE_SUCCESS,
    payload: message
  }
}

export const updateUser = (formProps) => {
  let fields = { ...formProps }
  delete fields.id

  return async (dispatch) => {
    const response = await update_user(fields, formProps.id)
    if (response.success) {
      dispatch(fetchUsers())
      return dispatch(updateUserSuccess('User updated'))
    }
    return dispatch(updateUserError(response.error.response.data.message))
  }
}

export const updateUserError = (message) => {
  return {
    type: UPDATE_USER_ERROR,
    payload: message
  }
}

export const updateUserSuccess = (message) => {
  return {
    type: UPDATE_USER_SUCCESS,
    payload: message
  }
}

export const validateJWT = () => {
  const token = cookies.get('token')

  if (!token) {
    return (dispatch) => {
      dispatch({ type: UNAUTH_USER })
    }
  }

  return async (dispatch) => {
    validate_jwt().then((response) => {
      if (response.success) {
        return dispatch({ type: AUTH_USER })
      } else {
        return dispatch(logout())
      }
    })
  }
}
