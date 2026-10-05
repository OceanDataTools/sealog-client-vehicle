import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Client } from '@hapi/nes/lib/client'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import prettyBytes from 'pretty-bytes'
import { Nav, Navbar, NavbarCollapse } from 'react-bootstrap'
import { get_custom_vars } from '../api'
import { connectWSClient } from '../utils'
import { WS_ROOT_URL, DISABLE_EVENT_LOGGING, REQUIRED_AUX_DATA_SOURCES } from '../client_settings'
import * as mapDispatchToProps from '../actions'

class Footer extends Component {
  constructor(props) {
    super(props)

    this.trackedCustomVars = ['asnapStatus', 'freeSpaceInBytes', 'freeSpacePercentage']

    this.state = {
      asnapStatus: null,
      freeSpaceInBytes: null,
      freeSpacePercentage: null,
      wsConnected: false
    }

    this.client = new Client(`${WS_ROOT_URL}`)
    this.client.onConnect = () => this.setState({ wsConnected: true })
    this.client.onDisconnect = () => this.setState({ wsConnected: false })
    this.connectToWS = this.connectToWS.bind(this)
  }

  componentDidMount() {
    if (this.props.authenticated && !DISABLE_EVENT_LOGGING) {
      this.fetchCustomVars()

      if (!DISABLE_EVENT_LOGGING) {
        this.connectToWS()
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.authenticated !== this.props.authenticated && this.props.authenticated) {
      this.fetchCustomVars()

      if (!DISABLE_EVENT_LOGGING) {
        this.connectToWS()
      }
    }
  }

  componentWillUnmount() {
    if (!DISABLE_EVENT_LOGGING && this.props.authenticated) {
      this.client.disconnect()
    }
  }

  async connectToWS() {
    const updateHandler = (update) => {
      if (this.trackedCustomVars.includes(update.custom_var_name)) {
        const new_state = {}
        new_state[update.custom_var_name] = update.custom_var_value
        this.setState(new_state)
      }
    }

    await connectWSClient(this.client, {
      '/ws/status/updateCustomVars': updateHandler
    })
  }

  async fetchCustomVars() {
    const query = {
      name: this.trackedCustomVars
    }

    const response = await get_custom_vars(query)
    const new_state = response.reduce((acc, obj) => {
      acc[obj.custom_var_name] = obj.custom_var_value
      return acc
    }, {})

    this.setState(new_state)
  }

  render() {
    let freeSpaceStatus = null
    let asnapStatus = null
    let wsStatus = null
    let auxDataStatus = null

    if (!DISABLE_EVENT_LOGGING && this.props.authenticated) {
      const wsStatusStyle = this.state.wsConnected ? 'text-success' : 'text-danger'
      wsStatus = (
        <React.Fragment>
          Server: <span className={wsStatusStyle + ' me-3'}>{this.state.wsConnected ? 'Connected' : 'Disconnected'}</span>
        </React.Fragment>
      )
    }

    if (DISABLE_EVENT_LOGGING) {
      freeSpaceStatus = null
    } else if (this.props.authenticated && this.state.freeSpaceInBytes) {
      let sizeStyle = 'text-danger'
      if (parseInt(this.state.freeSpacePercentage) < 90) {
        sizeStyle = 'text-warning'
      }
      if (parseInt(this.state.freeSpacePercentage) < 75) {
        sizeStyle = 'text-success'
      }
      freeSpaceStatus = (
        <React.Fragment>
          Free Space: <span className={sizeStyle}>{prettyBytes(parseInt(this.state.freeSpaceInBytes || 'Unknown'))}</span>
        </React.Fragment>
      )
    }

    if (!DISABLE_EVENT_LOGGING && this.props.authenticated) {
      let asnapStatusStyle = 'text-danger'
      if (this.state.asnapStatus === 'On') {
        asnapStatusStyle = 'text-success'
      }
      asnapStatus = (
        <React.Fragment>
          ASNAP: <span className={asnapStatusStyle + ' me-3'}>{this.state.asnapStatus || 'Unknown'}</span>
        </React.Fragment>
      )
    }

    if (!DISABLE_EVENT_LOGGING && this.props.authenticated && REQUIRED_AUX_DATA_SOURCES.length) {
      const missing = this.props.auxDataMissing
      let auxDataStatusStyle = 'text-warning'
      let auxDataStatusText = 'Unknown'
      if (missing && missing.length) {
        auxDataStatusStyle = 'text-danger'
        auxDataStatusText = `Missing ${missing.join(', ')}`
      } else if (missing) {
        auxDataStatusStyle = 'text-success'
        auxDataStatusText = 'OK'
      }
      auxDataStatus = (
        <React.Fragment>
          Aux Data: <span className={auxDataStatusStyle + ' me-3'}>{auxDataStatusText}</span>
        </React.Fragment>
      )
    }

    return (
      <Navbar className='footer' collapseOnSelect expand='sm' variant='dark' fixed='bottom'>
        <Navbar.Text className='ms-4'>
          {wsStatus}
          {asnapStatus}
          {auxDataStatus}
          {freeSpaceStatus}
        </Navbar.Text>
        <NavbarCollapse id='responsive-navbar-nav' className='justify-content-end'>
          <Nav className='justify-content-end me-4' style={{ width: '100%' }}>
            <span>
              <Link
                className='text-link text-primary me-1'
                to={{ pathname: 'https://oceandatatools.github.io/sealog-docs' }}
                target='_blank'
              >
                Sealog
              </Link>
              is licensed under the
              <Link className='text-link text-primary mx-1' to={{ pathname: 'https://opensource.org/license/mit' }} target='_blank'>
                MIT
              </Link>
              public license
            </span>
          </Nav>
        </NavbarCollapse>
      </Navbar>
    )
  }
}

Footer.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  auxDataMissing: PropTypes.array
}

const mapStateToProps = (state) => {
  return {
    authenticated: state.auth.authenticated,
    auxDataMissing: state.aux_data_status.missing
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Footer)
