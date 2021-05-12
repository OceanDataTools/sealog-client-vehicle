import axios from 'axios';
import Cookies from 'universal-cookie';
import queryString from 'querystring';
import { push } from 'connected-react-router';
import { show } from 'redux-modal';
import { change, untouch } from 'redux-form';
import { API_ROOT_URL } from '../client_config';

import {
  AUTH_USER,
  UNAUTH_USER,
  AUTH_ERROR,
  AUTH_SUCCESS,
  CREATE_USER_SUCCESS,
  CREATE_USER_ERROR,
  LEAVE_CREATE_USER_FORM,
  REGISTER_USER_SUCCESS,
  REGISTER_USER_ERROR,
  LEAVE_REGISTER_USER_FORM,
  INIT_USER,
  UPDATE_USER_SUCCESS,
  UPDATE_USER_ERROR,
  LEAVE_UPDATE_USER_FORM,
  FETCH_USERS,
  FETCH_EVENT_TEMPLATES_FOR_MAIN,
  FETCH_EVENTS,
  SET_SELECTED_EVENT,
  CLEAR_SELECTED_EVENT,
  FETCH_FILTERED_EVENTS,
  LEAVE_AUTH_LOGIN_FORM,
  FETCH_EVENT_HISTORY,
  UPDATE_EVENT_HISTORY,
  UPDATE_PROFILE,
  UPDATE_PROFILE_SUCCESS,
  UPDATE_PROFILE_ERROR,
  LEAVE_UPDATE_PROFILE_FORM,
  INIT_EVENT_TEMPLATE,
  FETCH_EVENT_TEMPLATES,
  UPDATE_EVENT_TEMPLATE_CATEGORY,
  UPDATE_EVENT_TEMPLATE_SUCCESS,
  UPDATE_EVENT_TEMPLATE_ERROR,
  LEAVE_UPDATE_EVENT_TEMPLATE_FORM,
  CREATE_EVENT_TEMPLATE_SUCCESS,
  CREATE_EVENT_TEMPLATE_ERROR,
  LEAVE_CREATE_EVENT_TEMPLATE_FORM,
  INIT_EVENT,
  EVENT_FETCHING,
  UPDATE_EVENT_FILTER_FORM,
  LEAVE_EVENT_FILTER_FORM,
  HIDE_ASNAP,
  SHOW_ASNAP,
  UPDATE_EVENT,
  UPDATE_EVENTS,
  FETCH_CUSTOM_VARS,
  INIT_CRUISE,
  UPDATE_CRUISE_SUCCESS,
  UPDATE_CRUISE_ERROR,
  LEAVE_UPDATE_CRUISE_FORM,
  CREATE_CRUISE_SUCCESS,
  CREATE_CRUISE_ERROR,
  LEAVE_CREATE_CRUISE_FORM,
  FETCH_CRUISES,
  INIT_LOWERING,
  UPDATE_LOWERING_SUCCESS,
  UPDATE_LOWERING_ERROR,
  LEAVE_UPDATE_LOWERING_FORM,
  CREATE_LOWERING_SUCCESS,
  CREATE_LOWERING_ERROR,
  LEAVE_CREATE_LOWERING_FORM,
  FETCH_LOWERINGS

} from './types';

const cookies = new Cookies();

export const authorizationHeader = { 
  headers: {
    authorization: cookies.get('token')
  }
}

export function validateJWT() {

  const token = cookies.get('token');

  if(!token) {
    return function (dispatch) {
      // console.log("JWT is missing, logging out");
      dispatch({type: UNAUTH_USER});
    };
  }

  return async function (dispatch) {
    return await axios.get(`${API_ROOT_URL}/api/v1/auth/validate`, { headers: { authorization: cookies.get('token') } }
      ).then(() => {
        return dispatch({type: AUTH_USER});
      }).catch(()=>{
        console.error("JWT is invalid, logging out");
        return dispatch(logout());
      });
  };
}

export function resetFields(formName, fieldsObj) {
  return function (dispatch) {
    Object.keys(fieldsObj).forEach(fieldKey => {
      //reset the field's value
      dispatch(change(formName, fieldKey, fieldsObj[fieldKey]));

      //reset the field's error
      return dispatch(untouch(formName, fieldKey));
    });
  };
}

export function updateProfileState() {

  return async function (dispatch) {
    return await axios.get(`${API_ROOT_URL}/api/v1/auth/profile`, { headers: { authorization: cookies.get('token') } }
      ).then((response) => {
        return dispatch({ type: UPDATE_PROFILE, payload: response.data });
      }).catch((error)=>{
        console.error(error);
      });
  };
}

export function initUser(id) {
  return async function (dispatch) {
    return await axios.get(`${API_ROOT_URL}/api/v1/users/${id}`, { headers: { authorization: cookies.get('token') } }
      ).then((response) => {
        return dispatch({ type: INIT_USER, payload: response.data });
      }).catch((error)=>{
        console.error(error);
      });
  };
}

export function initEventTemplate(id) {
  return async function (dispatch) {
    return await axios.get(`${API_ROOT_URL}/api/v1/event_templates/${id}`, { headers: { authorization: cookies.get('token') } }
      ).then((response) => {

        response.data.event_options = response.data.event_options.map(event_option => {
          event_option.event_option_values = event_option.event_option_values.join(',');
          return event_option;
        });

        return dispatch({ type: INIT_EVENT_TEMPLATE, payload: response.data });
      }).catch((error)=>{
        console.error(error);
      });
  };
}

export function login({username, password, reCaptcha = null}) {

  const payload = (reCaptcha !== null)? {username, password, reCaptcha} : {username, password};

  return async function (dispatch) {
    return await axios.post(`${API_ROOT_URL}/api/v1/auth/login`, payload
      ).then(response => {
        // If request is good save the JWT token to a cookie
        cookies.set('token', response.data.token, { path: '/' });
        cookies.set('id', response.data.id, { path: '/' });

        dispatch({ type: AUTH_USER });
        return dispatch(updateProfileState());
      }).catch((error)=>{

        if(error.response && error.response.status !== 401) {
          // If request is unauthenticated
          return dispatch(authError(error.response.data.message));
        }
        else if(error.message == "Network Error") {
          return dispatch(authError("Unable to connect to server"));
        }

        return dispatch(authError(error.response.data.message));

      });
  };
}

export function autoLogin({loginToken, reCaptcha = null}) {

  const payload = (reCaptcha !== null)? {loginToken, reCaptcha} : {loginToken};

  return async function (dispatch) {
    return await axios.post(`${API_ROOT_URL}/api/v1/auth/login`, payload
      ).then(response => {
        // If request is good save the JWT token to a cookie
        cookies.set('token', response.data.token, { path: '/' });
        cookies.set('id', response.data.id, { path: '/' });

        dispatch({ type: AUTH_USER });
        return dispatch(updateProfileState());
      }).catch((error)=>{

        if(error.response && error.response.status !== 401) {
          // If request is unauthenticated
          return dispatch(authError(error.response.data.message));
        }
        else if(error.message == "Network Error") {
          return dispatch(authError("Unable to connect to server"));
        }

        return dispatch(authError(error.response.data.message));

      });
  };
}

export function gotoHome() {

  return function (dispatch) {
    return dispatch(push(`/`));
  };
}

export function gotoCruiseMenu() {

  return function (dispatch) {
    return dispatch(push(`/cruise_menu`));
  };
}

export function gotoCruises() {

  return function (dispatch) {
    return dispatch(push(`/cruises`));
  };
}

export function gotoEventManagement() {

  return function (dispatch) {
    return dispatch(push(`/event_management`));
  };
}

export function gotoEventTemplates() {

  return function (dispatch) {
    return dispatch(push(`/event_templates`));
  };
}

export function gotoLowerings() {

  return function (dispatch) {
    return dispatch(push(`/lowerings`));
  };
}

export function gotoProfile() {

  return function (dispatch) {
    return dispatch(push(`/profile`));
  };
}

export function gotoTasks() {

  return function (dispatch) {
    return dispatch(push(`/tasks`));
  };
}

export function gotoUsers() {

  return function (dispatch) {
    return dispatch(push(`/users`));
  };
}

export function gotoLoweringGallery(id) {

  return function (dispatch) {
    dispatch(initLowering(id));
    return dispatch(push(`/lowering_gallery/${id}`));
  };
}

export function gotoLoweringMap(id) {

  return function (dispatch) {
    dispatch(initLowering(id));
    return dispatch(push(`/lowering_map/${id}`));
  };
}

export function gotoLoweringReplay(id) {

  return function (dispatch) {
    dispatch(initLowering(id));
    return dispatch(push(`/lowering_replay/${id}`));
  };
}

export function gotoLoweringReview(id) {

  return function (dispatch) {
    dispatch(initLowering(id));
    return dispatch(push(`/lowering_review/${id}`));
  };
}

export async function createEventRequest(eventValue, eventFreeText, eventOptions, eventTS) {

  let payload = {
    event_value: eventValue,
    event_free_text: eventFreeText,
    event_options: eventOptions
  };

  if(eventTS.length > 0){
    payload.ts = eventTS;
  }

  const response = await axios.post(`${API_ROOT_URL}/api/v1/events`, payload, { headers: { authorization: cookies.get('token') } }
    )
    .then((response) => {
      return response.data.insertedEvent;
    })
    .catch((error)=>{
      console.error(error);
    });

  return response;
}

export function createEvent(eventValue, eventFreeText = '', eventOptions = [], eventTS = '') {

  return async () => {
    try {
      const event = await createEventRequest(eventValue, eventFreeText, eventOptions, eventTS);
      return event;
    } catch (error) {
      console.error(error);
    }
  };
}

export async function updateEventRequest(event_id, eventValue, eventFreeText = '', eventOptions = [], eventTS = '') {

  let payload = {
    event_value: eventValue,
    event_free_text: eventFreeText,
    event_options: eventOptions
  };

  if(eventTS.length > 0){
    payload.ts = eventTS;
  }

  const response = await axios.patch(`${API_ROOT_URL}/api/v1/events/${event_id}`, payload, { headers: { authorization: cookies.get('token') } }
    )
    .then((response) => {
      return { response };
    })
    .catch((error)=>{
      console.error(error);
    });
  
  return response;
}

export function updateEvent(event_id, eventValue, eventFreeText = '', eventOptions = [], eventTS = '') {

  return async () => {
    try {
      const event = await updateEventRequest(event_id, eventValue, eventFreeText, eventOptions, eventTS);
      return event;
    } catch (error) {
      console.error(error);
    }
  };
}

export function updateLoweringReplayEvent(event_id) {

  return async function (dispatch) {
    
    return await axios.get(API_ROOT_URL + '/api/v1/events/' + event_id, { headers: { authorization: cookies.get('token') } }
    ).then(({data}) => {
      return dispatch({type: UPDATE_EVENT, payload: data});
    }).catch((error) => {
      if(error.response.status !== 404) {
        console.error(error);
      }
    });
  };
}

export async function deleteEventRequest(event_id) {

  const response = await axios.delete(`${API_ROOT_URL}/api/v1/events/${event_id}`, { headers: { authorization: cookies.get('token') } }
    )
    .then((response) => {
      return { response };
    })
    .catch((error)=>{
      console.error(error);
    });

  return response;
}

export function deleteEvent(event_id) {

  return async () => {
    try {
      const response = await deleteEventRequest(event_id);
      return response;
    } catch (error) {
      console.error(error);
    }
  };
}

export function forgotPassword({email, reCaptcha = null}) {

  const payload = (reCaptcha)? {email, reCaptcha}: {email};

  return async function (dispatch) {
    return await axios.post(`${API_ROOT_URL}/api/v1/auth/forgotPassword`, payload
      ).then(response => {
        return dispatch(authSuccess(response.data.message));
      }).catch((error)=>{
        console.error(error);

        // If request is invalid
       return dispatch(authError(error.response.data.message));

      });
  };
}

export function resetPassword({token, password, reCaptcha = null}) {
  
  const payload = (reCaptcha)? {token, password, reCaptcha}: {token, password};
  
  return async function (dispatch) {
    return await axios.patch(`${API_ROOT_URL}/api/v1/auth/resetPassword`, payload
      ).then(() => {
        return dispatch(authSuccess('Password Reset'));
      }).catch((error) => {

        console.error(error);

        // If request is unauthenticated
        return dispatch(authError(error.response.data.message));

      });
  };
}

export function registerUser({username, fullname, password, email, reCaptcha = null}) {

  const payload = (reCaptcha !== null)? {username, fullname, password, email, reCaptcha} : {username, fullname, password, email};

  return async function (dispatch) {
    return await axios.post(`${API_ROOT_URL}/api/v1/auth/register`, payload
      ).then(() => {
        return dispatch(registerUserSuccess('User created'));
      }).catch((error) => {

        console.error(error);

        // If request is unauthenticated
        return dispatch(registerUserError(error.response.data.message));

      });
  };
}

export function createUser({username, fullname, password = '', email, roles, system_user = false, disabled = false}) {
  return async function (dispatch) {
    return await axios.post(`${API_ROOT_URL}/api/v1/users`, {username, fullname, password, email, roles, system_user, disabled}, { headers: { authorization: cookies.get('token') } }
      ).then(() => {
        dispatch(createUserSuccess('Account created'));
        return dispatch(fetchUsers());
      }).catch((error) => {
      // If request is unauthenticated
        console.error(error);
        return dispatch(createUserError(error.response.data.message));
      });
  };
}

export function createCruise({cruise_id, start_ts, stop_ts, cruise_location = '', cruise_tags = [], cruise_hidden = false, cruise_additional_meta = {} }) {
  return async function (dispatch) {
    return await axios.post(`${API_ROOT_URL}/api/v1/cruises`, {cruise_id, start_ts, stop_ts, cruise_location, cruise_tags, cruise_hidden, cruise_additional_meta }, { headers: { authorization: cookies.get('token') } }
      ).then(() => {
        dispatch(createCruiseSuccess('Cruise created'));
        return dispatch(fetchCruises());
      }).catch((error) => {

      // If request is unauthenticated
      console.error(error);
      return dispatch(createCruiseError(error.response.data.message));
    });
  };
}

export function createLowering({lowering_id, start_ts, stop_ts, lowering_location = '', lowering_tags = [], lowering_hidden = false, lowering_additional_meta = {}  }) {
  return async function (dispatch) {
    return await axios.post(`${API_ROOT_URL}/api/v1/lowerings`, {lowering_id, start_ts, stop_ts, lowering_location, lowering_tags, lowering_hidden, lowering_additional_meta }, { headers: { authorization: cookies.get('token') } }
      ).then(() => {
        dispatch(createLoweringSuccess('Lowering created'));
        return dispatch(fetchLowerings());
      }).catch((error) => {
      
      // If request is unauthenticated
      console.error(error);
      return dispatch(createLoweringError(error.response.data.message));
    });
  };
}

export function createEventTemplate(formProps) {

  let fields = {};

  fields.event_name = formProps.event_name;
  fields.event_value = formProps.event_value;
  fields.system_template = formProps.system_template;
  fields.disabled = formProps.disabled;
  fields.template_categories = formProps.template_categories;

  if(!formProps.event_free_text_required) {
    fields.event_free_text_required = false;
  } else {
    fields.event_free_text_required = formProps.event_free_text_required;
  }

  if(!formProps.event_options) {
    fields.event_options = [];
  } else {
    fields.event_options = formProps.event_options;
    fields.event_options = fields.event_options.map(event_option => {

      if(!event_option.event_option_allow_freeform) {
        event_option.event_option_allow_freeform = false;
      }

      if(!event_option.event_option_required) {
        event_option.event_option_required = false;
      }

      if(event_option.event_option_type === 'dropdown') {
        event_option.event_option_values = event_option.event_option_values.split(',');
        event_option.event_option_values = event_option.event_option_values.map(string => {
          return string.trim();
        });
      } else if(event_option.event_option_type === 'checkboxes' || event_option.event_option_type === 'radio buttons') {
        event_option.event_option_values = event_option.event_option_values.split(',');
        event_option.event_option_values = event_option.event_option_values.map(string => {
          return string.trim();
        });
      } else if (event_option.event_option_type === 'text' || event_option.event_option_type === 'static text') {
        event_option.event_option_values = [];
      }

      return event_option;
    });
  }

  return async function (dispatch) {
    return await axios.post(`${API_ROOT_URL}/api/v1/event_templates`, fields, { headers: { authorization: cookies.get('token') } }
      ).then(() => {
        dispatch(fetchEventTemplates());
        return dispatch(createEventTemplateSuccess('Event Template created'));
      }).catch((error) => {
        console.error(error);

        // If request is unauthenticated
        return dispatch(createEventTemplateError(error.response.data.message));
      });
  };
}

export function updateProfile(formProps) {

  let fields = {};

  if(formProps.username) {
    fields.username = formProps.username;
  }

  if(formProps.fullname) {
    fields.fullname = formProps.fullname;
  }

  if(formProps.email) {
    fields.email = formProps.email;
  }

  if(formProps.password) {
    fields.password = formProps.password;
  }

  return async function (dispatch) {
    return await axios.patch(`${API_ROOT_URL}/api/v1/users/${formProps.id}`, fields, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      dispatch(updateProfileState());
      return dispatch(updateProfileSuccess('Account updated'));
    }).catch((error) => {
      console.error(error);

      // If request is unauthenticated
      return dispatch(updateProfileError(error.response.data.message));
    });
  };
}

export function showCruise(id) {

  let fields = { cruise_hidden: false };

  return async function (dispatch) {
    return await axios.patch(`${API_ROOT_URL}/api/v1/cruises/${id}`, fields, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      return dispatch(fetchCruises());
    }).catch((error) => {
      console.error(error);
      return dispatch(updateCruiseError(error.response.data.message));
    });
  };
}

export function hideCruise(id) {

  let fields = { cruise_hidden: true };

  return async function (dispatch) {
    return await axios.patch(`${API_ROOT_URL}/api/v1/cruises/${id}`, fields, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      return dispatch(fetchCruises());
    }).catch((error) => {
      console.error(error);
      return dispatch(updateCruiseError(error.response.data.message));
    });
  };
}

export function updateCruise(formProps) {

  let fields = {};

  if(formProps.cruise_id) {
    fields.cruise_id = formProps.cruise_id;
  }

  if(formProps.cruise_location) {
    fields.cruise_location = formProps.cruise_location;
  } else {
    fields.cruise_location = '';
  }

  if(formProps.cruise_tags) {
    fields.cruise_tags = formProps.cruise_tags;
  } else {
    fields.cruise_tags = [];
  }

  if(formProps.start_ts) {
    fields.start_ts = formProps.start_ts;
  }

  if(formProps.stop_ts) {
    fields.stop_ts = formProps.stop_ts;
  }

  if(typeof(formProps.cruise_hidden) !== "undefined") {
    fields.cruise_hidden = formProps.cruise_hidden;
  }

  if(formProps.cruise_additional_meta) {

    // FIX THIS
    // if (formProps.cruise_additional_meta.cruise_files) {
    //   delete formProps.cruise_additional_meta.cruise_files
    // }

    fields.cruise_additional_meta = formProps.cruise_additional_meta;
  }

  return async function (dispatch) {
    await axios.patch(`${API_ROOT_URL}/api/v1/cruises/${formProps.id}`, fields, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      dispatch(fetchCruises());
      return dispatch(updateCruiseSuccess('Cruise updated'));
    }).catch((error) => {
      console.error(error);
      return dispatch(updateCruiseError(error.response.data.message));
    });
  };
}

export function hideLowering(id) {

  let fields = { lowering_hidden: true };

  return async function (dispatch) {
    await axios.patch(`${API_ROOT_URL}/api/v1/lowerings/${id}`, fields, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      return dispatch(fetchLowerings());
    }).catch((error) => {
      console.error(error);
      return dispatch(updateLoweringError(error.response.data.message));
    });
  };
}

export function showLowering(id) {

  let fields = { lowering_hidden: false };

  return async function (dispatch) {
    await axios.patch(`${API_ROOT_URL}/api/v1/lowerings/${id}`, fields, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      return dispatch(fetchLowerings());
    }).catch((error) => {
      console.error(error);
      return dispatch(updateLoweringError(error.response.data.message));
    });
  };
}

export function updateLowering(formProps) {

  let fields = {};

  if(formProps.lowering_id) {
    fields.lowering_id = formProps.lowering_id;
  }

  if(formProps.lowering_location) {
    fields.lowering_location = formProps.lowering_location;
  } else {
    fields.lowering_location = '';
  }

  if(formProps.lowering_tags) {
    fields.lowering_tags = formProps.lowering_tags;
  } else {
    fields.lowering_tags = [];
  }

  if(formProps.start_ts) {
    fields.start_ts = formProps.start_ts;
  }

  if(formProps.stop_ts) {
    fields.stop_ts = formProps.stop_ts;
  }

  if(typeof(formProps.lowering_hidden) !== "undefined") {
    fields.lowering_hidden = formProps.lowering_hidden;
  }

  if(formProps.lowering_additional_meta) {

    // if (formProps.lowering_additional_meta.lowering_files) {
    //   delete formProps.lowering_additional_meta.lowering_files
    // }

    fields.lowering_additional_meta = formProps.lowering_additional_meta;
  }

  return async function (dispatch) {
    return await axios.patch(`${API_ROOT_URL}/api/v1/lowerings/${formProps.id}`, fields, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      dispatch(fetchLowerings());
      return dispatch(updateLoweringSuccess('Lowering updated'));
    }).catch((error) => {
      console.error(error);
      return dispatch(updateLoweringError(error.response.data.message));
    });
  };
}

export function updateUser(formProps) {

  let fields = {};

  if(formProps.username) {
    fields.username = formProps.username;
  }

  if(formProps.fullname) {
    fields.fullname = formProps.fullname;
  }

  // if(formProps.email) {
  //   fields.email = formProps.email;
  // }

  if(formProps.password) {
    fields.password = formProps.password;
  }

  if(formProps.roles) {
    fields.roles = formProps.roles;
  }

  if(typeof formProps.disabled !== 'undefined') {
    fields.disabled = formProps.disabled;
  } else {
    fields.disabled = false;
  }

  if(formProps.system_user) {
    fields.system_user = formProps.system_user;
  } else {
    fields.system_user = false;
  }

  return async function (dispatch) {
    return await axios.patch(`${API_ROOT_URL}/api/v1/users/${formProps.id}`, fields, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      dispatch(fetchUsers());
      return dispatch(updateUserSuccess('Account updated'));
    }).catch((error) => {
      console.error(error);

      // If request is unauthenticated
      return dispatch(updateUserError(error.response.data.message));
    });
  };
}

export function updateEventTemplate(formProps) {

  let fields = {};

  fields.event_name = formProps.event_name;
  fields.event_value = formProps.event_value;
  fields.template_categories = (formProps.template_categories) ? formProps.template_categories : [];

  if(!formProps.event_free_text_required) {
    fields.event_free_text_required = false;
  } else {
    fields.event_free_text_required = formProps.event_free_text_required;
  }

  if(!formProps.system_template) {
    fields.system_template = false;
  } else {
    fields.system_template = formProps.system_template;
  }

  if(typeof formProps.disabled !== 'undefined') {
    fields.disabled = formProps.disabled;
  }
  else {
    fields.disabled = false;
  }


  if(!formProps.event_options) {
    fields.event_options = [];
  } else {
    fields.event_options = formProps.event_options;
    fields.event_options = fields.event_options.map(event_option => {

      if(!event_option.event_option_allow_freeform) {
        event_option.event_option_allow_freeform = false;
      }

      if(!event_option.event_option_required) {
        event_option.event_option_required = false;
      }

      if(event_option.event_option_type === 'dropdown') {
        event_option.event_option_values = event_option.event_option_values.split(',');
        event_option.event_option_values = event_option.event_option_values.map(string => {
          return string.trim();
        });
      } else if(event_option.event_option_type === 'checkboxes' || event_option.event_option_type === 'radio buttons') {
        event_option.event_option_values = event_option.event_option_values.split(',');
        event_option.event_option_values = event_option.event_option_values.map(string => {
          return string.trim();
        });
      } else if (event_option.event_option_type === 'text' || event_option.event_option_type === 'static text') {
        event_option.event_option_values = [];
      }

      return event_option;
    });
  }

  return async function (dispatch) {
    return await axios.patch(`${API_ROOT_URL}/api/v1/event_templates/${formProps.id}`, fields, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      dispatch(fetchEventTemplates());
      return dispatch(updateEventTemplateSuccess('Event template updated'));
    }).catch((error) => {
      console.error(error);

      // If request is unauthenticated
      return dispatch(updateEventTemplateError(error.response.data.message));
    });
  };
}

export function deleteCruise(id) {

  return async function (dispatch, getState) {
    return await axios.delete(`${API_ROOT_URL}/api/v1/cruises/${id}`, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      if(getState().cruise.cruise.id === id) {
        dispatch(leaveUpdateCruiseForm());
      }
      
      return dispatch(fetchCruises());

    }).catch((error) => {
      console.error(error);
    });
  };
}

export function deleteLowering(id) {

  return async function (dispatch, getState) {
    return await axios.delete(`${API_ROOT_URL}/api/v1/lowerings/${id}`, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      if(getState().lowering.lowering.id === id) {
        dispatch(leaveUpdateLoweringForm());
      }

      return dispatch(fetchLowerings());

    }).catch((error) => {
      console.error(error);
    });
  };
}

export function deleteUser(id) {

  return async function (dispatch, getState) {
    return await axios.delete(`${API_ROOT_URL}/api/v1/users/${id}`, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      if(getState().user.user.id === id) {
        dispatch(leaveUpdateUserForm());
      }

      return dispatch(fetchUsers());

    }).catch((error) => {
      console.error(error);
    });
  };
}

export function deleteEventTemplate(id) {

  return async function (dispatch, getState) {
    return await axios.delete(`${API_ROOT_URL}/api/v1/event_templates/${id}`, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      if(getState().event_template.event_template.id === id) {
        dispatch(leaveUpdateEventTemplateForm());
      }

      return dispatch(fetchEventTemplates());

    }).catch((error) => {
      console.error(error);
    });
  };
}

export function logout() {
  return function(dispatch) {
    cookies.remove('token', { path: '/' });
    cookies.remove('id', { path: '/' });
    dispatch(push(`/login`));
    return dispatch({type: UNAUTH_USER });
  };
}

export function switch2Guest(reCaptcha = null) {
  return function(dispatch) {
    return dispatch(login( { username:"guest", password: "", reCaptcha } ) );
  };
}

export function authSuccess(message) {
  return {
    type: AUTH_SUCCESS,
    payload: message
  };
}

export function authError(error) {
  return {
    type: AUTH_ERROR,
    payload: error
  };
}

export function createCruiseSuccess(message) {
  return {
    type: CREATE_CRUISE_SUCCESS,
    payload: message
  };
}

export function createCruiseError(message) {
  return {
    type: CREATE_CRUISE_ERROR,
    payload: message
  };
}

export function createLoweringSuccess(message) {
  return {
    type: CREATE_LOWERING_SUCCESS,
    payload: message
  };
}

export function createLoweringError(message) {
  return {
    type: CREATE_LOWERING_ERROR,
    payload: message
  };
}

export function createUserSuccess(message) {
  return {
    type: CREATE_USER_SUCCESS,
    payload: message
  };
}

export function createUserError(message) {
  return {
    type: CREATE_USER_ERROR,
    payload: message
  };
}

export function createEventTemplateSuccess(message) {
  return {
    type: CREATE_EVENT_TEMPLATE_SUCCESS,
    payload: message
  };
}

export function createEventTemplateError(message) {
  return {
    type: CREATE_EVENT_TEMPLATE_ERROR,
    payload: message
  };
}

export function registerUserSuccess(message) {
  return {
    type: REGISTER_USER_SUCCESS,
    payload: message
  };
}

export function registerUserError(message) {
  return {
    type: REGISTER_USER_ERROR,
    payload: message
  };
}

export function updateProfileSuccess(message) {
  return {
    type: UPDATE_PROFILE_SUCCESS,
    payload: message
  };
}

export function updateProfileError(message) {
  return {
    type: UPDATE_PROFILE_ERROR,
    payload: message
  };
}

export function updateCruiseSuccess(message) {
  return {
    type: UPDATE_CRUISE_SUCCESS,
    payload: message
  };
}

export function updateCruiseError(message) {
  return {
    type: UPDATE_CRUISE_ERROR,
    payload: message
  };
}

export function updateLoweringSuccess(message) {
  return {
    type: UPDATE_LOWERING_SUCCESS,
    payload: message
  };
}

export function updateLoweringError(message) {
  return {
    type: UPDATE_LOWERING_ERROR,
    payload: message
  };
}

export function updateUserSuccess(message) {
  return {
    type: UPDATE_USER_SUCCESS,
    payload: message
  };
}

export function updateUserError(message) {
  return {
    type: UPDATE_USER_ERROR,
    payload: message
  };
}

export function fetchUsers() {

  return async function (dispatch) {
    return await axios.get(API_ROOT_URL + '/api/v1/users', { headers: { authorization: cookies.get('token') } }
    ).then(({data}) => {
      return dispatch({type: FETCH_USERS, payload: data});
    }).catch((error) => {
      if(error.response.status === 404) {
        return dispatch({type: FETCH_USERS, payload: []});
      } else {
        console.error(error);
      }
    });
  };
}

export function fetchCruises() {

  return async function (dispatch) {
    return await axios.get(API_ROOT_URL + '/api/v1/cruises', { headers: { authorization: cookies.get('token') } }
    ).then(({data}) => {
      return dispatch({type: FETCH_CRUISES, payload: data});
    }).catch((error) => {
      if(error.response.status === 404) {
        return dispatch({type: FETCH_CRUISES, payload: []});
      } else {
        console.error(error);
      }
    });
  };
}

export function fetchLowerings() {

  return async function (dispatch) {
    return await axios.get(API_ROOT_URL + '/api/v1/lowerings', { headers: { authorization: cookies.get('token') } }
    ).then(({data}) => {
      return dispatch({type: FETCH_LOWERINGS, payload: data});
    }).catch((error) => {
      if(error.response.status === 404) {
        return dispatch({type: FETCH_LOWERINGS, payload: []});
      } else {
        console.error(error);
      }
    });
  };
}


export function fetchCustomVars() {

  return async function (dispatch) {
    return await axios.get(API_ROOT_URL + '/api/v1/custom_vars', { headers: { authorization: cookies.get('token') } }
    ).then(({data}) => {
      return dispatch({type: FETCH_CUSTOM_VARS, payload: data});
    }).catch((error) => {
      if(error.response.status === 404) {
        return dispatch({type: FETCH_CUSTOM_VARS, payload: []});
      } else {
        console.error(error);
      }
    });
  };
}

export function updateCustomVars(id, value) {
  
  return async function(dispatch) {
    return await axios.patch(`${API_ROOT_URL}/api/v1/custom_vars/${id}`, value, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      return dispatch(fetchCustomVars());
    }).catch((error) => {
      console.error(error);
    });
  };
}

export function updateEventTemplateSuccess(message) {
  return {
    type: UPDATE_EVENT_TEMPLATE_SUCCESS,
    payload: message
  };
}

export function updateEventTemplateError(message) {
  return {
    type: UPDATE_EVENT_TEMPLATE_ERROR,
    payload: message
  };
}


export function fetchEventTemplatesForMain() {

  return async function (dispatch) {
    return await axios.get(API_ROOT_URL + '/api/v1/event_templates?sort=event_name', { headers: { authorization: cookies.get('token') } }
    ).then(({data}) => {
      return dispatch({type: FETCH_EVENT_TEMPLATES_FOR_MAIN, payload: data});
    }).catch((error) => {
      if(error.response.status === 404) {
        return dispatch({type: FETCH_EVENT_TEMPLATES_FOR_MAIN, payload: []});
      } else {
        console.error(error);
      }
    });
  };
}

export function fetchFilteredEvents(filterParams={}) {

  let params = queryString.stringify(filterParams);

  return async function (dispatch) {
    return await axios.get(API_ROOT_URL + '/api/v1/events' + '?' + params, { headers: { authorization: cookies.get('token') } }
    ).then(({data}) => {
      return dispatch({type: FETCH_FILTERED_EVENTS, payload: data});
    }).catch((error) => {
      if(error.response.status === 404) {
        return dispatch({type: FETCH_FILTERED_EVENTS, payload: []});
      } else {
        console.error(error);
      }
    });
  };
}

export function fetchEvents() {

  return async function (dispatch) {    
    return await axios.get(API_ROOT_URL + '/api/v1/events', { headers: { authorization: cookies.get('token') } }
    ).then(({data}) => {
      return dispatch({type: FETCH_EVENTS, payload: data});
    }).catch((error) => {
      if(error.response.status === 404) {
        return dispatch({type: FETCH_EVENTS, payload: []});
      } else {
        console.error(error);
      }
    });
  };
}

export function fetchSelectedEvent(id) {
  
  return async function(dispatch) {
    return await axios.get(`${API_ROOT_URL}/api/v1/event_exports/${id}`, { headers: { authorization: cookies.get('token') } }      
    ).then((response) => {
      return dispatch({type: SET_SELECTED_EVENT, payload: response.data});
    }).catch((error) => {
      console.error(error);
      return dispatch({type: SET_SELECTED_EVENT, payload: {}});
    });
  };
}

export function clearSelectedEvent() {
  return function(dispatch) {
    return dispatch({type: CLEAR_SELECTED_EVENT, payload: null});
  };
}

export function clearEvents() {
  return function(dispatch) {
    return dispatch({type: UPDATE_EVENTS, payload: []});
  };
}

export function fetchEventHistory(asnap=false, filter='', page=0) {

  const eventsPerPage = 20;

  let url = `${API_ROOT_URL}/api/v1/events?sort=newest&limit=${eventsPerPage}&offset=${eventsPerPage*page}`;
  if(!asnap) {
    url += '&value=!ASNAP';
  }

  if(filter != '') {
    filter.split(',').forEach((filter_item) => {
      filter_item.trim();
      url += '&value='+filter_item;
    })    
  }

  return async function (dispatch) {
    return await axios.get(url, { headers: { authorization: cookies.get('token') } }
    ).then(({data}) => {
      return dispatch({type: FETCH_EVENT_HISTORY, payload: data});
    }).catch((error) => {
      if(error.response.status === 404) {
        return dispatch({type: FETCH_EVENT_HISTORY, payload: []});
      } else {
        console.error(error);
      }
    });
  };
}

export function fetchEventTemplates() {

  return async function (dispatch) {
    return await axios.get(API_ROOT_URL + '/api/v1/event_templates?sort=event_name', { headers: { authorization: cookies.get('token') } }
    ).then(({data}) => {
      return dispatch({type: FETCH_EVENT_TEMPLATES, payload: data});
    }).catch((error) => {
      if(error.response.data.statusCode === 404) {
        return dispatch({type: FETCH_EVENT_TEMPLATES, payload: []});
      } else {
        console.error(error);
      }
    });
  };
}

export function initCruise(id) {
  return async function (dispatch) {
    return await axios.get(`${API_ROOT_URL}/api/v1/cruises/${id}`, { headers: { authorization: cookies.get('token') } }
    ).then((response) => {
      return dispatch({ type: INIT_CRUISE, payload: response.data });
    }).catch((error)=>{
      console.error(error);
    });
  };
}

export function initCruiseFromLowering(id) {
  // console.log("initcruisefromlowering:", id)
  return async function (dispatch) {
    return await axios.get(`${API_ROOT_URL}/api/v1/lowerings/${id}`, { headers: { authorization: cookies.get('token') } }
    ).then(async (loweringResponse) => {
    // console.log("response:", loweringResponse.data)
      return await axios.get(`${API_ROOT_URL}/api/v1/cruises?startTS=${loweringResponse.data.start_ts}&stopTS=${loweringResponse.data.stop_ts}`, { headers: { authorization: cookies.get('token') } }
      ).then((response) => {
        return dispatch({ type: INIT_CRUISE, payload: response.data[0] });
      }).catch((error)=>{
        if(error.response.data.statusCode !== 404) {
          console.error(error);
        }
      });
    }).catch((error)=>{
      console.error(error);
    });
  };
}

export function initLowering(id) {
  return async function (dispatch) {
    return await axios.get(`${API_ROOT_URL}/api/v1/lowerings/${id}`, { headers: { authorization: cookies.get('token') } }
    ).then((response) => {
      return dispatch({ type: INIT_LOWERING, payload: response.data });
    }).catch((error)=>{
      console.error(error);
    });
  };
}

export function initLoweringReplay(id, hideASNAP = false) {
  return async function (dispatch) {
    dispatch(initLowering(id));
    dispatch({ type: EVENT_FETCHING, payload: true});

    let url = (hideASNAP)? `${API_ROOT_URL}/api/v1/events/bylowering/${id}?value=!ASNAP`: `${API_ROOT_URL}/api/v1/events/bylowering/${id}`;

    return await axios.get(url, { headers: { authorization: cookies.get('token') } }
    ).then((response) => {
      dispatch({ type: INIT_EVENT, payload: response.data });
      if (response.data.length > 0){
        dispatch(advanceLoweringReplayTo(response.data[0].id));
      }
      return dispatch({ type: EVENT_FETCHING, payload: false});
    }).catch((error)=>{
      if(error.response.data.statusCode !== 404) {
        console.error(error);
      }
      return dispatch({ type: EVENT_FETCHING, payload: false});
    });
  };
}

export function advanceLoweringReplayTo(id) {
  return async function (dispatch) {
    return await axios.get(`${API_ROOT_URL}/api/v1/event_exports/${id}`, { headers: { authorization: cookies.get('token') } }
    ).then((response) => {
      return dispatch({ type: SET_SELECTED_EVENT, payload: response.data });
    }).catch((err) => {
      console.error(err);
    });
  };
}

export function showASNAP() {
  return function (dispatch) {
    return dispatch({type: SHOW_ASNAP});
  };
}

export function hideASNAP() {
  return function (dispatch) {
    return dispatch({type: HIDE_ASNAP});
  };
}

export function updateEventFilterForm(formProps) {
  return function (dispatch) {
    return dispatch({type: UPDATE_EVENT_FILTER_FORM, payload: formProps});
  };
}

export function updateEventHistory(update) {
  return function (dispatch) {
    return dispatch({type: UPDATE_EVENT_HISTORY, payload: update});
  };
}

export function leaveLoginForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_AUTH_LOGIN_FORM, payload: null});
  };
}

export function leaveUpdateProfileForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_UPDATE_PROFILE_FORM, payload: null});
  };
}

export function leaveUpdateUserForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_UPDATE_USER_FORM, payload: null});
  };
}

export function leaveCreateUserForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_CREATE_USER_FORM, payload: null});
  };
}

export function leaveRegisterForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_REGISTER_USER_FORM, payload: null});
  };
}

export function leaveUpdateEventTemplateForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_UPDATE_EVENT_TEMPLATE_FORM, payload: null});
  };
}

export function leaveCreateEventTemplateForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_CREATE_EVENT_TEMPLATE_FORM, payload: null});
  };
}

export function leaveUpdateCruiseForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_UPDATE_CRUISE_FORM, payload: null});
  };
}

export function leaveCreateCruiseForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_CREATE_CRUISE_FORM, payload: null});
  };
}

export function leaveUpdateLoweringForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_UPDATE_LOWERING_FORM, payload: null});
  };
}

export function leaveCreateLoweringForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_CREATE_LOWERING_FORM, payload: null});
  };
}

export function leaveEventFilterForm() {
  return function (dispatch) {
    return dispatch({type: LEAVE_EVENT_FILTER_FORM, payload: null});
  };
}

export function clearSelectedCruise() {
  return function (dispatch) {
    return dispatch({type: LEAVE_UPDATE_CRUISE_FORM, payload: null});
  };
}

export function clearSelectedLowering() {
  return function (dispatch) {
    return dispatch({type: LEAVE_UPDATE_LOWERING_FORM, payload: null});
  };
}

export function showModal(modal, props) {
  return function(dispatch) {
    return dispatch(show(modal, props));
  };
}

export function eventUpdate() {
  return async function (dispatch, getState) {
    let startTS = (getState().event.eventFilter.startTS)? `startTS=${getState().event.eventFilter.startTS}` : '';
    let stopTS = (getState().event.eventFilter.stopTS)? `&stopTS=${getState().event.eventFilter.stopTS}` : '';
    let value = (getState().event.eventFilter.value)? `&value=${getState().event.eventFilter.value.split(',').join("&value=")}` : '';
    let author = (getState().event.eventFilter.author)? `&author=${getState().event.eventFilter.author.split(',').join("&author=")}` : '';
    let freetext = (getState().event.eventFilter.freetext)? `&freetext=${getState().event.eventFilter.freetext}` : '';
    let datasource = (getState().event.eventFilter.datasource)? `&datasource=${getState().event.eventFilter.datasource}` : '';

    dispatch({ type: EVENT_FETCHING, payload: true});
    return await axios.get(`${API_ROOT_URL}/api/v1/events?${startTS}${stopTS}${value}${author}${freetext}${datasource}`, { headers: { authorization: cookies.get('token') } }
    ).then((response) => {
      dispatch({ type: UPDATE_EVENTS, payload: response.data });
      return dispatch({ type: EVENT_FETCHING, payload: false});
    }).catch((error)=>{
      console.error(error);
      if(error.response.data.statusCode === 404) {
        dispatch({type: UPDATE_EVENTS, payload: []});
      } else {
        console.error(error.response);
      }
      return dispatch({ type: EVENT_FETCHING, payload: false});
    });
  };
}

export function eventUpdateLoweringReplay(lowering_id, hideASNAP = false) {
  return async function (dispatch, getState) {

    let startTS = (getState().event.eventFilter.startTS)? `startTS=${getState().event.eventFilter.startTS}` : '';
    let stopTS = (getState().event.eventFilter.stopTS)? `&stopTS=${getState().event.eventFilter.stopTS}` : '';
    let value = (getState().event.eventFilter.value)? `&value=${getState().event.eventFilter.value.split(',').join("&value=")}` : '';
    value = (hideASNAP)? `&value=!ASNAP${value}` : value;
    let author = (getState().event.eventFilter.author)? `&author=${getState().event.eventFilter.author.split(',').join("&author=")}` : '';
    let freetext = (getState().event.eventFilter.freetext)? `&freetext=${getState().event.eventFilter.freetext}` : '';
    let datasource = (getState().event.eventFilter.datasource)? `&datasource=${getState().event.eventFilter.datasource}` : '';

    dispatch({ type: EVENT_FETCHING, payload: true});
    return await axios.get(`${API_ROOT_URL}/api/v1/events/bylowering/${lowering_id}?${startTS}${stopTS}${value}${author}${freetext}${datasource}`, { headers: { authorization: cookies.get('token') } }
    ).then((response) => {
      dispatch({ type: UPDATE_EVENTS, payload: response.data });
      if(response.data.length > 0) {
        dispatch(fetchSelectedEvent(response.data[0].id));
      }
      return dispatch({ type: EVENT_FETCHING, payload: false});
    }).catch((error)=>{
      if(error.response.data.statusCode === 404) {
        dispatch({type: UPDATE_EVENTS, payload: []});
        dispatch({ type: SET_SELECTED_EVENT, payload: {} });

      } else {
        console.error(error);
      }
      return dispatch({ type: EVENT_FETCHING, payload: false});
    });
  };
}

export function deleteAllEvents() {
  return async function(dispatch) {
    return await axios.delete(`${API_ROOT_URL}/api/v1/events/all`, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      return dispatch(fetchEventHistory());
    }).catch((error)=> {
      console.error(error.response);
    });
  };
}

export function deleteAllLowerings() {
  return async function(dispatch) {
    return await axios.delete(`${API_ROOT_URL}/api/v1/lowerings/all`, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      return dispatch(fetchLowerings());
    }).catch((error)=> {
      console.error(error.response);
    });
  };
}

export function deleteAllCruises() {
  return async function(dispatch) {
    return await axios.delete(`${API_ROOT_URL}/api/v1/cruises/all`, { headers: { authorization: cookies.get('token') } }
    ).then(() => {
      return dispatch(fetchCruises());
    }).catch((error)=> {
      console.error(error.response);
    });
  };
}

export function deleteAllNonSystemUsers() {
  return async function(dispatch) {
    const users = await axios.get(`${API_ROOT_URL}/api/v1/users?system_user=false`, { headers: { authorization: cookies.get('token') } }
      ).then((response) => {
        return response.data;
      }).catch((error) =>{
        console.error(error.response);
      });

    users.map(async (user) => {
      return await dispatch(deleteUser(user.id, false));
      });

    return dispatch(fetchUsers());
  };
}

export function deleteAllNonSystemEventTemplates() {
  return async function(dispatch) {
    const event_templates = await axios.get(`${API_ROOT_URL}/api/v1/event_templates?system_template=false&sort=event_name`, { headers: { authorization: cookies.get('token') } }
      ).then((response) => {
        return response.data;
      }).catch((error)=> {
        console.error(error.response);
      });

    event_templates.map(async (event_template) => {
      return await dispatch(deleteEventTemplate(event_template.id, false));
      });

    return dispatch(fetchEventTemplates());
  };
}

export function updateEventTemplateCategory(category) {
  return { type: UPDATE_EVENT_TEMPLATE_CATEGORY, payload: category };
}