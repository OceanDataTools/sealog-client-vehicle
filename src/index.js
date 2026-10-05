import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { ConnectedRouter } from 'connected-react-router'
import { Route, Switch } from 'react-router'
import { Container } from 'react-bootstrap'
import cookies from './cookies'
import L from 'leaflet'

// eslint-disable-next-line no-unused-vars
import momentDurationFormatSetup from 'moment-duration-format'

import { AUTH_USER } from './actions/types'
import Header from './components/header'
import Footer from './components/footer'
import Login from './components/auth/login'
import Logout from './components/auth/logout'
import Profile from './components/auth/profile'
import Register from './components/auth/register'
import RequireAuth from './components/auth/require_auth'
import RequireUnauth from './components/auth/require_unauth'
import CruiseMenu from './components/cruise_menu'
import Users from './components/users'
import Tasks from './components/tasks'
import EventErrorToast from './components/event_error_toast'
import RequiredAuxDataMonitor from './components/required_aux_data_monitor'
import EventLogging from './components/event_logging'
import EventManagement from './components/event_management'
import EventTemplates from './components/event_templates'
import Lowerings from './components/lowerings'
import ReviewMap from './components/review_map'
import ReviewGallery from './components/review_gallery'
import ReviewReplay from './components/review_replay'
import Cruises from './components/cruises'
import ForgotPassword from './components/auth/forgot_password'
import ResetPassword from './components/auth/reset_password'

import { library } from '@fortawesome/fontawesome-svg-core'

import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight'
import { faBackward } from '@fortawesome/free-solid-svg-icons/faBackward'
import { faCalculator } from '@fortawesome/free-solid-svg-icons/faCalculator'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight'
import { faChevronUp } from '@fortawesome/free-solid-svg-icons/faChevronUp'
import { faClipboard } from '@fortawesome/free-solid-svg-icons/faClipboard'
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy'
import { faComment } from '@fortawesome/free-solid-svg-icons/faComment'
import { faCompress } from '@fortawesome/free-solid-svg-icons/faCompress'
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload'
import { faExpand } from '@fortawesome/free-solid-svg-icons/faExpand'
import { faEye } from '@fortawesome/free-solid-svg-icons/faEye'
import { faEyeSlash } from '@fortawesome/free-solid-svg-icons/faEyeSlash'
import { faForward } from '@fortawesome/free-solid-svg-icons/faForward'
import { faLink } from '@fortawesome/free-solid-svg-icons/faLink'
import { faPause } from '@fortawesome/free-solid-svg-icons/faPause'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay'
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus'
import { faStepBackward } from '@fortawesome/free-solid-svg-icons/faStepBackward'
import { faStepForward } from '@fortawesome/free-solid-svg-icons/faStepForward'
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes'
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash'
import { faVial } from '@fortawesome/free-solid-svg-icons/faVial'
import { faUser } from '@fortawesome/free-solid-svg-icons/faUser'
import { faUserLock } from '@fortawesome/free-solid-svg-icons/faUserLock'
import { faWindowMaximize } from '@fortawesome/free-solid-svg-icons/faWindowMaximize'

library.add(
  faArrowRight,
  faBackward,
  faCalculator,
  faChevronDown,
  faChevronRight,
  faChevronUp,
  faClipboard,
  faCopy,
  faComment,
  faCompress,
  faDownload,
  faExpand,
  faEye,
  faEyeSlash,
  faForward,
  faLink,
  faPause,
  faPencilAlt,
  faPlay,
  faPlus,
  faStepBackward,
  faStepForward,
  faTimes,
  faTrash,
  faVial,
  faUser,
  faUserLock,
  faWindowMaximize
)

import 'filepond/dist/filepond.min.css'
import 'rc-slider/assets/index.css'
import 'leaflet/dist/leaflet.css'
import './assets/scss/sealog.scss?v=1.1.0'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  conSize: [25, 41],
  iconAnchor: [13, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

import configureStore from './store'
import history from './history'

import { DISABLE_EVENT_LOGGING, REQUIRED_AUX_DATA_SOURCES } from './client_settings'

const store = configureStore()

const token = cookies.get('token')
if (token) {
  store.dispatch({ type: AUTH_USER })
}

ReactDOM.render(
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <Header />
      <EventErrorToast />
      {!DISABLE_EVENT_LOGGING && REQUIRED_AUX_DATA_SOURCES.length > 0 && <RequiredAuxDataMonitor />}
      <Container fluid style={{ maxWidth: '1200px', paddingBottom: '70px' }}>
        <Switch>
          <Route path={`/`} exact={true} component={RequireAuth(DISABLE_EVENT_LOGGING ? CruiseMenu : EventLogging)} />
          <Route path={`/profile`} exact={true} component={RequireAuth(Profile)} />
          <Route path={`/register`} exact={true} component={Register} />
          <Route path={`/forgotPassword`} exact={true} component={ForgotPassword} />
          <Route path={`/resetPassword/:token`} exact={true} component={ResetPassword} />
          <Route path={`/login`} exact={true} component={RequireUnauth(Login)} />
          <Route path={`/logout`} exact={true} component={Logout} />
          <Route path={`/users`} exact={true} component={RequireAuth(Users)} />
          <Route path={`/tasks`} exact={true} component={RequireAuth(Tasks)} />
          <Route path={`/cruises`} exact={true} component={RequireAuth(Cruises)} />
          <Route path={`/cruise_menu`} exact={true} component={RequireAuth(CruiseMenu)} />
          <Route path={`/lowerings`} exact={true} component={RequireAuth(Lowerings)} />
          <Route path={`/review_gallery/:id`} exact={true} component={RequireAuth(ReviewGallery)} />
          <Route path={`/review_map/:id`} exact={true} component={RequireAuth(ReviewMap)} />
          <Route path={`/review_replay/:id`} exact={true} component={RequireAuth(ReviewReplay)} />
          <Route path={`/event_management`} exact={true} component={RequireAuth(EventManagement)} />
          <Route path={`/event_templates`} exact={true} component={RequireAuth(EventTemplates)} />
        </Switch>
      </Container>
      <Footer />
    </ConnectedRouter>
  </Provider>,
  document.querySelector('#container')
)
