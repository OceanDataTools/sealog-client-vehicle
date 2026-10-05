import { UPDATE_AUX_DATA_STATUS, CLEAR_AUX_DATA_STATUS, SHOW_AUX_DATA_TOAST } from '../actions/types';

// Required auxdata check for the most recently evaluated live event.
// missing is null until an event has been evaluated. toast_request is
// incremented to ask the monitor to re-show the missing-auxdata toast.
export default (state = { event_id: null, missing: null, toast_request: 0 }, action) => {
  switch (action.type) {

    case UPDATE_AUX_DATA_STATUS:
      return { ...state, event_id: action.payload.event_id, missing: action.payload.missing };

    case CLEAR_AUX_DATA_STATUS:
      return { ...state, event_id: null, missing: null };

    case SHOW_AUX_DATA_TOAST:
      return { ...state, toast_request: state.toast_request + 1 };
  }

  return state;
}
