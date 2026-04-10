import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import moment from 'moment'
import { connect } from 'react-redux'
import { ButtonToolbar, Row, Col, Card, ListGroup, OverlayTrigger, Tooltip } from 'react-bootstrap'
import Slider from 'rc-slider'
import PropTypes from 'prop-types'
import AuxDataCards from './aux_data_cards'
import CustomPagination from './custom_pagination'
import EventCommentCard from './event_comment_card'
import EventCommentModal from './event_comment_modal'
import EventFilterForm from './event_filter_form'
import EventOptionsCard from './event_options_card'
import ExportDropdown from './export_dropdown'
import ImagePreviewModal from './image_preview_modal'
import ImageryCards from './imagery_cards'
import ReviewDropdown from './review_dropdown'
import { EXCLUDE_AUX_DATA_SOURCES, IMAGES_AUX_DATA_SOURCES, AUX_DATA_SORT_ORDER } from '../client_settings'
import { get_cruise_by_lowering } from '../api'
import * as mapDispatchToProps from '../actions'

const SliderWithTooltip = Slider.createSliderWithTooltip(Slider)

const maxEventsPerPage = 10

const playTimer = 3000
const ffwdTimer = 1000

const PLAY = 0
const PAUSE = 1
const FFWD = 2
const FREV = 3

const excludeAuxDataSources = Array.from(new Set([...EXCLUDE_AUX_DATA_SOURCES, ...IMAGES_AUX_DATA_SOURCES]))

class ReviewReplay extends Component {
  constructor(props) {
    super(props)

    this.state = {
      replayTimer: null,
      replayState: PAUSE,

      replayEventIndex: 0,
      activePage: 1
    }

    this.sliderTimer = null
    this.sliderRef = React.createRef() // Reference to the slider

    this.handleImagePreviewModal = this.handleImagePreviewModal.bind(this)
    this.handleReviewModeSelect = this.handleReviewModeSelect.bind(this)
    this.handleReviewReplayPause = this.handleReviewReplayPause.bind(this)
    this.handleEventClick = this.handleEventClick.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handlePageSelect = this.handlePageSelect.bind(this)
    this.handleSliderChange = this.handleSliderChange.bind(this)
    this.handleSliderChangeComplete = this.handleSliderChangeComplete.bind(this)
    this.renderEventListHeader = this.renderEventListHeader.bind(this)
    this.replayAdvance = this.replayAdvance.bind(this)
    this.replayReverse = this.replayReverse.bind(this)
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

    clearTimeout(this.sliderTimer)
    document.removeEventListener('keydown', this.handleKeyDown)
  }

  updateEventFilter(filter) {
    this.handleReviewReplayPause()
    this.setState({ activePage: 1, replayEventIndex: 0 })
    this.props.advanceReviewReplayTo(this.props.event.events[0].id)
    this.props.updateEventFilterForm(filter)
    this.props.eventUpdateReviewReplay()
  }

  toggleASNAP() {
    this.handleReviewReplayPause()
    this.props.toggleASNAP()
    this.setState({ replayEventIndex: 0 })
    this.props.advanceReviewReplayTo(this.props.event.events[0].id)
    this.props.eventUpdateReviewReplay()
    this.handleEventClick(0)
  }

  sliderTooltipFormatter(v) {
    if (this.props.event.events && this.props.event.events[v]) {
      return moment.utc(this.props.event.events[v].ts).format('MM/DD HH:mm')
    }

    return ''
  }

  handleSliderChange(index) {
    this.handleReviewReplayPause()
    if (this.props.event.events && this.props.event.events[index]) {
      this.setState({ replayEventIndex: index })
      clearTimeout(this.sliderTimer)
      this.sliderTimer = setTimeout(() => {
        this.props.advanceReviewReplayTo(this.props.event.events[index].id)
        this.setState({ activePage: Math.ceil((index + 1) / maxEventsPerPage) })
      }, 250)
    }
  }

  handleEventClick(index) {
    this.handleReviewReplayPause()
    this.setState({ replayEventIndex: index })
    this.props.advanceReviewReplayTo(this.props.event.events[index].id)
    if (this.props.event.events && this.props.event.events.length > index) {
      this.setState({ activePage: Math.ceil((index + 1) / maxEventsPerPage) })
    }
  }

  handleEventCommentModal(index) {
    this.handleReviewReplayPause()
    this.setState({ replayEventIndex: index })
    this.props.showModal('eventComment', {
      event: this.props.event.events[index],
      handleUpdateEvent: async (formProps) => {
        await this.props.updateEvent(formProps)
        this.props.advanceReviewReplayTo(this.props.event.events[index].id)
      }
    })
  }

  handleImagePreviewModal(source, filepath) {
    this.props.showModal('imagePreview', {
      name: source,
      filepath: filepath
    })
  }

  handlePageSelect(page) {
    this.handleReviewReplayPause()
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

    let newIndex = this.state.replayEventIndex

    if (event.key === 'ArrowRight' && this.state.activePage < Math.ceil(this.props.event.events.length / maxEventsPerPage)) {
      newIndex = this.state.activePage * maxEventsPerPage
      this.setState({ replayEventIndex: newIndex, activePage: this.state.activePage + 1 })
    } else if (event.key === 'ArrowLeft' && this.state.activePage > 1) {
      newIndex = (this.state.activePage - 2) * maxEventsPerPage
      this.setState({ replayEventIndex: newIndex, activePage: this.state.activePage - 1 })
    } else if (event.key === 'ArrowDown' && this.state.replayEventIndex < this.props.event.events.length - 1) {
      newIndex = this.state.replayEventIndex + 1
      this.setState({ replayEventIndex: newIndex, activePage: Math.ceil((newIndex + 1) / maxEventsPerPage) })
    } else if (event.key === 'ArrowUp' && this.state.replayEventIndex > 0) {
      newIndex = this.state.replayEventIndex - 1
      this.setState({ replayEventIndex: newIndex, activePage: Math.ceil((newIndex + 1) / maxEventsPerPage) })
    }

    this.props.advanceReviewReplayTo(this.props.event.events[newIndex].id)
  }

  handleReviewModeSelect(mode) {
    if (mode === 'Map') {
      this.props.gotoReviewMap(this.props.match.params.id)
    }
  }

  handleSliderChangeComplete() {
    const sliderHandle = this.sliderRef.current?.querySelector('.rc-slider-handle')
    if (sliderHandle) {
      sliderHandle.blur()
    }
  }

  handleReviewReplayStart() {
    this.handleReviewReplayPause()
    this.props.advanceReviewReplayTo(this.props.event.events[0].id)
    this.setState({ replayEventIndex: 0, activePage: 1 })
  }

  handleReviewReplayEnd() {
    this.handleReviewReplayPause()
    const lastIndex = this.props.event.events.length - 1
    this.props.advanceReviewReplayTo(this.props.event.events[lastIndex].id)
    this.setState({ replayEventIndex: lastIndex, activePage: Math.ceil((lastIndex + 1) / maxEventsPerPage) })
  }

  handleReviewReplayFRev() {
    this.setState({ replayState: FREV })
    if (this.state.replayTimer !== null) {
      clearInterval(this.state.replayTimer)
    }
    this.setState({ replayTimer: setInterval(this.replayReverse, ffwdTimer) })
  }

  handleReviewReplayPlay() {
    this.setState({ replayState: PLAY })
    if (this.state.replayTimer !== null) {
      clearInterval(this.state.replayTimer)
    }
    this.setState({ replayTimer: setInterval(this.replayAdvance, playTimer) })
  }

  handleReviewReplayPause() {
    this.setState({ replayState: PAUSE })
    if (this.state.replayTimer !== null) {
      clearInterval(this.state.replayTimer)
    }
    this.setState({ replayTimer: null })
  }

  handleReviewReplayFFwd() {
    this.setState({ replayState: FFWD })
    if (this.state.replayTimer !== null) {
      clearInterval(this.state.replayTimer)
    }
    this.setState({ replayTimer: setInterval(this.replayAdvance, ffwdTimer) })
  }

  replayAdvance() {
    if (this.state.replayEventIndex < this.props.event.events.length - 1) {
      const nextIndex = this.state.replayEventIndex + 1
      this.props.advanceReviewReplayTo(this.props.event.events[nextIndex].id)
      this.setState({ replayEventIndex: nextIndex, activePage: Math.ceil((nextIndex + 1) / maxEventsPerPage) })
    } else {
      this.setState({ replayState: PAUSE })
    }
  }

  replayReverse() {
    if (this.state.replayEventIndex > 0) {
      const prevIndex = this.state.replayEventIndex - 1
      this.props.advanceReviewReplayTo(this.props.event.events[prevIndex].id)
      this.setState({ replayEventIndex: prevIndex, activePage: Math.ceil((prevIndex + 1) / maxEventsPerPage) })
    } else {
      this.setState({ replayState: PAUSE })
    }
  }

  renderControlsCard() {
    if (this.props.event && this.props.event.events.length > 0) {
      const cruiseStartTime = moment.utc(this.props.event.events[0].ts).format('MM/DD HH:mm')
      const cruiseEndTime = moment.utc(this.props.event.events[this.props.event.events.length - 1].ts).format('MM/DD HH:mm')

      const playPause =
        this.state.replayState !== 1 ? (
          <FontAwesomeIcon
            className='text-primary'
            key={`pause_${this.props.cruise.id}`}
            onClick={() => this.handleReviewReplayPause()}
            icon='pause'
          />
        ) : (
          <FontAwesomeIcon
            className='text-primary'
            key={`play_${this.props.cruise.id}`}
            onClick={() => this.handleReviewReplayPlay()}
            icon='play'
          />
        )

      const buttons =
        this.props.event.selected_event.ts && !this.props.event.fetching ? (
          <span>
            <FontAwesomeIcon
              className='text-primary'
              key={`start_${this.props.cruise.id}`}
              onClick={() => this.handleReviewReplayStart()}
              icon='step-backward'
            />{' '}
            <FontAwesomeIcon
              className='text-primary'
              key={`frev_${this.props.cruise.id}`}
              onClick={() => this.handleReviewReplayFRev()}
              icon='backward'
            />{' '}
            {playPause}{' '}
            <FontAwesomeIcon
              className='text-primary'
              key={`ffwd_${this.props.cruise.id}`}
              onClick={() => this.handleReviewReplayFFwd()}
              icon='forward'
            />{' '}
            <FontAwesomeIcon
              className='text-primary'
              key={`end_${this.props.cruise.id}`}
              onClick={() => this.handleReviewReplayEnd()}
              icon='step-forward'
            />
          </span>
        ) : (
          <span className='text-center'>
            <FontAwesomeIcon icon='step-backward' /> <FontAwesomeIcon icon='backward' /> <FontAwesomeIcon icon='play' />{' '}
            <FontAwesomeIcon icon='forward' /> <FontAwesomeIcon icon='step-forward' />
          </span>
        )

      return (
        <Card className='border-secondary p-1'>
          <div className='d-flex justify-content-between text-primary'>
            {cruiseStartTime}
            {buttons}
            {cruiseEndTime}
          </div>
          <div className='d-flex justify-content-between' ref={this.sliderRef}>
            <SliderWithTooltip
              className='mx-2'
              value={this.state.replayEventIndex}
              tipFormatter={this.sliderTooltipFormatter}
              trackStyle={{ opacity: 0.5 }}
              railStyle={{ opacity: 0.5 }}
              onBeforeChange={this.handleReviewReplayPause}
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
          <span className='me-2 text-primary' style={{ fontSize: '.85rem' }} onClick={this.toggleASNAP}>
            {this.props.event.hideASNAP ? 'Show ASNAP' : 'Hide ASNAP'}
          </span>
          <ExportDropdown
            id='dropdown-download'
            disabled={this.props.event.fetching}
            hideASNAP={this.props.event.hideASNAP}
            eventFilter={this.props.event.eventFilter}
            cruiseID={this.props.cruise.id}
            prefix={this.props.cruise.cruise_id}
          />
        </span>
      </div>
    )
  }

  renderEvents() {
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
              <FontAwesomeIcon onClick={() => this.handleEventCommentModal(index)} icon='comment' fixedWidth transform='grow-4' />
            </OverlayTrigger>
          ) : (
            <OverlayTrigger placement='top' overlay={<Tooltip id={`commentTooltip_${event.id}`}>Add Comment</Tooltip>}>
              <span onClick={() => this.handleEventCommentModal(index)} className='fa-layers fa-fw'>
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

          return (
            <ListGroup.Item key={event.id} className='event-list-item d-flex justify-content-between' active={active}>
              <div onClick={() => this.handleEventClick(index)}>
                {event.ts}{' '}
                <b>
                  <i>{event.event_author}</i>
                </b>
                : {event.event_value} {eventOptions ? <FontAwesomeIcon icon='arrow-right' fixedWidth /> : null} {eventOptions}
              </div>
              {this.props.roles && this.props.roles.some((role) => ['admin', 'event_logger'].includes(role)) ? (
                <div>{eventComment}</div>
              ) : null}
            </ListGroup.Item>
          )
        }
      })

      return eventList
    }

    return this.props.event.fetching ? (
      <ListGroup.Item className='event-list-item'>Loading...</ListGroup.Item>
    ) : (
      <ListGroup.Item className='event-list-item'>No events found</ListGroup.Item>
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

  render() {
    const event_free_text_card = this.props.event.selected_event.event_free_text ? (
      <Col className='event-data-col' sm={4} lg={3}>
        <Card className='event-data-card'>
          <Card.Header className='event-details'>Free-form Text</Card.Header>
          <Card.Body>{this.props.event.selected_event.event_free_text}</Card.Body>
        </Card>
      </Col>
    ) : null

    const image_data_sources = this.props.event.selected_event.aux_data
      ? this.props.event.selected_event.aux_data.filter((aux_data) => IMAGES_AUX_DATA_SOURCES.includes(aux_data.data_source))
      : []
    const aux_data = this.props.event.selected_event.aux_data
      ? this.props.event.selected_event.aux_data.filter((data) => !excludeAuxDataSources.includes(data.data_source))
      : []
    aux_data.sort((a, b) => {
      return AUX_DATA_SORT_ORDER.indexOf(a.data_source) < AUX_DATA_SORT_ORDER.indexOf(b.data_source) ? -1 : 1
    })

    return (
      <div className='pt-2 px-1'>
        <EventCommentModal />
        <ImagePreviewModal />
        <Row>
          <ButtonToolbar className='mb-2 ms-1 align-items-center'>
            <span onClick={() => this.props.gotoCruiseMenu()} className='text-warning'>
              {this.props.cruise.cruise_id || 'Loading...'}
            </span>
            <FontAwesomeIcon icon='chevron-right' fixedWidth />
            <span className='text-warning'>{this.props.lowering.lowering_id || 'Loading...'}</span>
            <FontAwesomeIcon icon='chevron-right' fixedWidth />
            <ReviewDropdown loweringID={this.props.lowering.id} activeMode={'Replay'} />
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
          <ImageryCards image_data_sources={image_data_sources} onClick={this.handleImagePreviewModal} sm={4} lg={3} />
          <AuxDataCards aux_data={aux_data} sm={4} lg={3} />
          <EventOptionsCard event={this.props.event.selected_event} sm={4} lg={3} />
          {event_free_text_card}
          <EventCommentCard event={this.props.event.selected_event} sm={4} lg={3} />
        </Row>
        <Row>
          <Col className='px-1 mb-2' xl={12}>
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
              minDate={this.props.cruise.start_ts}
              maxDate={this.props.cruise.stop_ts}
              initialValues={this.props.event.eventFilter}
            />
          </Col>
        </Row>
      </div>
    )
  }
}

ReviewReplay.propTypes = {
  advanceReviewReplayTo: PropTypes.func.isRequired,
  cruise: PropTypes.object.isRequired,
  event: PropTypes.object.isRequired,
  eventUpdateReviewReplay: PropTypes.func.isRequired,
  gotoReviewMap: PropTypes.func.isRequired,
  gotoCruiseMenu: PropTypes.func.isRequired,
  initCruise: PropTypes.func.isRequired,
  initReviewReplay: PropTypes.func.isRequired,
  match: PropTypes.object.isRequired,
  lowering: PropTypes.object.isRequired,
  roles: PropTypes.array,
  showModal: PropTypes.func.isRequired,
  toggleASNAP: PropTypes.func.isRequired,
  updateEvent: PropTypes.func.isRequired,
  updateEventFilterForm: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    cruise: state.cruise.cruise,
    event: state.event,
    lowering: state.lowering.lowering,
    roles: state.user.profile.roles
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ReviewReplay)
