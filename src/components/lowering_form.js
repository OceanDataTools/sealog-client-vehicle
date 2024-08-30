import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { reduxForm, Field, change } from 'redux-form'
import { Button, Card, Form } from 'react-bootstrap'
import { renderAlert, renderDateTimePicker, renderMessage, renderTextField, renderTextArea } from './form_elements'
import moment from 'moment'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { FilePond } from 'react-filepond'
import CopyLoweringToClipboard from './copy_lowering_to_clipboard'
import { authorizationHeader, handle_lowering_file_delete, handle_lowering_file_download, LOWERING_ROUTE } from '../api'
import { API_ROOT_URL, LOWERING_ID_PLACEHOLDER, LOWERING_ID_REGEX } from '../client_settings'
import { _Lowering_ } from '../vocab'

import * as mapDispatchToProps from '../actions'

const dateFormat = 'YYYY-MM-DD'
const timeFormat = 'HH:mm'

class LoweringForm extends Component {
  constructor(props) {
    super(props)

    this.state = {
      filepondPristine: true
    }

    this.handleSetLoweringStatsModal = this.handleSetLoweringStatsModal.bind(this)
  }

  componentWillUnmount() {
    this.props.leaveLoweringForm()
  }

  handleFileDeleteModal(file) {
    this.props.showModal('deleteFile', {
      file: file,
      handleDelete: (file) =>
        handle_lowering_file_delete(file, this.props.lowering.id, () => {
          this.props.initLowering(this.props.lowering.id)
        })
    })
  }

  handleFormSubmit(formProps) {
    formProps.lowering_location = formProps.lowering_location || ''
    formProps.lowering_hidden = formProps.lowering_hidden || false
    formProps.lowering_additional_meta.lowering_description = formProps.lowering_additional_meta.lowering_description || ''

    formProps.lowering_tags = formProps.lowering_tags || []
    if (typeof formProps.lowering_tags === 'string') {
      formProps.lowering_tags = formProps.lowering_tags
        .trim()
        .split(',')
        .map((string) => {
          return string.trim()
        }).filter((tag) => {
          return (tag !== "")? tag : null
        })
    }

    formProps.lowering_additional_meta.lowering_files = this.pond.getFiles().map((file) => file.serverId)

    if (formProps.id) {
      this.props.updateLowering(formProps)
    } else {
      this.props.createLowering(formProps)
    }

    this.pond.removeFiles()
    this.props.handleFormSubmit()
  }

  renderFiles() {
    if (this.props.lowering.lowering_additional_meta && this.props.lowering.lowering_additional_meta.lowering_files) {
      let files = this.props.lowering.lowering_additional_meta.lowering_files.map((file, index) => {
        return (
          <div className='pl-2' key={`file_${index}`}>
            <a className='text-decoration-none' href='#' onClick={() => handle_lowering_file_download(file, this.props.lowering.id)}>
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

  handleSetLoweringStatsModal() {
    this.props.showModal('setLoweringStats', { lowering: this.props.lowering, handleLoweringForm: this.handleFormSubmit })
  }

  render() {
    const { handleSubmit, pristine, reset, submitting, valid } = this.props
    const formHeader = (
      <div>
        {this.props.lowering.id ? 'Update' : 'Add'} {_Lowering_}
        <span className='float-right'>{this.props.lowering.id ? <CopyLoweringToClipboard lowering={this.props.lowering} /> : null}</span>
      </div>
    )

    if (
      (this.props.roles && this.props.roles.some((item) => ['admin'].includes(item))) ||
      (this.props.lowering.id && this.props.roles && this.props.roles.some((item) => ['cruise_manager'].includes(item)))
    ) {
      const not_admin = !this.props.roles.includes('admin')
      return (
        <Card className='border-secondary'>
          <Card.Header>{formHeader}</Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit(this.handleFormSubmit.bind(this))}>
              <Form.Row>
                <Field
                  name='lowering_id'
                  component={renderTextField}
                  label={`${_Lowering_} ID`}
                  placeholder={LOWERING_ID_PLACEHOLDER ? LOWERING_ID_PLACEHOLDER : 'i.e. ROV-0042'}
                  required={true}
                  disabled={not_admin}
                  sm={6}
                  lg={6}
                />
                <Field
                  name='lowering_location'
                  component={renderTextField}
                  label={`${_Lowering_} Location`}
                  placeholder='i.e. Kelvin Seamount'
                  sm={6}
                  lg={6}
                />
              </Form.Row>
              <Form.Row>
                <Field
                  name='lowering_additional_meta.lowering_description'
                  component={renderTextArea}
                  label={`${_Lowering_} Description`}
                  placeholder={`i.e. A brief description of the ${_Lowering_}`}
                  rows={8}
                />
              </Form.Row>
              <Form.Row>
                <Field
                  name='start_ts'
                  component={renderDateTimePicker}
                  label='Start Date/Time (UTC)'
                  required={true}
                  disabled={not_admin}
                  sm={6}
                  lg={6}
                />
                <Field
                  name='stop_ts'
                  component={renderDateTimePicker}
                  label='Stop Date/Time (UTC)'
                  required={true}
                  disabled={not_admin}
                  sm={6}
                  lg={6}
                />
              </Form.Row>
              <Form.Row>
                <Field
                  name='lowering_tags'
                  component={renderTextArea}
                  label={`${_Lowering_} Tags, comma delimited`}
                  placeholder='i.e. coral,chemistry,engineering'
                  rows={2}
                />
              </Form.Row>
              <Form.Label>{_Lowering_} Files</Form.Label>
              {this.renderFiles()}
              <FilePond
                ref={(ref) => (this.pond = ref)}
                allowMultiple={true}
                maxFiles={5}
                server={{
                  url: API_ROOT_URL,
                  process: {
                    url: LOWERING_ROUTE + '/filepond/process/' + this.props.lowering.id,
                    ...authorizationHeader()
                  },
                  revert: {
                    url: LOWERING_ROUTE + '/filepond/revert',
                    ...authorizationHeader()
                  }
                }}
                onupdatefiles={() => {
                  this.props.dispatch(change('editLowering', 'lowering_additional_meta.lowering_files', true))
                }}
                disabled={this.props.lowering.id ? false : true}
              ></FilePond>
              {renderAlert(this.props.errorMessage)}
              {renderMessage(this.props.message)}
              <Form.Row className='float-right'>
                {this.props.lowering.id ? (
                  <Button className='mr-1' variant='warning' size='sm' onClick={this.handleSetLoweringStatsModal}>
                    Milestones
                  </Button>
                ) : null}
                <Button className='mr-1' variant='secondary' size='sm' disabled={pristine || submitting} onClick={reset}>
                  Reset Values
                </Button>
                <Button
                  variant='primary'
                  size='sm'
                  type='submit'
                  disabled={(submitting || !valid || pristine) && this.state.filepondPristine}
                >
                  {this.props.lowering.id ? 'Update' : 'Add'}
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

LoweringForm.propTypes = {
  createLowering: PropTypes.func.isRequired,
  lowering: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
  errorMessage: PropTypes.string.isRequired,
  handleFormSubmit: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  initLowering: PropTypes.func.isRequired,
  leaveLoweringForm: PropTypes.func.isRequired,
  message: PropTypes.string.isRequired,
  pristine: PropTypes.bool.isRequired,
  reset: PropTypes.func.isRequired,
  roles: PropTypes.array,
  showModal: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  updateLowering: PropTypes.func.isRequired,
  valid: PropTypes.bool.isRequired
}

const validate = (formProps) => {
  const errors = {}

  if (!formProps.lowering_id) {
    errors.lowering_id = 'Required'
  } else if (formProps.lowering_id.length > 15) {
    errors.lowering_id = 'Must be 15 characters or less'
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
    if (moment(formProps.stop_ts, dateFormat + ' ' + timeFormat).isBefore(moment(formProps.start_ts, dateFormat + ' ' + timeFormat))) {
      errors.stop_ts = 'Stop date must be later than start data'
    }
  }

  return errors
}

const warn = (formProps) => {
  const warnings = {}

  if (formProps.lowering_id && LOWERING_ID_REGEX && !formProps.lowering_id.match(LOWERING_ID_REGEX)) {
    warnings.lowering_id = 'Non-standard ID'
  }

  return warnings
}

const mapStateToProps = (state) => {
  let initialValues = {
    ...{ lowering_additional_meta: {} },
    ...state.lowering.lowering
  }

  return {
    errorMessage: state.lowering.lowering_error,
    message: state.lowering.lowering_message,
    initialValues,
    lowering: state.lowering.lowering,
    roles: state.user.profile.roles
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  reduxForm({
    form: 'editLowering',
    enableReinitialize: true,
    validate: validate,
    warn: warn
  })
)(LoweringForm)
