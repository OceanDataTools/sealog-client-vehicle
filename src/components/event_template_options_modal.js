import React, { Component } from 'react'
import { compose } from 'redux'
import { connectModal } from 'redux-modal'
import { reduxForm, Field } from 'redux-form'
import { FilePond, registerPlugin } from 'react-filepond'
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import moment from 'moment'
import {
  renderCheckboxGroup,
  renderDateTimePicker,
  renderRadioGroup,
  renderSelectField,
  renderStaticTextField,
  renderTextArea,
  renderTextField
} from './form_elements'
import { Button, Modal } from 'react-bootstrap'
import { authorizationHeader, create_event_aux_data, IMAGE_ROUTE } from '../api'
import { API_ROOT_URL } from '../client_settings'

registerPlugin(FilePondPluginFileValidateType)

const required = (value) => (!value ? 'Required' : undefined)
const requiredArray = (value) => (!value || value.length === 0 ? 'Must select at least one option' : undefined)

class EventTemplateOptionsModal extends Component {
  constructor(props) {
    super(props)

    this.state = {
      event_id: this.props.event ? this.props.event.id : null
    }

    this.finalized = false

    this.handleFormHide = this.handleFormHide.bind(this)
  }

  componentDidMount() {
    this.populateDefaultValues()
  }

  componentWillUnmount() {
    // if the modal unmounts (e.g. the user navigates away) without the
    // event being explicitly submitted or canceled, delete the
    // optimistically-created event so it isn't orphaned in the database
    if (this.props.event && !this.finalized) {
      this.finalized = true
      // abort/revert any in-flight or just-completed uploads so they don't
      // land (or persist) after the event they're attached to is deleted
      this.pond?.removeFiles()
      this.props.handleDeleteEvent(this.props.event.id)
    }
  }

  async populateDefaultValues() {
    const ts = this.props.event ? moment.utc(this.props.event.ts) : moment.utc()
    let event_options = {}

    this.props.eventTemplate.event_options.forEach((option, index) => {
      if (option.event_option_default_value && option.event_option_type !== 'checkboxes') {
        event_options[`option_${index}`] = option.event_option_default_value
      } else if (option.event_option_default_value && option.event_option_type === 'checkboxes') {
        event_options[`option_${index}`] = option.event_option_default_value.split(',').map((item) => item.trim())
      }
    })
    this.props.initialize({ id: this.state.event_id, ts, event_options })
  }

  async handleFormSubmit(formProps) {
    formProps.event_free_text = formProps.event_free_text ? formProps.event_free_text : ''

    if (formProps.ts) {
      if (moment.isMoment(formProps.ts)) {
        formProps.ts = formProps.ts.toISOString()
      } else if (typeof formProps.ts === 'string') {
        const validMoment = moment(formProps.ts, moment.ISO_8601, true)
        if (validMoment.isValid()) {
          formProps.ts = validMoment.toISOString()
        }
      } else {
        formProps.ts = null
      }
    }

    let raw_event_options = JSON.parse(JSON.stringify(formProps.event_options))

    //Convert objects to arrays
    let optionValue = []
    let optionIndex = Object.keys(raw_event_options)
      .sort()
      .map((value) => {
        optionValue.push(raw_event_options[value])
        return parseInt(value.split('_')[1])
      })

    //Remove empty fields
    optionValue.forEach((value, index) => {
      if (value === '') {
        optionIndex.splice(index, 1)
        optionValue.splice(index, 1)
      }
    })

    //Build event_options array
    formProps.event_options = optionIndex.map((value, index) => {
      if (Array.isArray(optionValue[index])) {
        optionValue[index] = optionValue[index].join(';')
      }

      return {
        event_option_name: this.props.eventTemplate.event_options[value].event_option_name,
        event_option_value: optionValue[index]
      }
    })

    const fileMap = new Map(
      this.pond
        .getFiles()
        .filter((file) => file.serverId)
        .map((file) => [file.serverId, file.filename])
    )

    //Submit event
    if (this.props.event) {
      await this.props.handleUpdateEvent(formProps)

      if (fileMap.size) {
        await create_event_aux_data({
          event_id: this.props.event.id,
          data_source: 'eventFileAttachments',
          data_array: [...fileMap.entries()].flatMap(([serverId, originalName]) => [
            { data_name: 'source', data_value: originalName },
            { data_name: 'filename', data_value: serverId }
          ])
        })
      }
    }
    this.finalized = true
    this.props.handleHide()
  }

  handleFormHide() {
    if (this.props.event) {
      this.finalized = true
      // abort/revert any in-flight or just-completed uploads so they don't
      // land (or persist) after the event they're attached to is deleted
      this.pond?.removeFiles()
      this.props.handleDeleteEvent(this.props.event.id)
    }
    this.props.handleHide()
  }

  renderEventOptions() {
    const { eventTemplate, formValues } = this.props
    const { event_options } = eventTemplate

    return event_options.map((option, index) => {
      let visible = true

      if (option.event_option_visibility) {
        const { show_hide, event_option_name, event_option_values } = option.event_option_visibility

        const controllingIndex = event_options.findIndex((o) => o.event_option_name === event_option_name)

        if (controllingIndex !== -1) {
          const controllingField = `option_${controllingIndex}`
          const controllingValue = formValues?.[controllingField]

          const matches = Array.isArray(controllingValue)
            ? controllingValue.some((v) => event_option_values.includes(v))
            : event_option_values.includes(controllingValue)

          visible = show_hide === 'show if' ? matches : !matches
        }
      }

      if (!visible) {
        const fieldName = `event_options.option_${index}`
        if (formValues?.[`option_${index}`] !== undefined) {
          this.props.change(fieldName, undefined)
        }
        return null
      }

      // ✅ render normally
      if (option.event_option_type === 'dropdown') {
        return (
          <div key={`event_options.option_${index}`}>
            <Field
              name={`event_options.option_${index}`}
              component={renderSelectField}
              label={option.event_option_name}
              required={option.event_option_required}
              validate={option.event_option_required ? required : undefined}
              options={option.event_option_values}
            />
          </div>
        )
      }

      if (option.event_option_type === 'checkboxes') {
        const optionList = option.event_option_values.map((v) => ({ value: v, label: v }))
        return (
          <div key={`event_options.option_${index}`}>
            <Field
              name={`event_options.option_${index}`}
              component={renderCheckboxGroup}
              label={option.event_option_name}
              options={optionList}
              inline
              required={option.event_option_required}
              validate={option.event_option_required ? requiredArray : undefined}
            />
          </div>
        )
      }

      if (option.event_option_type === 'radio buttons') {
        const optionList = option.event_option_values.map((v) => ({ value: v, label: v }))
        return (
          <div key={`event_options.option_${index}`}>
            <Field
              name={`event_options.option_${index}`}
              component={renderRadioGroup}
              label={option.event_option_name}
              options={optionList}
              inline
              required={option.event_option_required}
              validate={option.event_option_required ? requiredArray : undefined}
            />
          </div>
        )
      }

      if (option.event_option_type === 'text') {
        return (
          <div key={`event_options.option_${index}`}>
            <Field
              name={`event_options.option_${index}`}
              component={renderTextField}
              label={option.event_option_name}
              required={option.event_option_required}
              validate={option.event_option_required ? required : undefined}
            />
          </div>
        )
      }

      if (option.event_option_type === 'static text') {
        return (
          <div key={`event_options.option_${index}`}>
            <Field name={`event_options.option_${index}`} component={renderStaticTextField} label={option.event_option_name} />
          </div>
        )
      }

      return null
    })
  }

  render() {
    const { show, handleSubmit, eventTemplate, submitting, valid } = this.props

    if (eventTemplate) {
      return (
        <Modal size='md' show={show} onHide={this.handleFormHide}>
          <form onSubmit={handleSubmit(this.handleFormSubmit.bind(this))}>
            <Modal.Header className='bg-light' closeButton>
              <Modal.Title>{eventTemplate.event_value}</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              {this.renderEventOptions()}
              <Field
                name='event_free_text'
                component={renderTextArea}
                label='Additional Text'
                required={eventTemplate.event_free_text_required}
                validate={eventTemplate.event_free_text_required ? required : undefined}
                rows={2}
              />
              Attachments
              <FilePond
                ref={(ref) => (this.pond = ref)}
                allowMultiple={true}
                maxFiles={5}
                acceptedFileTypes={['image/png', 'image/jpeg']}
                server={{
                  url: API_ROOT_URL,
                  process: this.props.event
                    ? {
                        url: IMAGE_ROUTE + '/filepond/process/' + this.props.event.id,
                        ...authorizationHeader()
                      }
                    : null,
                  revert: {
                    url: IMAGE_ROUTE + '/filepond/revert',
                    ...authorizationHeader()
                  }
                }}
                disabled={!this.props.event}
              ></FilePond>
              <Field name='ts' label='Custom Time (UTC)' component={renderDateTimePicker} disabled={this.props.disabled} required={true} />
            </Modal.Body>
            <Modal.Footer>
              <span className='float-end'>
                <Button className='me-1' size='sm' variant='secondary' disabled={submitting} onClick={this.handleFormHide}>
                  Cancel
                </Button>
                {this.props.event ? (
                  <Button size='sm' variant='primary' type='submit' disabled={submitting || !valid}>
                    Submit
                  </Button>
                ) : null}
              </span>
            </Modal.Footer>
          </form>
        </Modal>
      )
    } else {
      return null
    }
  }
}

EventTemplateOptionsModal.propTypes = {
  disabled: PropTypes.bool,
  event: PropTypes.object,
  eventTemplate: PropTypes.object,
  formValues: PropTypes.object,
  handleDeleteEvent: PropTypes.func,
  handleHide: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleUpdateEvent: PropTypes.func,
  change: PropTypes.func.isRequired,
  initialize: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  submitting: PropTypes.bool.isRequired,
  valid: PropTypes.bool.isRequired
}

const validate = (formProps) => {
  const errors = {}

  if (formProps.ts === '') {
    errors.ts = 'Required'
  }

  if (formProps.ts !== '' && !moment.utc(formProps.ts).isValid()) {
    errors.ts = 'Invalid timestamp'
  }

  return errors
}

const mapStateToProps = (state) => {
  const formState = state.form.eventTemplateOptionsModal?.values || {}
  const eo = formState.event_options

  // Normalize event_options to always be an object like:
  // { option_0: value, option_1: value, ... }
  let formValues = {}

  if (Array.isArray(eo)) {
    // Convert array → object
    eo.forEach((v, i) => {
      formValues[`option_${i}`] = v
    })
  } else if (eo && typeof eo === 'object') {
    // Already an object → use as-is
    formValues = eo
  } else {
    // undefined/null → empty object
    formValues = {}
  }

  return {
    formValues
  }
}

export default compose(
  connectModal({ name: 'eventOptions' }),
  reduxForm({
    form: 'eventTemplateOptionsModal',
    validate
  }),
  connect(mapStateToProps)
)(EventTemplateOptionsModal)
