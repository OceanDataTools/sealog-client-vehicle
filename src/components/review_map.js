import React, { Component } from 'react'
import { connect } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import moment from 'moment'
import { ButtonToolbar, Row, Col, Card, Tooltip, OverlayTrigger, ListGroup } from 'react-bootstrap'
import PropTypes from 'prop-types'
import Slider from 'rc-slider'
import CustomPagination from './custom_pagination'
import TracklineMap from './trackline_map'
import EventCommentModal from './event_comment_modal'
import EventFilterForm from './event_filter_form'
import EventShowDetailsModal from './event_show_details_modal'
import ExportDropdown from './export_dropdown'
import ReviewDropdown from './review_dropdown'
import { get_cruise_by_lowering } from '../api'
import * as mapDispatchToProps from '../actions'

const SliderWithTooltip = Slider.createSliderWithTooltip(Slider)

const maxEventsPerPage = 10

class ReviewMap extends Component {
  constructor(props) {
    super(props)

    this.state = {
      fetching: false,

      posDataSource: null,

      replayEventIndex: 0,
      activePage: 1,
      sliderTimer: null
    }

    this.sliderRef = React.createRef() // Reference to the slider

    this.handleReviewModeSelect = this.handleReviewModeSelect.bind(this)
    this.handleEventClick = this.handleEventClick.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handlePageSelect = this.handlePageSelect.bind(this)
    this.handleSliderChange = this.handleSliderChange.bind(this)
    this.handleSliderChangeComplete = this.handleSliderChangeComplete.bind(this)
    this.sliderTooltipFormatter = this.sliderTooltipFormatter.bind(this)
    this.toggleASNAP = this.toggleASNAP.bind(this)
    this.updateEventFilter = this.updateEventFilter.bind(this)
  }

  async componentDidMount() {
    if (!this.props.lowering.id || this.props.lowering.id !== this.props.match.params.id || this.props.event.events.length === 0) {
      this.props.initReviewReplay(this.props.match.params.id)
      const cruise = await get_cruise_by_lowering(this.props.match.params.id)
      this.props.initCruise(cruise.id)
    } else {
      const eventIndex = this.props.event.events.findIndex((event) => event.id === this.props.event.selected_event.id)
      this.setState({
        replayEventIndex: eventIndex,
        activePage: Math.ceil((eventIndex + 1) / maxEventsPerPage)
      })
    }

    document.addEventListener('keydown', this.handleKeyDown)
  }

  componentWillUnmount() {
    if (this.state.replayTimer) {
      clearInterval(this.state.replayTimer)
    }

    document.removeEventListener('keydown', this.handleKeyDown)
  }

  updateEventFilter(filter = {}) {
    this.setState({ activePage: 1, replayEventIndex: 0 })
    this.props.updateEventFilterForm(filter)
    this.props.eventUpdateReviewReplay()
  }

  toggleASNAP() {
    this.props.toggleASNAP()
    this.setState({ replayEventIndex: 0 })
    this.props.eventUpdateReviewReplay()
    this.setState({ activePage: 1 })
  }

  sliderTooltipFormatter(v) {
    if (this.props.event.events && this.props.event.events[v]) {
      return moment.utc(this.props.event.events[v].ts).format('MM/DD HH:mm')
    }

    return ''
  }

  handleSliderChange(index) {
    if (this.props.event.events && this.props.event.events[index]) {
      this.setState({ replayEventIndex: index })
      clearTimeout(this.state.sliderTimer)
      this.setState({
        sliderTimer: setTimeout(() => {
          this.props.advanceReviewReplayTo(this.props.event.events[index].id)
          this.setState({
            activePage: Math.ceil((index + 1) / maxEventsPerPage)
          })
        }, 250)
      })
    }
  }

  handleEventClick(index) {
    this.setState({ replayEventIndex: index })
    this.props.advanceReviewReplayTo(this.props.event.events[index].id)
    if (this.props.event.events && this.props.event.events.length > index) {
      this.setState({ activePage: Math.ceil((index + 1) / maxEventsPerPage) })
    }
  }

  handleEventCommentModal(index) {
    this.setState({ replayEventIndex: index })
    this.props.advanceReviewReplayTo(this.props.event.events[index].id)
    this.props.showModal('eventComment', {
      event: this.props.event.events[index],
      handleUpdateEvent: this.props.updateEvent
    })
  }

  handlePageSelect(page) {
    this.setState({
      activePage: page,
      replayEventIndex: (page - 1) * maxEventsPerPage
    })
    this.props.advanceReviewReplayTo(this.props.event.events[(page - 1) * maxEventsPerPage].id)
  }

  handleKeyDown(event) {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return
    }

    if (event.key === 'ArrowRight' && this.state.activePage < Math.ceil(this.props.event.events.length / maxEventsPerPage)) {
      this.setState((prevState) => ({
        replayEventIndex: prevState.activePage * maxEventsPerPage,
        activePage: prevState.activePage + 1
      }))
    } else if (event.key === 'ArrowLeft' && this.state.activePage > 1) {
      this.setState((prevState) => ({
        replayEventIndex: (prevState.activePage - 2) * maxEventsPerPage,
        activePage: prevState.activePage - 1
      }))
    } else if (event.key === 'ArrowDown' && this.state.replayEventIndex < this.props.event.events.length - 1) {
      this.setState((prevState) => ({
        replayEventIndex: prevState.replayEventIndex + 1,
        activePage: Math.ceil((prevState.replayEventIndex + 2) / maxEventsPerPage)
      }))
    } else if (event.key === 'ArrowUp' && this.state.replayEventIndex > 0) {
      this.setState((prevState) => ({
        replayEventIndex: prevState.replayEventIndex - 1,
        activePage: Math.ceil(prevState.replayEventIndex / maxEventsPerPage)
      }))
    }

    this.props.advanceReviewReplayTo(this.props.event.events[this.state.replayEventIndex].id)
  }

  handleReviewModeSelect(mode) {
    if (mode === 'Replay') {
      this.props.gotoReviewReplay(this.props.match.params.id)
    }
  }

  handleSliderChangeComplete() {
    const sliderHandle = this.sliderRef.current?.querySelector('.rc-slider-handle')
    if (sliderHandle) {
      sliderHandle.blur()
    }
  }

  handleEventShowDetailsModal(index) {
    this.props.showModal('eventShowDetails', {
      event: this.props.event.events[index],
      handleUpdateEvent: this.props.updateEvent
    })
  }

  renderControlsCard() {
    if (this.props.event && this.props.event.events.length > 0) {
      const loweringStartTime = moment.utc(this.props.event.events[0].ts).format('MM/DD HH:mm')
      const loweringEndTime = moment.utc(this.props.event.events[this.props.event.events.length - 1].ts).format('MM/DD HH:mm')

      return (
        <Card className='border-secondary p-1'>
          <div className='d-flex justify-content-between text-primary'>
            <span>{loweringStartTime}</span>
            <span>{loweringEndTime}</span>
          </div>
          <div className='d-flex justify-content-between' ref={this.sliderRef}>
            <SliderWithTooltip
              className='mx-2'
              value={this.state.replayEventIndex}
              tipFormatter={this.sliderTooltipFormatter}
              trackStyle={{ opacity: 0.5 }}
              railStyle={{ opacity: 0.5 }}
              onChange={this.handleSliderChange}
              onAfterChange={this.handleSliderChangeComplete}
              max={this.props.event.events.length - 1}
            />
          </div>
        </Card>
      )
    }
  }

  renderEventListHeader() {
    return (
      <div>
        Filtered Events
        <span className='float-end'>
          <span className='me-2 text-primary clickable' style={{ fontSize: '.85rem' }} onClick={this.toggleASNAP}>
            {this.props.event.hideASNAP ? 'Show ASNAP' : 'Hide ASNAP'}
          </span>
          <ExportDropdown
            id='dropdown-download'
            disabled={this.props.event.fetching}
            hideASNAP={this.props.event.hideASNAP}
            eventFilter={this.props.event.eventFilter}
            loweringID={this.props.lowering.id}
            prefix={this.props.lowering.lowering_id}
          />
        </span>
      </div>
    )
  }

  renderEventCard() {
    return (
      <Card className='border-secondary'>
        <Card.Header>{this.renderEventListHeader()}</Card.Header>
        <ListGroup variant='flush' tabIndex='-1'>
          {this.renderEvents()}
        </ListGroup>
      </Card>
    )
  }

  renderEvents() {
    if (!this.props.event.selected_event) {
      return null
    }
    if (this.props.event.events && this.props.event.events.length > 0) {
      let eventList = this.props.event.events.map((event, index) => {
        if (index >= (this.state.activePage - 1) * maxEventsPerPage && index < this.state.activePage * maxEventsPerPage) {
          let comment_exists = false
          let eventOptionsArray = event.event_options.reduce((filtered, option) => {
            if (option.event_option_name === 'event_comment') {
              comment_exists = option.event_option_value !== '' ? true : false
            } else {
              filtered.push(`${option.event_option_name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}: "${option.event_option_value}"`)
            }
            return filtered
          }, [])

          if (event.event_free_text) {
            eventOptionsArray.push(`free_text: "${event.event_free_text}"`)
          }
          let active = this.props.event.selected_event.id === event.id ? true : false
          let eventOptions = eventOptionsArray.length > 0 ? eventOptionsArray.join(', ') : ''
          let eventComment = comment_exists ? (
            <OverlayTrigger placement='left' overlay={<Tooltip id={`commentTooltip_${event.id}`}>Edit/View Comment</Tooltip>}>
              <FontAwesomeIcon
                onClick={() => this.handleEventCommentModal(index)}
                icon='comment'
                fixedWidth
                transform='grow-4'
                role='button'
              />
            </OverlayTrigger>
          ) : (
            <OverlayTrigger placement='top' overlay={<Tooltip id={`commentTooltip_${event.id}`}>Add Comment</Tooltip>}>
              <span onClick={() => this.handleEventCommentModal(index)} className='fa-layers fa-fw' role='button'>
                <FontAwesomeIcon icon='comment' fixedWidth transform='grow-4' />
                <FontAwesomeIcon
                  style={active ? { color: 'var(--bs-gray-700' } : { color: 'var(--bs-gray-800' }}
                  icon='plus'
                  fixedWidth
                  transform='shrink-4'
                />
              </span>
            </OverlayTrigger>
          )

          let eventDetails = (
            <OverlayTrigger placement='left' overlay={<Tooltip id={`commentTooltip_${event.id}`}>View Details</Tooltip>}>
              <FontAwesomeIcon
                onClick={() => this.handleEventShowDetailsModal(index)}
                icon='window-maximize'
                fixedWidth
                className='me-1'
                role='button'
              />
            </OverlayTrigger>
          )

          return (
            <ListGroup.Item key={event.id} className='event-list-item d-flex justify-content-between' active={active}>
              <div onClick={() => this.handleEventClick(index)} className='event-list-item-summary'>
                {event.ts}{' '}
                <b>
                  <i>{event.event_author}</i>
                </b>
                : {event.event_value} {eventOptions ? <FontAwesomeIcon icon='arrow-right' fixedWidth /> : null} {eventOptions}
              </div>
              {this.props.roles && this.props.roles.some((role) => ['admin', 'event_logger'].includes(role)) ? (
                <div style={{ minWidth: '39px' }}>
                  {eventDetails}
                  {eventComment}
                </div>
              ) : (
                <div>{eventDetails}</div>
              )}
            </ListGroup.Item>
          )
        }
      })

      return eventList
    }

    return this.props.event.fetching ? (
      <ListGroup.Item className='event-list-item'>Loading...</ListGroup.Item>
    ) : (
      <ListGroup.Item>No events found</ListGroup.Item>
    )
  }

  render() {
    return (
      <div className='pt-2 px-1'>
        <EventCommentModal />
        <EventShowDetailsModal />
        <Row>
          <ButtonToolbar className='mb-2 ms-1 align-items-center'>
            <span onClick={() => this.props.gotoCruiseMenu()} className='text-warning'>
              {this.props.cruise.cruise_id || 'Loading...'}
            </span>
            <FontAwesomeIcon icon='chevron-right' fixedWidth />
            <span className='text-warning'>{this.props.lowering.lowering_id || 'Loading...'}</span>
            <FontAwesomeIcon icon='chevron-right' fixedWidth />
            <ReviewDropdown loweringID={this.props.lowering.id} activeMode={'Map'} />
          </ButtonToolbar>
        </Row>
        <Row>
          <Col className='px-1 mb-2'>
            <Card className='event-header-card'>
              <Card.Header>
                {this.props.event.selected_event.event_value}
                <span className='float-end'>
                  <i>{this.props.event.selected_event.event_author}</i> @ {this.props.event.selected_event.ts}
                </span>
              </Card.Header>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col className='px-1' sm={12}>
            <Card className='border-secondary'>
              <TracklineMap selectedEvent={this.props.event.selected_event} id={this.props.match.params.id} />
            </Card>
          </Col>
        </Row>
        <Row>
          <Col className='px-1 my-2' xl={12}>
            {this.renderControlsCard()}
          </Col>
        </Row>
        <Row>
          <Col className='px-1' sm={12} md={8} lg={9}>
            {this.renderEventCard()}
            <CustomPagination
              className='mt-2'
              page={this.state.activePage}
              count={this.props.event.events.length}
              pageSelectFunc={this.handlePageSelect}
              maxPerPage={maxEventsPerPage}
            />
          </Col>
          <Col className='px-1' sm={12} md={4} lg={3}>
            <EventFilterForm
              disabled={this.props.event.fetching}
              hideASNAP={this.props.event.hideASNAP}
              handlePostSubmit={this.updateEventFilter}
              minDate={this.props.lowering.start_ts}
              maxDate={this.props.lowering.stop_ts}
              initialValues={this.props.event.eventFilter}
            />
          </Col>
        </Row>
      </div>
    )
  }
}

ReviewMap.propTypes = {
  advanceReviewReplayTo: PropTypes.func.isRequired,
  cruise: PropTypes.object.isRequired,
  event: PropTypes.object.isRequired,
  eventUpdateReviewReplay: PropTypes.func.isRequired,
  gotoCruiseMenu: PropTypes.func.isRequired,
  gotoReviewReplay: PropTypes.func.isRequired,
  initCruise: PropTypes.func.isRequired,
  initReviewReplay: PropTypes.func.isRequired,
  lowering: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  roles: PropTypes.array,
  showModal: PropTypes.func.isRequired,
  toggleASNAP: PropTypes.func.isRequired,
  updateEvent: PropTypes.func.isRequired,
  updateEventFilterForm: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    cruise: state.cruise.cruise,
    lowering: state.lowering.lowering,
    roles: state.user.profile.roles,
    event: state.event
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ReviewMap)
