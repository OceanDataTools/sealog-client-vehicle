import { combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import { connectRouter } from 'connected-react-router';
import { reducer as modalReducer } from 'redux-modal';
import authReducer from './auth_reducer';
import auxDataStatusReducer from './aux_data_status_reducer';
import cruiseReducer from './cruise_reducer';
import eventReducer from './event_reducer';
import eventTemplateReducer from './event_template_reducer';
import loweringReducer from './lowering_reducer';
import userReducer from './user_reducer';

export default (history) => combineReducers({
  form: reduxFormReducer,
  router: connectRouter(history),
  modal: modalReducer,
  auth: authReducer,
  aux_data_status: auxDataStatusReducer,
  cruise: cruiseReducer,
  event: eventReducer,
  event_template: eventTemplateReducer,
  lowering: loweringReducer,
  user: userReducer,
});