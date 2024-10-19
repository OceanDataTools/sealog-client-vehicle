import React, { Component } from 'react'
import { Client } from '@hapi/nes/lib/client'
import PropTypes from 'prop-types'
import { Button, Modal } from 'react-bootstrap'
import { connectModal } from 'redux-modal'
import { authorizationHeader } from '../api'
import { WS_ROOT_URL } from '../client_settings'

class ExecuteModal extends Component {
  constructor(props) {
    super(props)

    this.client = new Client(`${WS_ROOT_URL}`)
    this.connectToWS = this.connectToWS.bind(this)
    this.handleHide = this.handleHide.bind(this)
    this.handleProceed = this.handleProceed.bind(this)

    this.state = {
      output: '',
      client_id: null,
      hasExecuted: false
    }
  }

  componentDidMount() {
    this.connectToWS()
  }

  async connectToWS() {
    this.client.onConnect = () => {
      this.setState({ client_id: this.client.id })
    }

    this.client.onError = (err) => {
      console.error(err)
    }

    this.client.onUpdate = (update) => {
      update = update.split('\n')
      update.forEach((line) => {
        this.setState((prevState) => ({ output: `${prevState.output}${line.replace('\t', '  ').split(' - ', 2).at(-1)}\n` }))
      })
    }

    this.client.onDisconnect = () => {
      this.setState({ client_id: null })
    }

    try {
      await this.client.connect({
        auth: authorizationHeader,
        reconnect: false
      })

      this.client.request('/ws/execute_output')
    } catch (error) {
      console.error('Problem connecting to websocket subscriptions')
      console.debug(error)
    }
  }

  handleProceed() {
    this.setState({ hasExecuted: true })
    this.props.handleConfirm()
  }

  handleHide() {
    if (!this.state.hasExecuted || !this.state.client_id) {
      this.props.handleHide()
    }
  }

  render() {
    const { show, title, handleHide } = this.props

    const message = this.props.message ? <p>{this.props.message}</p> : null

    const rendered_output = this.state.output.split('\n').map((i, key) => {
      return <div key={key}>{i}</div>
    })

    return (
      <Modal size={'xl'} show={show} onHide={this.handleHide}>
        <Modal.Header className='bg-light' closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {this.state.client_id && !this.state.hasExecuted ? (
            <>
              {message}
              <Button size='sm' variant='primary' onClick={this.handleProceed}>
                Proceed?
              </Button>
            </>
          ) : null}
          <pre>{rendered_output}</pre>
          {!this.state.client_id && this.state.hasExecuted ? (
            <Button size='sm' variant='primary' onClick={handleHide}>
              Close
            </Button>
          ) : null}
        </Modal.Body>
      </Modal>
    )
  }
}

ExecuteModal.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  handleConfirm: PropTypes.func,
  handleHide: PropTypes.func,
  show: PropTypes.bool.isRequired
}

export default connectModal({ name: 'executeCommand' })(ExecuteModal)
