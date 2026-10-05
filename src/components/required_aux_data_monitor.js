import React, { Component } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { Toast, ToastContainer } from 'react-bootstrap'
import { Client } from '@hapi/nes/lib/client'
import { get_event_aux_data, get_lowerings } from '../api'
import { connectWSClient } from '../utils'
import {
  WS_ROOT_URL,
  REQUIRED_AUX_DATA_SOURCES,
  REQUIRED_AUX_DATA_TOAST_COOLDOWN,
  REQUIRED_AUX_DATA_GRACE_PERIOD
} from '../client_settings'
import * as mapDispatchToProps from '../actions'

// Watches newly created events and, once each event's grace period has
// passed, checks that it has every REQUIRED_AUX_DATA_SOURCES datasource.
// The result is stored in redux (read by the footer) and a warning toast is
// shown when sources are missing, rate-limited by
// REQUIRED_AUX_DATA_TOAST_COOLDOWN unless the set of missing sources changes.
// Only mount this component when REQUIRED_AUX_DATA_SOURCES is non-empty.
class RequiredAuxDataMonitor extends Component {
  constructor(props) {
    super(props)

    this.state = {
      showToast: false,
      toastMissing: [],
      toastId: 0
    }

    // event_id -> { ts, seen: Set of datasources reported over WS, timer }
    this.pending = {}
    this.lastEvaluatedTS = null
    this.lastToastAt = null
    this.lastToastMissing = null
    this.lowering = null

    this.client = new Client(`${WS_ROOT_URL}`)
    this.connectToWS = this.connectToWS.bind(this)
    this.handleToastClose = this.handleToastClose.bind(this)
  }

  componentDidMount() {
    if (this.props.authenticated) {
      this.connectToWS()
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.authenticated !== this.props.authenticated) {
      if (this.props.authenticated) {
        this.connectToWS()
      } else {
        this.reset()
        this.client.disconnect()
      }
    }
  }

  componentWillUnmount() {
    Object.values(this.pending).forEach((item) => clearTimeout(item.timer))
    if (this.props.authenticated) {
      this.client.disconnect()
    }
  }

  reset() {
    Object.values(this.pending).forEach((item) => clearTimeout(item.timer))
    this.pending = {}
    this.lastEvaluatedTS = null
    this.props.clearAuxDataStatus()
    this.setState({ showToast: false })
  }

  async connectToWS() {
    const newEventHandler = async (update) => {
      if (!update.id || this.pending[update.id]) return
      if (!(await this.isDuringLowering(update.ts))) return

      this.pending[update.id] = {
        ts: update.ts,
        seen: new Set(),
        timer: setTimeout(() => this.evaluateEvent(update.id), REQUIRED_AUX_DATA_GRACE_PERIOD * 1000)
      }
    }

    const auxDataHandler = (update) => {
      const item = this.pending[update.event_id]
      if (!item || !update.data_source) return

      // Resolve early once every required source has been seen.
      item.seen.add(update.data_source)
      if (REQUIRED_AUX_DATA_SOURCES.every((source) => item.seen.has(source))) {
        clearTimeout(item.timer)
        delete this.pending[update.event_id]
        this.reportResult(update.event_id, item.ts, [])
      }
    }

    const deleteEventHandler = (update) => {
      const item = this.pending[update.id]
      if (item) {
        clearTimeout(item.timer)
        delete this.pending[update.id]
      }
    }

    await connectWSClient(this.client, {
      '/ws/status/newEvents': newEventHandler,
      '/ws/status/deleteEvents': deleteEventHandler,
      '/ws/status/newEventAuxData': auxDataHandler,
      '/ws/status/updateEventAuxData': auxDataHandler
    })
  }

  // Only check events logged while a lowering is in progress. The matching
  // lowering is cached so most events don't need a lookup.
  async isDuringLowering(ts) {
    const inLowering = (lowering) => lowering && lowering.start_ts <= ts && (!lowering.stop_ts || ts <= lowering.stop_ts)

    if (inLowering(this.lowering)) return true

    const lowerings = await get_lowerings({ startTS: ts, stopTS: ts })
    this.lowering = lowerings.find(inLowering) || null
    return Boolean(this.lowering)
  }

  async evaluateEvent(event_id) {
    const item = this.pending[event_id]
    if (!item) return
    delete this.pending[event_id]

    const aux_data = await get_event_aux_data({ eventID: event_id })
    const sources = new Set([...item.seen, ...aux_data.map((record) => record.data_source)])
    const missing = REQUIRED_AUX_DATA_SOURCES.filter((source) => !sources.has(source))

    this.reportResult(event_id, item.ts, missing)
  }

  reportResult(event_id, ts, missing) {
    if (!this.props.authenticated) return

    // The footer reflects the most recent event, even if results arrive out of order.
    if (this.lastEvaluatedTS === null || ts >= this.lastEvaluatedTS) {
      this.lastEvaluatedTS = ts
      this.props.updateAuxDataStatus(event_id, missing)
    }

    if (missing.length) {
      const now = Date.now()
      const missingChanged = !this.lastToastMissing || this.lastToastMissing.join(',') !== missing.join(',')
      const cooledDown = !this.lastToastAt || now - this.lastToastAt >= REQUIRED_AUX_DATA_TOAST_COOLDOWN * 1000

      if (missingChanged || cooledDown) {
        this.lastToastAt = now
        this.lastToastMissing = missing
        this.setState((prevState) => ({ showToast: true, toastMissing: missing, toastId: prevState.toastId + 1 }))
      }
    }
  }

  handleToastClose() {
    this.setState({ showToast: false })
  }

  render() {
    return (
      <ToastContainer position='top-end' containerPosition='fixed' className='p-3' style={{ zIndex: 1100 }}>
        <Toast key={this.state.toastId} show={this.state.showToast} onClose={this.handleToastClose} bg='warning'>
          <Toast.Header>
            <strong className='me-auto'>Missing Aux Data</strong>
          </Toast.Header>
          <Toast.Body>
            The most recent event is missing data from: <strong>{this.state.toastMissing.join(', ')}</strong>. Check that the corresponding
            data managers are running.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    )
  }
}

RequiredAuxDataMonitor.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  updateAuxDataStatus: PropTypes.func.isRequired,
  clearAuxDataStatus: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    authenticated: state.auth.authenticated
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(RequiredAuxDataMonitor)
