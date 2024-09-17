import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { reduxForm, Field } from 'redux-form'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { renderDateTimePicker, renderTextField, dateFormat } from './form_elements'
import { START_MILESTONE, STOP_MILESTONE, ABORT_MILESTONE, MILESTONES } from '../milestones'
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

    Object.keys(formProps.milestones).forEach((milestone) => {
      formProps.milestones[milestone] =
        formProps.milestones[milestone] && formProps.milestones[milestone]._isAMomentObject
          ? formProps.milestones[milestone].toISOString()
          : moment.utc(formProps.milestones[milestone]).toISOString()
    })

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

    delete lowering_additional_meta.lowering_files

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
            <Col sm={6}>
              <div>
                <strong style={{ fontSize: 'large' }}>Milestones</strong>
              </div>
              <Field
                name='start_ts'
                key='milestones.start_ts'
                component={renderDateTimePicker}
                label={START_MILESTONE.label}
                required={true}
                timeFormat={timeFormat}
                lg={8}
              />
              {MILESTONES.map((milestone) => {
                return (
                  <Field
                    name={'milestones.' + milestone.name}
                    key={milestone.name}
                    component={renderDateTimePicker}
                    label={milestone.label}
                    timeFormat={timeFormat}
                    lg={8}
                  />
                )
              })}
              <Field
                name='stop_ts'
                key='milestone.stop_ts'
                component={renderDateTimePicker}
                label={STOP_MILESTONE.label}
                required={true}
                timeFormat={timeFormat}
                lg={8}
              />
              <Field
                name={'milestones.' + ABORT_MILESTONE.name}
                component={renderDateTimePicker}
                label={ABORT_MILESTONE.label}
                timeFormat={timeFormat}
                lg={8}
              />
            </Col>
            <Col sm={6}>
              <div>
                <strong style={{ fontSize: 'large' }}>Stats</strong>
              </div>
              <Form.Row className='justify-content-sm-center'>
                <Field name='stats.max_depth' component={renderTextField} label='Max Depth' placeholder='in meters' lg={5} md={6} />
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

  function extractMilestoneTS(milestones) {
    const milestone_names = milestones.map((milestone) => milestone.name)
    return milestone_names.map((milestone_name) =>
      Object.prototype.hasOwnProperty.call(formProps.milestones, milestone_name) ? formProps.milestones[milestone_name] : null
    )
  }

  function areDatetimesSequential(dates) {
    function findNextValidIndex(arr, startIndex) {
      for (let i = startIndex + 1; i < arr.length; i++) {
        if (arr[i].isValid()) {
          return i
        }
      }
      return -1 // Return -1 if no valid element is found
    }

    let milestones = {}
    const dateObjects = dates.map((dateStr) => moment.utc(dateStr, dateFormat + ' ' + timeFormat))

    for (let i = 0; i < dateObjects.length - 1; ) {
      const nextIndex = findNextValidIndex(dateObjects, i)
      if (nextIndex < 0) {
        i++
        continue
      }

      if (moment(dateObjects[i]).isAfter(dateObjects[nextIndex])) {
        milestones[MILESTONES[i].name] = 'This milestone is out of sequence.'
        return milestones
      }
      i = nextIndex
    }
    return milestones
  }

  function areDatetimesContained(dates, start, stop) {
    let milestones = {}
    // const dateObjects = dates.map(dateStr => moment.utc(dateStr, dateFormat + ' ' + timeFormat));

    for (let i = 0; i < dates.length; i++) {
      if (dates[i] && dates[i] !== '' && !moment(dates[i]).isBetween(start, stop)) {
        milestones[MILESTONES[i].name] = 'This milestone is outside of start/stop timestamps.'
        return milestones
      }
    }
    return milestones
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

  let dates = extractMilestoneTS(MILESTONES)
  errors.milestones = { ...errors.milestones, ...areDatetimesSequential(dates) }

  if (formProps.start_ts !== '' && formProps.stop_ts !== '') {
    if (moment(formProps.stop_ts).isBefore(formProps.start_ts)) {
      errors.stop_ts = 'Stop timestamp must be later than start timestamp'
    }

    if (formProps.milestones[ABORT_MILESTONE.name] && formProps.milestones[ABORT_MILESTONE.name] !== '') {
      if (!moment(formProps.milestones[ABORT_MILESTONE.name]).isBetween(formProps.start_ts, formProps.stop_ts)) {
        errors.milestones[ABORT_MILESTONE.name] = 'Abort timestamp must be between start and stop timestamps'
      }
    }

    errors.milestones = { ...errors.milestones, ...areDatetimesContained(dates, formProps.start_ts, formProps.stop_ts) }
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
