import { UPDATE_AUX_DATA_STATUS, CLEAR_AUX_DATA_STATUS } from '../actions/types';

// Required auxdata check for the most recently evaluated live event.
// missing is null until an event has been evaluated.
export default (state = { event_id: null, missing: null }, action) => {
  switch (action.type) {

    case UPDATE_AUX_DATA_STATUS:
      return { ...state, event_id: action.payload.event_id, missing: action.payload.missing };

    case CLEAR_AUX_DATA_STATUS:
      return { ...state, event_id: null, missing: null };
  }

  return state;
}
