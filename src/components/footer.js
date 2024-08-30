import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Client } from '@hapi/nes/lib/client'
import PropTypes from 'prop-types'
import prettyBytes from 'pretty-bytes'
import { authorizationHeader, get_custom_vars } from '../api'
import { WS_ROOT_URL, DISABLE_EVENT_LOGGING } from '../client_settings'
import * as mapDispatchToProps from '../actions'

class Footer extends Component {
  constructor(props) {
    super(props)

    this.trackedCustomVars = ['asnapStatus', 'freeSpaceInBytes', 'freeSpacePercentage']

    this.state = {
      asnapStatus: null,
      freeSpaceInBytes: null,
      freeSpacePercentage: null
    }

    this.client = new Client(`${WS_ROOT_URL}`)
    this.connectToWS = this.connectToWS.bind(this)
  }

  componentDidMount() {
    if (this.props.authenticated) {
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
    try {
      await this.client.connect({
        auth: authorizationHeader
      })

      const updateHandler = (update) => {
        if(this.trackedCustomVars.includes(update.custom_var_name)) {
          const new_state = {}
          new_state[update.custom_var_name] = update.custom_var_value
          this.setState(new_state)
        }
      }

      this.client.subscribe('/ws/status/updateCustomVars', updateHandler)
    } catch (error) {
      console.error('Problem connecting to websocket subscriptions')
      console.debug(error)
    }
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
        <span className='ml-2'>
          Free Space: <span className={sizeStyle}>{prettyBytes(parseInt(this.state.freeSpaceInBytes || 'Unknown'))}</span>
        </span>
      )
    }

    if (!DISABLE_EVENT_LOGGING && this.props.authenticated) {
      let asnapStatusStyle = 'text-danger'
      if (this.state.asnapStatus === 'On') {
        asnapStatusStyle = 'text-success'
      }
      asnapStatus = (
        <span>
          ASNAP: <span className={asnapStatusStyle}>{this.state.asnapStatus || 'Unknown'}</span>
        </span>
      )
    }

    return (
      <div className='mt-2 justify-content-center'>
        {asnapStatus}
        {freeSpaceStatus}
        <span className='float-right'>
          <a href='https://oceandatatools.github.io/sealog-docs' target='_blank'>
            Sealog
          </a>{' '}
          is licensed under the{' '}
          <a href='https://opensource.org/license/mit' target='_blank'>
            MIT
          </a>{' '}
          public license
        </span>
      </div>
    )
  }
}

Footer.propTypes = {
  authenticated: PropTypes.bool.isRequired
}

const mapStateToProps = (state) => {
  return {
    authenticated: state.auth.authenticated
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Footer)
