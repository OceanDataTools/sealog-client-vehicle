import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { reduxForm, Field } from 'redux-form'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { renderDateTimePicker, renderTextField, dateFormat } from './form_elements'
import moment from 'moment'
import PropTypes from 'prop-types'
import * as mapDispatchToProps from '../actions'

const timeFormat = 'HH:mm:ss.SSS'

class LoweringStatsForm extends Component {
  constructor(props) {
    super(props)
  }

  handleFormSubmit(formProps) {
    formProps.start_ts = formProps.start_ts._isAMomentObject
      ? formProps.start_ts.toISOString()
      : moment.utc(formProps.start_ts).toISOString()
    formProps.stop_ts = formProps.stop_ts._isAMomentObject ? formProps.stop_ts.toISOString() : moment.utc(formProps.stop_ts).toISOString()

    // for (const [key, value] of Object.entries(formProps.milestones)) {
    //   value && value._isAMomentObject ? value.toISOString() : moment.utc(value).toISOString()
    // }

    Object.keys(formProps.milestones).forEach((milestone) => {
      formProps.milestones[milestone] =
        formProps.milestones[milestone] && formProps.milestones[milestone]._isAMomentObject
          ? formProps.milestones[milestone].toISOString()
          : moment.utc(formProps.milestones[milestone]).toISOString()
    })

    // formProps.milestones.lowering_descending =
    //   formProps.milestones.lowering_descending && formProps.milestones.lowering_descending._isAMomentObject
    //   ? formProps.milestones.lowering_descending.toISOString()
    //   : moment.utc(formProps.milestones.lowering_descending).toISOString()
    // formProps.milestones.lowering_on_bottom =
    //   formProps.milestones.lowering_on_bottom && formProps.milestones.lowering_on_bottom._isAMomentObject
    //     ? formProps.milestones.lowering_on_bottom.toISOString()
    //     : moment.utc(formProps.milestones.lowering_on_bottom).toISOString()
    // formProps.milestones.lowering_off_bottom =
    //   formProps.milestones.lowering_off_bottom && formProps.milestones.lowering_off_bottom._isAMomentObject
    //     ? formProps.milestones.lowering_off_bottom.toISOString()
    //     : moment.utc(formProps.milestones.lowering_off_bottom).toISOString()
    // formProps.milestones.lowering_on_surface =
    //   formProps.milestones.lowering_on_surface && formProps.milestones.lowering_on_surface._isAMomentObject
    //     ? formProps.milestones.lowering_on_surface.toISOString()
    //     : moment.utc(formProps.milestones.lowering_on_surface).toISOString()
    // formProps.milestones.lowering_aborted =
    //   formProps.milestones.lowering_aborted && formProps.milestones.lowering_aborted._isAMomentObject
    //     ? formProps.milestones.lowering_aborted.toISOString()
    //     : moment.utc(formProps.milestones.lowering_aborted).toISOString()

    if (
      (formProps.stats.bounding_box.bbox_north == null || formProps.stats.bounding_box.bbox_north == '') &&
      (formProps.stats.bounding_box.bbox_east == null || formProps.stats.bounding_box.bbox_east == '') &&
      (formProps.stats.bounding_box.bbox_south == null || formProps.stats.bounding_box.bbox_south == '') &&
      (formProps.stats.bounding_box.bbox_west == null || formProps.stats.bounding_box.bbox_west == '')
    ) {
      formProps.stats.bounding_box = []
    } else {
      formProps.stats.bounding_box = [
        formProps.stats.bounding_box.bbox_north,
        formProps.stats.bounding_box.bbox_east,
        formProps.stats.bounding_box.bbox_south,
        formProps.stats.bounding_box.bbox_west
      ]
    }

    const lowering_additional_meta = {
      ...this.props.lowering.lowering_additional_meta,
      milestones: formProps.milestones,
      stats: formProps.stats
    }

    this.props.handleFormSubmit({
      ...this.props.lowering,
      start_ts: formProps.start_ts,
      stop_ts: formProps.stop_ts,
      lowering_additional_meta
    })
  }

  render() {
    const { handleSubmit, submitting, valid, pristine } = this.props

    if (this.props.roles && (this.props.roles.includes('admin') || this.props.roles.includes('cruise_manager'))) {
      return (
        <Form onSubmit={handleSubmit(this.handleFormSubmit.bind(this))}>
          <Row>
            <Col className='px-1' sm={6}>
              <Form.Row className='justify-content-sm-center'>
                <Field
                  name='start_ts'
                  component={renderDateTimePicker}
                  label='Off Deck Date/Time (UTC)'
                  required={true}
                  timeFormat={timeFormat}
                  sm={11}
                  md={11}
                  lg={7}
                />
              </Form.Row>
              <Form.Row className='justify-content-sm-center'>
                <Field
                  name='milestones.lowering_descending'
                  component={renderDateTimePicker}
                  label='Descending Date/Time (UTC)'
                  timeFormat={timeFormat}
                  sm={11}
                  md={11}
                  lg={7}
                />
              </Form.Row>
              <Form.Row className='justify-content-sm-center'>
                <Field
                  name='milestones.lowering_on_bottom'
                  component={renderDateTimePicker}
                  label='On Bottom Date/Time (UTC)'
                  timeFormat={timeFormat}
                  sm={11}
                  md={11}
                  lg={7}
                />
              </Form.Row>
              <Form.Row className='justify-content-sm-center'>
                <Field
                  name='milestones.lowering_off_bottom'
                  component={renderDateTimePicker}
                  label='Off Bottom Date/Time (UTC)'
                  timeFormat={timeFormat}
                  sm={11}
                  md={11}
                  lg={7}
                />
              </Form.Row>
              <Form.Row className='justify-content-sm-center'>
                <Field
                  name='milestones.lowering_on_surface'
                  component={renderDateTimePicker}
                  label='On Surface Date/Time (UTC)'
                  timeFormat={timeFormat}
                  sm={11}
                  md={11}
                  lg={7}
                />
              </Form.Row>
              <Form.Row className='justify-content-sm-center'>
                <Field
                  name='stop_ts'
                  component={renderDateTimePicker}
                  label='On Deck/Stop Date/Time (UTC)'
                  required={true}
                  timeFormat={timeFormat}
                  sm={11}
                  md={11}
                  lg={7}
                />
              </Form.Row>
              <Form.Row className='justify-content-sm-center'>
                <Field
                  name='milestones.lowering_aborted'
                  component={renderDateTimePicker}
                  label='Aborted Date/Time (UTC)'
                  timeFormat={timeFormat}
                  sm={11}
                  md={11}
                  lg={7}
                />
              </Form.Row>
            </Col>
            <Col className='px-1' sm={6}>
              <Form.Row className='justify-content-sm-center'>
                <Field name='stats.max_depth' component={renderTextField} label='Max Depth' placeholder='in meters' lg={5} md={7} sm={7} />
              </Form.Row>
              <Form.Row className='justify-content-sm-center'>
                <Field name='stats.bounding_box.bbox_north' component={renderTextField} label='North' placeholder='in ddeg' lg={5} md={6} />
              </Form.Row>
              <Form.Row className='justify-content-sm-center'>
                <Field name='stats.bounding_box.bbox_west' component={renderTextField} label='West' placeholder='in ddeg' lg={5} md={6} />
                <Field name='stats.bounding_box.bbox_east' component={renderTextField} label='East' placeholder='in ddeg' lg={5} md={6} />
              </Form.Row>
              <Form.Row className='justify-content-sm-center'>
                <Field name='stats.bounding_box.bbox_south' component={renderTextField} label='South' placeholder='in ddeg' lg={5} md={6} />
              </Form.Row>
            </Col>
          </Row>
          <Row>
            <Col xs={12}>
              <div className='float-right'>
                <Button className='mr-1' variant='secondary' size='sm' onClick={this.props.handleHide}>
                  Cancel
                </Button>
                <Button variant='warning' size='sm' type='submit' disabled={pristine || submitting || !valid}>
                  Done
                </Button>
              </div>
            </Col>
          </Row>
        </Form>
      )
    } else {
      return <div>What are YOU doing here?</div>
    }
  }
}

LoweringStatsForm.propTypes = {
  handleFormSubmit: PropTypes.func.isRequired,
  handleHide: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  lowering: PropTypes.object.isRequired,
  pristine: PropTypes.bool.isRequired,
  roles: PropTypes.array,
  submitting: PropTypes.bool.isRequired,
  valid: PropTypes.bool.isRequired
}

const validate = (formProps) => {
  const errors = { milestones: {}, stats: {} }

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
    if (
      moment.utc(formProps.stop_ts, dateFormat + ' ' + timeFormat).isBefore(moment.utc(formProps.start_ts, dateFormat + ' ' + timeFormat))
    ) {
      errors.stop_ts = 'Stop date must be later than start date'
    }
  }

  if (
    formProps.milestones.lowering_off_bottom &&
    formProps.milestones.lowering_off_bottom !== '' &&
    moment.utc(formProps.stop_ts, dateFormat + ' ' + timeFormat).isBefore(moment.utc(formProps.stop_ts, dateFormat + ' ' + timeFormat))
  ) {
    errors.milestones.lowering_off_bottom = 'Off bottom date must be before stop date'
  }

  if (
    formProps.milestones.lowering_on_surface &&
    formProps.milestones.lowering_on_surface !== '' &&
    moment
      .utc(formProps.milestones.lowering_on_surface, dateFormat + ' ' + timeFormat)
      .isBefore(moment.utc(formProps.milestones.lowering_off_bottom, dateFormat + ' ' + timeFormat))
  ) {
    errors.milestones.lowering_on_surface = 'On surface date must be after off bottom date'
  }

  if (
    formProps.milestones.lowering_off_bottom &&
    formProps.milestones.lowering_off_bottom !== '' &&
    moment
      .utc(formProps.milestones.lowering_off_bottom, dateFormat + ' ' + timeFormat)
      .isBefore(moment.utc(formProps.milestones.lowering_on_bottom, dateFormat + ' ' + timeFormat))
  ) {
    errors.milestones.lowering_off_bottom = 'Off bottom date must be after on bottom date'
  }

  if (
    formProps.milestones.lowering_on_bottom &&
    formProps.milestones.lowering_on_bottom !== '' &&
    moment
      .utc(formProps.milestones.lowering_on_bottom, dateFormat + ' ' + timeFormat)
      .isBefore(moment.utc(formProps.milestones.lowering_descending, dateFormat + ' ' + timeFormat))
  ) {
    errors.milestones.lowering_on_bottom = 'On bottom date must be after descending date'
  }

  if (
    formProps.milestones.lowering_descending &&
    formProps.milestones.lowering_descending !== '' &&
    moment
      .utc(formProps.milestones.lowering_descending, dateFormat + ' ' + timeFormat)
      .isBefore(moment.utc(formProps.start, dateFormat + ' ' + timeFormat))
  ) {
    errors.milestones.lowering_descending = 'Descending date must be after off_deck date'
  }

  if (
    formProps.milestones.lowering_on_bottom &&
    formProps.milestones.lowering_on_bottom !== '' &&
    formProps.milestones.lowering_off_bottom &&
    formProps.milestones.lowering_off_bottom !== ''
  ) {
    if (
      moment
        .utc(formProps.milestones.lowering_off_bottom, dateFormat + ' ' + timeFormat)
        .isBefore(moment.utc(formProps.milestones.lowering_on_bottom, dateFormat + ' ' + timeFormat))
    ) {
      errors.milestones.lowering_on_bottom = 'Off bottom date must be later than on bottom date'
      errors.milestones.lowering_off_bottom = 'Off bottom date must be later than on bottom date'
    }
  }

  if (!(formProps.stats.max_depth >= 0)) {
    errors.stats.max_depth = 'Must be a positive floating point number'
  }

  if (!(formProps.stats.bounding_boxbbox_north >= -60 && formProps.stats.bounding_boxbbox_north <= 60)) {
    errors.stats.bounding_boxbbox_north = 'Must be a number between +/- 60'
  }

  if (!(formProps.stats.bounding_boxbbox_east >= -180 && formProps.stats.bounding_boxbbox_east <= 180)) {
    errors.stats.bounding_boxbbox_east = 'Must be a number between +/- 180'
  }

  if (!(formProps.stats.bounding_boxbbox_south >= -60 && formProps.stats.bounding_boxbbox_south <= 60)) {
    errors.stats.bounding_boxbbox_south = 'Must be a number between +/- 60'
  }

  if (!(formProps.stats.bounding_boxbbox_west >= -180 && formProps.stats.bounding_boxbbox_west <= 180)) {
    errors.stats.bounding_boxbbox_west = 'Must be a number between +/- 180'
  }

  return errors
}

const mapStateToProps = (state) => {
  const max_depth =
    state.lowering.lowering.lowering_additional_meta.stats && state.lowering.lowering.lowering_additional_meta.stats.max_depth
      ? state.lowering.lowering.lowering_additional_meta.stats.max_depth
      : null

  const bounding_box =
    state.lowering.lowering.lowering_additional_meta.stats && state.lowering.lowering.lowering_additional_meta.stats.bounding_box
      ? state.lowering.lowering.lowering_additional_meta.stats.bounding_box
      : [null, null, null, null]

  const initialValues = {
    start_ts: state.lowering.lowering.start_ts,
    stop_ts: state.lowering.lowering.stop_ts,
    milestones: state.lowering.lowering.lowering_additional_meta.milestones || {},
    stats: {
      max_depth: max_depth,
      bounding_box: {
        bbox_north: bounding_box[0],
        bbox_east: bounding_box[1],
        bbox_south: bounding_box[2],
        bbox_west: bounding_box[3]
      }
    }
  }

  return {
    initialValues,
    lowering: state.lowering.lowering,
    roles: state.user.profile.roles
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  reduxForm({
    form: 'editLoweringStats',
    validate: validate
  })
)(LoweringStatsForm)
