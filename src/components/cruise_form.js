import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { reduxForm, Field, change } from 'redux-form'
import { Button, Card, Form } from 'react-bootstrap'
import { renderAlert, renderDatePicker, renderMessage, renderTextField, renderTextArea, dateFormat } from './form_elements'
import moment from 'moment'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { FilePond } from 'react-filepond'
import CopyCruiseToClipboard from './copy_cruise_to_clipboard'
import { authorizationHeader, handle_cruise_file_delete, handle_cruise_file_download, CRUISE_ROUTE } from '../api'
import { API_ROOT_URL, CRUISE_ID_PLACEHOLDER, CRUISE_ID_REGEX, DEFAULT_VESSEL } from '../client_settings'
import { _Cruise_, _cruise_ } from '../vocab'

import * as mapDispatchToProps from '../actions'

class CruiseForm extends Component {
  constructor(props) {
    super(props)

    this.state = {
      filepondPristine: true
    }
  }

  componentWillUnmount() {
    this.props.leaveCruiseForm()
  }

  handleFileDeleteModal(file) {
    this.props.showModal('deleteFile', {
      file: file,
      handleDelete: (file) =>
        handle_cruise_file_delete(file, this.props.cruise.id, () => {
          this.props.initCruise(this.props.cruise.id)
        })
    })
  }

  handleFormSubmit(formProps) {
    formProps.cruise_additional_meta.cruise_name = formProps.cruise_additional_meta.cruise_name || ''
    formProps.cruise_location = formProps.cruise_location || ''
    formProps.cruise_hidden = formProps.cruise_hidden || false
    formProps.cruise_additional_meta.cruise_description = formProps.cruise_additional_meta.cruise_description || ''

    formProps.cruise_tags = formProps.cruise_tags || []
    if (typeof formProps.cruise_tags === 'string') {
      formProps.cruise_tags = formProps.cruise_tags
        .trim()
        .split(',')
        .map((string) => {
          return string.trim()
        })
    }

    const end_of_stop_ts = moment.utc(formProps.stop_ts)
    end_of_stop_ts.set({
      hour: 23,
      minute: 59,
      second: 59
    })
    formProps.stop_ts = end_of_stop_ts.toISOString()

    formProps.cruise_additional_meta.cruise_participants = formProps.cruise_additional_meta.cruise_participants || []
    if (typeof formProps.cruise_additional_meta.cruise_participants === 'string') {
      formProps.cruise_additional_meta.cruise_participants = formProps.cruise_additional_meta.cruise_participants
        .trim()
        .split(',')
        .map((string) => {
          return string.trim()
        })
    }

    formProps.cruise_additional_meta.cruise_files = this.pond.getFiles().map((file) => file.serverId)

    if (formProps.id) {
      this.props.updateCruise(formProps)
    } else {
      this.props.createCruise(formProps)
    }

    this.pond.removeFiles()
    this.props.handleFormSubmit()
  }

  renderFiles() {
    if (this.props.cruise.cruise_additional_meta && this.props.cruise.cruise_additional_meta.cruise_files) {
      let files = this.props.cruise.cruise_additional_meta.cruise_files.map((file, index) => {
        return (
          <div className='pl-2' key={`file_${index}`}>
            <a className='text-decoration-none' href='#' onClick={() => handle_cruise_file_download(file, this.props.cruise.id)}>
              {file}
            </a>{' '}
            <FontAwesomeIcon onClick={() => this.handleFileDeleteModal(file)} className='text-danger' icon='trash' fixedWidth />
          </div>
        )
      })

      return <div className='mb-2'>{files}</div>
    }

    return null
  }

  render() {
    const { handleSubmit, pristine, reset, submitting, valid } = this.props
    const formHeader = (
      <div>
        {this.props.cruise.id ? 'Update' : 'Add'} {_Cruise_}
        <span className='float-right'>{this.props.cruise.id ? <CopyCruiseToClipboard cruise={this.props.cruise} /> : null}</span>
      </div>
    )

    if (
      (this.props.roles && this.props.roles.some((item) => ['admin'].includes(item))) ||
      (this.props.cruise.id && this.props.roles && this.props.roles.some((item) => ['cruise_manager'].includes(item)))
    ) {
      const not_admin = !this.props.roles.includes('admin')
      return (
        <Card className='border-secondary'>
          <Card.Header>{formHeader}</Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit(this.handleFormSubmit.bind(this))}>
              <Form.Row>
                <Field
                  name='cruise_id'
                  component={renderTextField}
                  label={`${_Cruise_} ID`}
                  placeholder={CRUISE_ID_PLACEHOLDER ? CRUISE_ID_PLACEHOLDER : 'i.e. CS2001'}
                  required={true}
                  disabled={not_admin}
                  sm={6}
                  lg={6}
                />
                <Field
                  name='cruise_additional_meta.cruise_name'
                  component={renderTextField}
                  label={`${_Cruise_} Name`}
                  placeholder='i.e. Lost City 2018'
                  sm={6}
                  lg={6}
                />
                <Field
                  name='cruise_additional_meta.cruise_vessel'
                  component={renderTextField}
                  label='Vessel Name'
                  placeholder='i.e. R/V Discovery'
                  required={true}
                  disabled={not_admin}
                  sm={6}
                  lg={6}
                />
                <Field
                  name='cruise_additional_meta.cruise_pi'
                  component={renderTextField}
                  label='Primary Investigator'
                  placeholder='i.e. Dr. Susan Lang'
                  required={true}
                  disabled={not_admin}
                  sm={6}
                  lg={6}
                />
                <Field
                  name='cruise_location'
                  component={renderTextField}
                  label={`${_Cruise_} Location`}
                  placeholder='i.e. Lost City, Mid Atlantic Ridge'
                />
              </Form.Row>
              <Form.Row>
                <Field
                  name='cruise_additional_meta.cruise_description'
                  component={renderTextArea}
                  label={`${_Cruise_} Description`}
                  placeholder={`i.e. A brief description of the ${_cruise_}`}
                  rows={8}
                />
              </Form.Row>
              <Form.Row>
                <Field
                  name='start_ts'
                  component={renderDatePicker}
                  label='Start Date (UTC)'
                  required={true}
                  disabled={not_admin}
                  sm={6}
                  lg={6}
                />
                <Field
                  name='stop_ts'
                  component={renderDatePicker}
                  label='Stop Date (UTC)'
                  required={true}
                  disabled={not_admin}
                  sm={6}
                  lg={6}
                />
              </Form.Row>
              <Form.Row>
                <Field
                  name='cruise_additional_meta.cruise_departure_location'
                  component={renderTextField}
                  label='Departure Port'
                  placeholder='i.e. Norfolk, VA'
                  required={true}
                  disabled={not_admin}
                  sm={6}
                  lg={6}
                />
                <Field
                  name='cruise_additional_meta.cruise_arrival_location'
                  component={renderTextField}
                  label='Arrival Port'
                  placeholder="i.e. St. George's, Bermuda"
                  required={true}
                  disabled={not_admin}
                  sm={6}
                  lg={6}
                />
              </Form.Row>
              <Form.Row>
                <Field
                  name='cruise_additional_meta.cruise_participants'
                  component={renderTextArea}
                  label={`${_Cruise_} Participants, comma delimited`}
                  placeholder='i.e. Dave Butterfield,Sharon Walker'
                  rows={2}
                />
                <Field
                  name='cruise_tags'
                  component={renderTextArea}
                  label={`${_Cruise_} Tags, comma delimited`}
                  placeholder='i.e. coral,chemistry,engineering'
                  rows={2}
                />
              </Form.Row>
              <Form.Label>{_Cruise_} Files</Form.Label>
              {this.renderFiles()}
              <FilePond
                ref={(ref) => (this.pond = ref)}
                allowMultiple={true}
                maxFiles={5}
                server={{
                  url: API_ROOT_URL,
                  process: {
                    url: CRUISE_ROUTE + '/filepond/process/' + this.props.cruise.id,
                    ...authorizationHeader()
                  },
                  revert: {
                    url: CRUISE_ROUTE + '/filepond/revert',
                    ...authorizationHeader()
                  }
                }}
                onupdatefiles={() => {
                  this.props.dispatch(change('editCruise', 'cruise_additional_meta.cruise_files', true))
                }}
                disabled={this.props.cruise.id ? false : true}
              ></FilePond>
              {renderAlert(this.props.errorMessage)}
              {renderMessage(this.props.message)}
              <Form.Row className='float-right'>
                <Button className='mr-1' variant='secondary' size='sm' disabled={pristine || submitting} onClick={reset}>
                  Reset Values
                </Button>
                <Button
                  variant='primary'
                  size='sm'
                  type='submit'
                  disabled={(submitting || !valid || pristine) && this.state.filepondPristine}
                >
                  {this.props.cruise.id ? 'Update' : 'Add'}
                </Button>
              </Form.Row>
            </Form>
          </Card.Body>
        </Card>
      )
    } else {
      return null
    }
  }
}

CruiseForm.propTypes = {
  createCruise: PropTypes.func.isRequired,
  cruise: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
  errorMessage: PropTypes.string.isRequired,
  handleFormSubmit: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  initCruise: PropTypes.func.isRequired,
  leaveCruiseForm: PropTypes.func.isRequired,
  message: PropTypes.string.isRequired,
  pristine: PropTypes.bool.isRequired,
  reset: PropTypes.func.isRequired,
  roles: PropTypes.array,
  showModal: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  updateCruise: PropTypes.func.isRequired,
  valid: PropTypes.bool.isRequired
}

const validate = (formProps) => {
  const errors = { cruise_additional_meta: {} }

  if (!formProps.cruise_id) {
    errors.cruise_id = 'Required'
  } else if (formProps.cruise_id.length > 15) {
    errors.cruise_id = 'Must be 15 characters or less'
  }

  if (!formProps.cruise_additional_meta.cruise_vessel) {
    errors.cruise_additional_meta.cruise_vessel = 'Required'
  }

  if (!formProps.cruise_additional_meta.cruise_pi) {
    errors.cruise_additional_meta.cruise_pi = 'Required'
  }

  if (formProps.start_ts === '') {
    errors.start_ts = 'Required'
  } else if (!moment.utc(formProps.start_ts).isValid()) {
    errors.start_ts = 'Invalid timestamp'
  }

  if (formProps.stop_ts === '') {
    errors.stop_ts = 'Required'
  } else if (!moment.utc(formProps.stop_ts).isValid()) {
    errors.stop_ts = 'Invalid timestamp'
  }

  if (formProps.start_ts !== '' && formProps.stop_ts !== '') {
    if (moment(formProps.stop_ts, dateFormat).isBefore(moment(formProps.start_ts, dateFormat))) {
      errors.stop_ts = 'Stop date must be later than start data'
    }
  }

  if (!formProps.cruise_additional_meta.cruise_departure_location) {
    errors.cruise_additional_meta.cruise_departure_location = 'Required'
  }

  if (!formProps.cruise_additional_meta.cruise_arrival_location) {
    errors.cruise_additional_meta.cruise_arrival_location = 'Required'
  }

  if (typeof formProps.cruise_tags === 'string') {
    if (formProps.cruise_tags === '') {
      formProps.cruise_tags = []
    } else {
      formProps.cruise_tags = formProps.cruise_tags.split(',')
    }
  }

  if (typeof formProps.cruise_additional_meta.cruise_participants === 'string') {
    if (formProps.cruise_additional_meta.cruise_participants === '') {
      formProps.cruise_additional_meta.cruise_participants = []
    } else {
      formProps.cruise_additional_meta.cruise_participants = formProps.cruise_additional_meta.cruise_participants.split(',')
    }
  }

  return errors
}

const warn = (formProps) => {
  const warnings = {}

  if (formProps.cruise_id && CRUISE_ID_REGEX && !formProps.cruise_id.match(CRUISE_ID_REGEX)) {
    warnings.cruise_id = 'Non-standard ID'
  }

  return warnings
}

const mapStateToProps = (state) => {
  let initialValues = {
    ...{ cruise_additional_meta: { cruise_vessel: DEFAULT_VESSEL } },
    ...state.cruise.cruise
  }

  return {
    errorMessage: state.cruise.cruise_error,
    message: state.cruise.cruise_message,
    initialValues,
    cruise: state.cruise.cruise,
    roles: state.user.profile.roles
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  reduxForm({
    form: 'editCruise',
    enableReinitialize: true,
    validate: validate,
    warn: warn
  })
)(CruiseForm)
