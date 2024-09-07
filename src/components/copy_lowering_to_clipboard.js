import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import moment from 'moment'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Tooltip, OverlayTrigger } from 'react-bootstrap'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import * as mapDispatchToProps from '../actions'
import { ABORT_MILESTONE, LOWERING_ASCENT, LOWERING_DESCENT } from '../milestones'
import { _Lowering_ } from '../vocab'

class CopyLoweringToClipboard extends Component {
  constructor(props) {
    super(props)

    this.state = {
      text: ''
    }
  }

  componentDidMount() {
    this.copyToClipboard()
  }

  componentDidUpdate(prevProps) {
    if (this.props.lowering !== prevProps.lowering) {
      this.copyToClipboard()
    }
  }

  copyToClipboard() {
    if (this.props.lowering && this.props.lowering.lowering_id) {
      let loweringStartTime = moment.utc(this.props.lowering.start_ts)
      let loweringDescendingTime =
        this.props.lowering.lowering_additional_meta.milestones &&
        this.props.lowering.lowering_additional_meta.milestones[LOWERING_DESCENT[0]]
          ? moment.utc(this.props.lowering.lowering_additional_meta.milestones[LOWERING_DESCENT[0]])
          : null
      let loweringOnBottomTime =
        this.props.lowering.lowering_additional_meta.milestones &&
        this.props.lowering.lowering_additional_meta.milestones[LOWERING_DESCENT[1]]
          ? moment.utc(this.props.lowering.lowering_additional_meta.milestones[LOWERING_DESCENT[1]])
          : null
      let loweringOffBottomTime =
        this.props.lowering.lowering_additional_meta.milestones &&
        this.props.lowering.lowering_additional_meta.milestones[LOWERING_ASCENT[0]]
          ? moment.utc(this.props.lowering.lowering_additional_meta.milestones[LOWERING_ASCENT[0]])
          : null
      let loweringOnSurfaceTime =
        this.props.lowering.lowering_additional_meta.milestones &&
        this.props.lowering.lowering_additional_meta.milestones[LOWERING_ASCENT[1]]
          ? moment.utc(this.props.lowering.lowering_additional_meta.milestones[LOWERING_ASCENT[1]])
          : null
      let loweringStopTime = moment.utc(this.props.lowering.stop_ts)
      let loweringAbortTime =
        this.props.lowering.lowering_additional_meta.milestones &&
        this.props.lowering.lowering_additional_meta.milestones[ABORT_MILESTONE.name]
          ? moment.utc(this.props.lowering.lowering_additional_meta.milestones[ABORT_MILESTONE.name])
          : null

      let deck2DeckDurationValue = loweringStartTime && loweringStopTime ? loweringStopTime.diff(loweringStartTime) : null
      let deploymentDurationValue = loweringStartTime && loweringDescendingTime ? loweringDescendingTime.diff(loweringStartTime) : null
      let decentDurationValue = loweringOnBottomTime && loweringDescendingTime ? loweringOnBottomTime.diff(loweringDescendingTime) : null
      let onBottomDurationValue = loweringOnBottomTime && loweringOffBottomTime ? loweringOffBottomTime.diff(loweringOnBottomTime) : null
      let ascentDurationValue = loweringOffBottomTime && loweringOnSurfaceTime ? loweringOnSurfaceTime.diff(loweringOffBottomTime) : null
      let recoveryDurationValue = loweringStopTime && loweringOnSurfaceTime ? loweringStopTime.diff(loweringOnSurfaceTime) : null

      let text = ''

      text += `${_Lowering_} ID:${' '.repeat(9 - _Lowering_.length)}${this.props.lowering.lowering_id}\n`
      text += this.props.lowering.lowering_additional_meta.lowering_description
        ? `Description: ${this.props.lowering.lowering_additional_meta.lowering_description}\n`
        : ''
      text += '\n'
      text += `Location: ${this.props.lowering.lowering_location}\n`
      text += '\n'
      text += `Start of ${_Lowering_}:${' '.repeat(9 - _Lowering_.length)}${this.props.lowering.start_ts}\n`
      text += loweringDescendingTime
        ? `Descending:        ${this.props.lowering.lowering_additional_meta.milestones[LOWERING_DESCENT[0]]}\n`
        : ''
      text += loweringOnBottomTime
        ? `On Bottom:         ${this.props.lowering.lowering_additional_meta.milestones[LOWERING_DESCENT[1]]}\n`
        : ''
      text += loweringOffBottomTime
        ? `Off Bottom:        ${this.props.lowering.lowering_additional_meta.milestones[LOWERING_ASCENT[0]]}\n`
        : ''
      text += loweringOnSurfaceTime
        ? `On Surface:        ${this.props.lowering.lowering_additional_meta.milestones[LOWERING_ASCENT[1]]}\n`
        : ''
      text += `End of ${_Lowering_}:${' '.repeat(11 - _Lowering_.length)}${this.props.lowering.stop_ts}\n`
      text += '\n'
      text += deck2DeckDurationValue
        ? `Deck-to-Deck: ${moment.duration(deck2DeckDurationValue).format('d [days] h [hours] m [minutes]')}\n`
        : ''
      text += deploymentDurationValue
        ? `Deployment:   ${moment.duration(deploymentDurationValue).format('d [days] h [hours] m [minutes]')}\n`
        : ''
      text += decentDurationValue ? `Decent:       ${moment.duration(decentDurationValue).format('d [days] h [hours] m [minutes]')}\n` : ''
      text += onBottomDurationValue
        ? `On bottom:    ${moment.duration(onBottomDurationValue).format('d [days] h [hours] m [minutes]')}\n`
        : ''
      text += ascentDurationValue ? `Ascent:       ${moment.duration(ascentDurationValue).format('d [days] h [hours] m [minutes]')}\n` : ''
      text += recoveryDurationValue
        ? `Recovery:     ${moment.duration(recoveryDurationValue).format('d [days] h [hours] m [minutes]')}\n`
        : ''
      text += '\n'
      text += loweringAbortTime ? `Aborted: ${loweringAbortTime.format('YYYY-MM-DD HH:mm')}\n\n` : ''

      text +=
        this.props.lowering.lowering_additional_meta.stats && this.props.lowering.lowering_additional_meta.stats.max_depth
          ? `Max Depth:    ${this.props.lowering.lowering_additional_meta.stats.max_depth}m\n`
          : ''
      text +=
        this.props.lowering.lowering_additional_meta.stats && this.props.lowering.lowering_additional_meta.stats.bounding_box
          ? `Bounding Box: ${this.props.lowering.lowering_additional_meta.stats.bounding_box.join(', ')}\n`
          : ''

      this.setState({ text })
    }
  }

  render() {
    return (
      <OverlayTrigger placement='top' overlay={<Tooltip id='copyToClipboardTooltip'>Copy to clipboard</Tooltip>}>
        <CopyToClipboard text={this.state.text}>
          <FontAwesomeIcon icon='clipboard' className='text-primary' fixedWidth />
        </CopyToClipboard>
      </OverlayTrigger>
    )
  }
}

CopyLoweringToClipboard.propTypes = {
  lowering: PropTypes.object
}

export default compose(connect(null, mapDispatchToProps))(CopyLoweringToClipboard)
