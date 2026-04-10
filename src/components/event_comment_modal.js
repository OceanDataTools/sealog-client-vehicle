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

    this.handleFormSubmit = this.handleFormSubmit.bind(this)
  }

  componentDidMount() {
    this.populateDefaultValues()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.event !== this.props.event) {
      this.populateDefaultValues()
    }
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

    const files = event_aux_data
      ? event_aux_data['data_array']
          .filter((data_item) => {
            if (data_item['data_name'] == 'filename') {
              return data_item
            }
          })
          .map((elem) => elem['data_value'])
      : []

    this.setState({ event_aux_data, files })
  }

  async handleFormSubmit(formProps) {
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

    const files = this.pond.getFiles()
    const filenames = [...new Set(files.map((file) => file.filename))]
    let data_array = this.state.event_aux_data ? this.state.event_aux_data.data_array : []
    filenames.forEach((filename) => {
      data_array.push({
        data_name: 'camera_name',
        data_value: filename
      })
      data_array.push({
        data_name: 'filename',
        data_value: filename
      })
    })

    // If there are no attached files and theres not currently a
    // aux_data_record for attached files, return
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

    handleUpdateEvent({ ...event, event_options })
    handleHide()
  }

  async handleDelete(file) {
    handle_image_file_delete(file)
    const updated_aux_data = { ...this.state.event_aux_data }
    delete updated_aux_data['id']
    await delete_event_aux_data(this.state.event_aux_data['id'])

    // update aux_data_record
    const update_data_array = updated_aux_data.data_array.filter((elem) => elem['data_value'] !== file)

    if (update_data_array.length) {
      await create_event_aux_data({ ...updated_aux_data, data_array: update_data_array })
    }

    this.set_event_attachments(this.props.event)
    this.props.handleUpdateEvent(this.props.event)
  }

  renderFiles() {
    if (this.state.files && this.state.files.length) {
      let files = this.state.files.map((file, index) => {
        return (
          <div key={`file_${index}`} className='d-flex align-items-center mb-1'>
            <img
              src={getImageUrl(file)}
              alt={file}
              style={{ width: '48px', height: '48px', objectFit: 'cover', marginRight: '8px', borderRadius: '4px' }}
            />
            <span className='me-2 text-truncate'>{file}</span>
            <FontAwesomeIcon onClick={() => this.handleDelete(file)} className='text-danger' icon='trash' fixedWidth />
          </div>
        )
      })

      return <div className='mb-2'>{files}</div>
    }

    return null
  }

  render() {
    const { show, handleHide, handleSubmit, submitting, valid, event } = this.props
    if (event) {
      return (
        <Modal size='md' show={show} onHide={handleHide} onEntered={() => document.getElementsByName('event_comment')[0].focus()}>
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
              <Button variant='secondary' size='sm' disabled={submitting} onClick={handleHide}>
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
