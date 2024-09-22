import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import moment from 'moment'
import { connect } from 'react-redux'
import { ButtonToolbar, Container, Row, Col, Card, ListGroup, OverlayTrigger, Tooltip, Form } from 'react-bootstrap'
import Slider from 'rc-slider'
import PropTypes from 'prop-types'
import EventFilterForm from './event_filter_form'
import AuxDataCards from './aux_data_cards'
import EventCommentCard from './event_comment_card'
import EventOptionsCard from './event_options_card'
import ImageryCards from './imagery_cards'
import ImagePreviewModal from './image_preview_modal'
import EventCommentModal from './event_comment_modal'
import LoweringModeDropdown from './lowering_mode_dropdown'
import CustomPagination from './custom_pagination'
import ExportDropdown from './export_dropdown'
import { EXCLUDE_AUX_DATA_SOURCES, IMAGES_AUX_DATA_SOURCES, AUX_DATA_SORT_ORDER } from '../client_settings'
import { handle_image_file_download } from '../api'
import { _Lowerings_ } from '../vocab'
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

class LoweringReplay extends Component {
  constructor(props) {
    super(props)

    this.state = {
      replayTimer: null,
      replayState: PAUSE,

      replayEventIndex: 0,
      activePage: 1,
      sliderTimer: null
    }

    this.sliderRef = React.createRef() // Reference to the slider

    this.handleEventClick = this.handleEventClick.bind(this)
    this.handleImagePreviewModal = this.handleImagePreviewModal.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleLoweringModeSelect = this.handleLoweringModeSelect.bind(this)
    this.handleLoweringReplayPause = this.handleLoweringReplayPause.bind(this)
    this.handlePageSelect = this.handlePageSelect.bind(this)
    this.handleSliderChange = this.handleSliderChange.bind(this)
    this.handleSliderChangeComplete = this.handleSliderChangeComplete.bind(this)
    this.replayAdvance = this.replayAdvance.bind(this)
    this.replayReverse = this.replayReverse.bind(this)
    this.sliderTooltipFormatter = this.sliderTooltipFormatter.bind(this)
    this.updateEventFilter = this.updateEventFilter.bind(this)
  }

  componentDidMount() {
    if (!this.props.lowering.id || this.props.lowering.id !== this.props.match.params.id || this.props.event.events.length === 0) {
      this.props.initLoweringReplay(this.props.match.params.id)
    } else {
      const eventIndex = this.props.event.events.findIndex((event) => event.id === this.props.event.selected_event.id)
      this.setState({
        replayEventIndex: eventIndex,
        activePage: Math.ceil((eventIndex + 1) / maxEventsPerPage)
      })
    }

    document.addEventListener('keydown', this.handleKeyDown)
  }

  componentDidUpdate() {}

  componentWillUnmount() {
    if (this.state.replayTimer) {
      clearInterval(this.state.replayTimer)
    }

    document.removeEventListener('keydown', this.handleKeyDown)
  }

  updateEventFilter(filter) {
    this.handleLoweringReplayPause()
    this.setState({ activePage: 1, replayEventIndex: 0 })
    this.props.advanceLoweringReplayTo(this.props.event.events[0].id)
    this.props.updateEventFilterForm(filter)
    this.props.eventUpdateLoweringReplay()
  }

  toggleASNAP() {
    this.handleLoweringReplayPause()
    this.props.toggleASNAP()
    this.setState({ replayEventIndex: 0 })
    this.props.advanceLoweringReplayTo(this.props.event.events[0].id)
    this.props.eventUpdateLoweringReplay()
    this.handleEventClick(0)
  }

  sliderTooltipFormatter(v) {
    if (this.props.event.events && this.props.event.events[v]) {
      let loweringStartTime = moment(this.props.lowering.start_ts)
      let loweringNow = moment(this.props.event.events[v].ts)
      let loweringElapse = loweringNow.diff(loweringStartTime)
      return moment.duration(loweringElapse).format('d [days] hh:mm:ss')
    }

    return ''
  }

  handleSliderChange(index) {
    this.handleLoweringReplayPause()
    if (this.props.event.events && this.props.event.events[index]) {
      this.setState({ replayEventIndex: index })
      clearTimeout(this.state.sliderTimer)
      this.setState({
        sliderTimer: setTimeout(() => {
          this.props.advanceLoweringReplayTo(this.props.event.events[index].id)
          this.setState({
            activePage: Math.ceil((index + 1) / maxEventsPerPage)
          })
        }, 250)
      })
    }
  }

  handleEventClick(index) {
    this.handleLoweringReplayPause()
    this.setState({ replayEventIndex: index })
    this.props.advanceLoweringReplayTo(this.props.event.events[index].id)
    if (this.props.event.events && this.props.event.events.length > index) {
      this.setState({ activePage: Math.ceil((index + 1) / maxEventsPerPage) })
    }
  }

  handleEventCommentModal(index) {
    this.handleLoweringReplayPause()
    this.setState({ replayEventIndex: index })
    this.props.advanceLoweringReplayTo(this.props.event.events[index].id)
    this.props.showModal('eventComment', {
      event: this.props.event.events[index],
      handleUpdateEvent: this.props.updateEvent
    })
  }

  handlePageSelect(page) {
    this.handleLoweringReplayPause()
    this.setState({
      activePage: page,
      replayEventIndex: (page - 1) * maxEventsPerPage
    })
    this.props.advanceLoweringReplayTo(this.props.event.events[(page - 1) * maxEventsPerPage].id)
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

    this.props.advanceLoweringReplayTo(this.props.event.events[this.state.replayEventIndex].id)
  }

  handleLoweringModeSelect(mode) {
    if (mode === 'Gallery') {
      this.props.gotoLoweringGallery(this.props.match.params.id)
    } else if (mode === 'Map') {
      this.props.gotoLoweringMap(this.props.match.params.id)
    }
  }

  handleSliderChangeComplete() {
    const sliderHandle = this.sliderRef.current?.querySelector('.rc-slider-handle')
    if (sliderHandle) {
      sliderHandle.blur()
    }
  }

  handleImagePreviewModal(source, filepath) {
    this.handleLoweringReplayPause()
    this.props.showModal('imagePreview', { name: source, filepath: filepath })
  }

  handleLoweringReplayStart() {
    this.handleLoweringReplayPause()
    this.setState({
      replayEventIndex: 0,
      activePage: Math.ceil((this.state.replayEventIndex + 1) / maxEventsPerPage)
    })
  }

  handleLoweringReplayEnd() {
    this.handleLoweringReplayPause()
    this.setState({
      replayEventIndex: this.props.event.events.length - 1,
      activePage: Math.ceil(this.props.event.events.length / maxEventsPerPage)
    })
  }

  handleLoweringReplayFRev() {
    this.setState({ replayState: FREV })
    if (this.state.replayTimer !== null) {
      clearInterval(this.state.replayTimer)
    }
    this.setState({ replayTimer: setInterval(this.replayReverse, ffwdTimer) })
  }

  handleLoweringReplayPlay() {
    this.setState({ replayState: PLAY })
    if (this.state.replayTimer !== null) {
      clearInterval(this.state.replayTimer)
    }
    this.setState({ replayTimer: setInterval(this.replayAdvance, playTimer) })
  }

  handleLoweringReplayPause() {
    this.setState({ replayState: PAUSE })
    if (this.state.replayTimer !== null) {
      clearInterval(this.state.replayTimer)
    }
    this.setState({ replayTimer: null })
  }

  handleLoweringReplayFFwd() {
    this.setState({ replayState: FFWD })
    if (this.state.replayTimer !== null) {
      clearInterval(this.state.replayTimer)
    }
    this.setState({ replayTimer: setInterval(this.replayAdvance, ffwdTimer) })
  }

  replayAdvance() {
    if (this.state.replayEventIndex < this.props.event.events.length - 1) {
      this.setState((prevState) => ({
        replayEventIndex: prevState.replayEventIndex + 1,
        activePage: Math.ceil((prevState.replayEventIndex + 2) / maxEventsPerPage)
      }))
      this.props.advanceLoweringReplayTo(this.props.event.events[this.state.replayEventIndex].id)
    } else {
      this.setState({ replayState: PAUSE })
    }
  }

  replayReverse() {
    if (this.state.replayEventIndex > 0) {
      this.setState((prevState) => ({
        replayEventIndex: prevState.replayEventIndex - 1,
        activePage: Math.ceil(prevState.replayEventIndex / maxEventsPerPage)
      }))
      this.props.advanceLoweringReplayTo(this.props.event.events[this.state.replayEventIndex].id)
    } else {
      this.setState({ replayState: PAUSE })
    }
  }

  renderControlsCard() {
    if (this.props.event.selected_event) {
      const loweringStartTime = moment(this.props.lowering.start_ts)
      const loweringEndTime = moment(this.props.lowering.stop_ts)
      const loweringDuration = loweringEndTime.diff(loweringStartTime)

      const playPause =
        this.state.replayState !== 1 ? (
          <FontAwesomeIcon
            className='text-primary'
            key={`pause_${this.props.lowering.id}`}
            onClick={() => this.handleLoweringReplayPause()}
            icon='pause'
          />
        ) : (
          <FontAwesomeIcon
            className='text-primary'
            key={`play_${this.props.lowering.id}`}
            onClick={() => this.handleLoweringReplayPlay()}
            icon='play'
          />
        )

      const buttons =
        this.props.event.selected_event.ts && !this.props.event.fetching ? (
          <span>
            <FontAwesomeIcon
              className='text-primary'
              key={`start_${this.props.lowering.id}`}
              onClick={() => this.handleLoweringReplayStart()}
              icon='step-backward'
            />{' '}
            <FontAwesomeIcon
              className='text-primary'
              key={`frev_${this.props.lowering.id}`}
              onClick={() => this.handleLoweringReplayFRev()}
              icon='backward'
            />{' '}
            {playPause}{' '}
            <FontAwesomeIcon
              className='text-primary'
              key={`ffwd_${this.props.lowering.id}`}
              onClick={() => this.handleLoweringReplayFFwd()}
              icon='forward'
            />{' '}
            <FontAwesomeIcon
              className='text-primary'
              key={`end_${this.props.lowering.id}`}
              onClick={() => this.handleLoweringReplayEnd()}
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
          <div className='d-flex align-items-center justify-content-between'>
            <span className='text-primary'>00:00:00</span>
            {buttons}
            <span className='text-primary'>{moment.duration(loweringDuration).format('d [days] hh:mm:ss')}</span>
          </div>
          <div className='d-flex align-items-center justify-content-between' ref={this.sliderRef}>
            <SliderWithTooltip
              className='mx-2'
              value={this.state.replayEventIndex}
              tipFormatter={this.sliderTooltipFormatter}
              trackStyle={{ opacity: 0.5 }}
              railStyle={{ opacity: 0.5 }}
              onBeforeChange={this.handleLoweringReplayPause}
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
    const Label = 'Filtered Events'
    const ASNAPToggle = (
      <Form.Check
        id='ASNAP'
        type='switch'
        inline
        checked={this.props.event.hideASNAP}
        onChange={() => this.toggleASNAP()}
        disabled={this.props.event.fetching}
        label='Hide ASNAP'
      />
    )

    return (
      <div>
        {Label}
        <span className='float-right'>
          {ASNAPToggle}
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

          let eventOptions = eventOptionsArray.length > 0 ? '--> ' + eventOptionsArray.join(', ') : ''

          let commentIcon = comment_exists ? (
            <FontAwesomeIcon onClick={() => this.handleEventCommentModal(index)} icon='comment' fixedWidth transform='grow-4' />
          ) : (
            <span onClick={() => this.handleEventCommentModal(index)} className='fa-layers fa-fw'>
              <FontAwesomeIcon icon='comment' fixedWidth transform='grow-4' />
              <FontAwesomeIcon className={active ? 'text-primary' : 'text-secondary'} icon='plus' fixedWidth transform='shrink-4' />
            </span>
          )
          let commentTooltip = comment_exists ? (
            <OverlayTrigger placement='left' overlay={<Tooltip id={`commentTooltip_${event.id}`}>Edit/View Comment</Tooltip>}>
              {commentIcon}
            </OverlayTrigger>
          ) : (
            <OverlayTrigger placement='top' overlay={<Tooltip id={`commentTooltip_${event.id}`}>Add Comment</Tooltip>}>
              {commentIcon}
            </OverlayTrigger>
          )
          let eventComment =
            this.props.roles && (this.props.roles.includes('event_logger') || this.props.roles.includes('admin')) ? commentTooltip : null

          return (
            <ListGroup.Item className='event-list-item' key={event.id} active={active}>
              <span
                onClick={() => this.handleEventClick(index)}
              >{`${event.ts} <${event.event_author}>: ${event.event_value} ${eventOptions}`}</span>
              <span className='float-right'>{eventComment}</span>
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
    const framegrab_data_sources =
      this.props.event.selected_event && this.props.event.selected_event.aux_data
        ? this.props.event.selected_event.aux_data.filter((aux_data) => IMAGES_AUX_DATA_SOURCES.includes(aux_data.data_source))
        : []

    const event_free_text_card = this.props.event.selected_event.event_free_text ? (
      <Col className='event-data-col' sm={6} md={4} lg={3}>
        <Card className='event-data-card'>
          <Card.Header>Free-form Text</Card.Header>
          <Card.Body>{this.props.event.selected_event.event_free_text}</Card.Body>
        </Card>
      </Col>
    ) : null

    const aux_data = this.props.event.selected_event.aux_data
      ? this.props.event.selected_event.aux_data.filter((data) => !excludeAuxDataSources.includes(data.data_source))
      : []
    aux_data.sort((a, b) => {
      return AUX_DATA_SORT_ORDER.indexOf(a.data_source) < AUX_DATA_SORT_ORDER.indexOf(b.data_source) ? -1 : 1
    })

    return (
      <Container className='mt-2'>
        <ImagePreviewModal handleDownload={handle_image_file_download} />
        <EventCommentModal />
        <Row>
          <ButtonToolbar className='mb-2 ml-1 align-items-center'>
            <span onClick={() => this.props.gotoCruiseMenu()} className='text-warning'>
              {_Lowerings_}
            </span>
            <FontAwesomeIcon icon='chevron-right' fixedWidth />
            <span className='text-warning'>{this.props.lowering.lowering_id || 'Loading...'}</span>
            <FontAwesomeIcon icon='chevron-right' fixedWidth />
            <LoweringModeDropdown onClick={this.handleLoweringModeSelect} active_mode={'Replay'} modes={['Map', 'Gallery']} />
          </ButtonToolbar>
        </Row>
        <Row>
          <Col className='px-1 mb-2'>
            <Card className='event-header-card'>
              <Card.Header>
                {this.props.event.selected_event.event_value}
                <span className='float-right'>
                  {this.props.event.selected_event.event_author} @ {this.props.event.selected_event.ts}
                </span>
              </Card.Header>
            </Card>
          </Col>
        </Row>
        <Row>
          <ImageryCards framegrab_data_sources={framegrab_data_sources} onClick={this.handleImagePreviewModal} />
          <AuxDataCards aux_data={aux_data} />
          <EventOptionsCard event={this.props.event.selected_event} />
          {event_free_text_card}
          <EventCommentCard event={this.props.event.selected_event} />
        </Row>
        <Row>
          <Col className='px-1 my-2' xl={12}>
            {this.renderControlsCard()}
          </Col>
        </Row>
        <Row>
          <Col className='px-1' md={9} lg={9}>
            {this.renderEventCard()}
            <CustomPagination
              className='mt-2'
              page={this.state.activePage}
              count={this.props.event.events.length}
              pageSelectFunc={this.handlePageSelect}
              maxPerPage={maxEventsPerPage}
            />
          </Col>
          <Col className='px-1 mb-1' md={3} lg={3}>
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
      </Container>
    )
  }
}

LoweringReplay.propTypes = {
  advanceLoweringReplayTo: PropTypes.func.isRequired,
  event: PropTypes.object.isRequired,
  eventUpdateLoweringReplay: PropTypes.func.isRequired,
  gotoCruiseMenu: PropTypes.func.isRequired,
  gotoLoweringGallery: PropTypes.func.isRequired,
  gotoLoweringMap: PropTypes.func.isRequired,
  initLoweringReplay: PropTypes.func.isRequired,
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
    lowering: state.lowering.lowering,
    roles: state.user.profile.roles,
    event: state.event
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(LoweringReplay)
