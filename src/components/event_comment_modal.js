import React, { Component } from 'react'
import { compose } from 'redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { FilePond, registerPlugin } from 'react-filepond'
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type'
import PropTypes from 'prop-types'
import { Button, Form, Modal } from 'react-bootstrap'
import {
  authorizationHeader,
  create_event_aux_data,
  delete_event_aux_data,
  get_event_aux_data,
  handle_image_file_delete,
  IMAGE_ROUTE
} from '../api'
import { API_ROOT_URL } from '../client_settings'
import { getImageUrl } from '../utils'
import { connectModal } from 'redux-modal'
import { reduxForm, Field } from 'redux-form'
import { renderTextArea } from './form_elements'

registerPlugin(FilePondPluginFileValidateType)

class EventCommentModal extends Component {
  constructor(props) {
    super(props)

    this.state = {
      files: [],
      event_aux_data: null,
      filepondPristine: true
    }

    this.finalized = false

    this.handleFormSubmit = this.handleFormSubmit.bind(this)
    this.handleFormHide = this.handleFormHide.bind(this)
  }

  componentDidMount() {
    this.populateDefaultValues()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.event !== this.props.event) {
      this.populateDefaultValues()
    }
  }

  componentWillUnmount() {
    // if the modal unmounts (e.g. the user navigates away) without being
    // explicitly submitted or canceled, abort/revert any in-flight or
    // just-completed uploads so they don't become orphaned files
    if (!this.finalized) {
      this.finalized = true
      this.pond?.removeFiles()
    }
  }

  handleFormHide() {
    this.finalized = true
    this.pond?.removeFiles()
    this.props.handleHide()
  }

  async populateDefaultValues() {
    const { event, initialize } = this.props

    await this.set_event_attachments(event)

    const event_option_comment = event
      ? event.event_options.find((event_option) => event_option.event_option_name === 'event_comment')
      : null

    if (event_option_comment) {
      initialize({
        event_comment: event_option_comment.event_option_value
      })
    }
  }

  async set_event_attachments(event) {
    let event_aux_data = event ? await get_event_aux_data({ datasource: 'eventFileAttachments', eventID: event.id }) : []

    event_aux_data = event_aux_data.length ? event_aux_data[0] : null

    const files = []
    if (event_aux_data) {
      const arr = event_aux_data['data_array']
      for (let i = 0; i + 1 < arr.length; i += 2) {
        files.push({ source: arr[i].data_value, filename: arr[i + 1].data_value })
      }
    }

    this.setState({ event_aux_data, files })
  }

  async handleFormSubmit(formProps) {
    this.finalized = true
    const { event, handleUpdateEvent, handleHide } = this.props
    let existing_comment = false
    let event_options =
      event && event.event_options
        ? event.event_options.map((event_option) => {
            if (event_option.event_option_name === 'event_comment') {
              existing_comment = true
              return {
                event_option_name: 'event_comment',
                event_option_value: formProps.event_comment
              }
            } else {
              return event_option
            }
          })
        : []

    if (!existing_comment && formProps.event_comment) {
      event_options.push({
        event_option_name: 'event_comment',
        event_option_value: formProps.event_comment
      })
    }

    const pondFiles = this.pond.getFiles().filter((file) => file.serverId)
    const fileMap = new Map(pondFiles.map((file) => [file.serverId, file.filename]))
    let data_array = this.state.event_aux_data ? this.state.event_aux_data.data_array : []
    fileMap.forEach((originalName, serverId) => {
      data_array.push({
        data_name: 'source',
        data_value: originalName
      })
      data_array.push({
        data_name: 'filename',
        data_value: serverId
      })
    })

    handleUpdateEvent({ ...event, event_options })

    // If there are no attached files and there's not currently a
    // aux_data_record for attached files, we're done
    if (data_array.length == 0 && this.state.event_aux_data == null) {
      handleHide()
      return
    }

    const aux_data_record = {
      event_id: this.props.event['id'],
      data_source: 'eventFileAttachments',
      data_array
    }

    if (this.state.event_aux_data) {
      await delete_event_aux_data(this.state.event_aux_data['id'])
    }

    const res = await create_event_aux_data(aux_data_record)
    this.setState({ event_aux_data: { ...aux_data_record, id: res.insertedId } })

    handleHide()
  }

  async handleDelete(file) {
    await handle_image_file_delete(file, async () => {
      const updated_aux_data = { ...this.state.event_aux_data }
      delete updated_aux_data['id']
      await delete_event_aux_data(this.state.event_aux_data['id'])

      // update aux_data_record — remove the source+filename pair where filename matches
      const update_data_array = []
      for (let i = 0; i + 1 < updated_aux_data.data_array.length; i += 2) {
        if (updated_aux_data.data_array[i + 1].data_value !== file) {
          update_data_array.push(updated_aux_data.data_array[i])
          update_data_array.push(updated_aux_data.data_array[i + 1])
        }
      }

      if (update_data_array.length) {
        await create_event_aux_data({ ...updated_aux_data, data_array: update_data_array })
      }

      this.set_event_attachments(this.props.event)
      this.props.handleUpdateEvent(this.props.event)
    })
  }

  renderFiles() {
    if (this.state.files && this.state.files.length) {
      let files = this.state.files.map(({ source, filename }, index) => {
        return (
          <div key={`file_${index}`} className='d-flex align-items-center mb-1'>
            <img
              src={getImageUrl(filename)}
              alt={source}
              style={{ width: '48px', height: '48px', objectFit: 'cover', marginRight: '8px', borderRadius: '4px' }}
            />
            <span className='me-2 text-truncate'>{source}</span>
            <FontAwesomeIcon onClick={() => this.handleDelete(filename)} className='text-danger' icon='trash' fixedWidth />
          </div>
        )
      })

      return <div className='mb-2'>{files}</div>
    }

    return null
  }

  render() {
    const { show, handleSubmit, submitting, valid, event } = this.props
    if (event) {
      return (
        <Modal size='md' show={show} onHide={this.handleFormHide} onEntered={() => document.getElementsByName('event_comment')[0].focus()}>
          <Form onSubmit={handleSubmit(this.handleFormSubmit)}>
            <Modal.Header className='bg-light' closeButton>
              <Modal.Title>Add/Update Comment</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <Field name='event_comment' component={renderTextArea} />
              Attachments
              {this.renderFiles()}
              <FilePond
                ref={(ref) => (this.pond = ref)}
                allowMultiple={true}
                maxFiles={5}
                acceptedFileTypes={['image/png', 'image/jpeg']}
                server={{
                  url: API_ROOT_URL,
                  process: {
                    url: IMAGE_ROUTE + '/filepond/process/' + this.props.event.id,
                    ...authorizationHeader()
                  },
                  revert: {
                    url: IMAGE_ROUTE + '/filepond/revert',
                    ...authorizationHeader()
                  }
                }}
                onupdatefiles={() => {
                  this.setState({ filepondPristine: false })
                }}
                disabled={this.props.event.id ? false : true}
              ></FilePond>
            </Modal.Body>

            <Modal.Footer>
              <Button variant='secondary' size='sm' disabled={submitting} onClick={this.handleFormHide}>
                Cancel
              </Button>
              <Button variant='primary' size='sm' type='submit' disabled={(submitting || !valid) && this.state.filepondPristine}>
                Submit
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )
    } else {
      return null
    }
  }
}

EventCommentModal.propTypes = {
  event: PropTypes.object,
  handleHide: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleUpdateEvent: PropTypes.func,
  initialize: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  submitting: PropTypes.bool.isRequired,
  valid: PropTypes.bool.isRequired
}

export default compose(connectModal({ name: 'eventComment' }), reduxForm({ form: 'eventCommentModal' }))(EventCommentModal)
