import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { connect } from 'react-redux'
import { Button, ListGroup, Card, Tooltip, OverlayTrigger, Row, Col, Form, FormControl } from 'react-bootstrap'
import Moment from 'moment'
import PropTypes from 'prop-types'
import AuxDataCards from './aux_data_cards'
import EventCommentCard from './event_comment_card'
import EventOptionsCard from './event_options_card'
import ImageryCards from './imagery_cards'
import ImagePreviewModal from './image_preview_modal'
import { Client } from '@hapi/nes/lib/client'
import { EXCLUDE_AUX_DATA_SOURCES, IMAGES_AUX_DATA_SOURCES, AUX_DATA_SORT_ORDER, WS_ROOT_URL } from '../client_settings'
import { get_events, get_event_exports, handle_image_file_download } from '../api'
import { buildEventQuery, connectWSClient, resolveStartTS } from '../utils'
import * as mapDispatchToProps from '../actions'

const excludeAuxDataSources = Array.from(new Set([...EXCLUDE_AUX_DATA_SOURCES, ...IMAGES_AUX_DATA_SOURCES]))

const eventHistoryRef = 'eventHistory'

const maxEventsPerPage = 20

class EventHistory extends Component {
  constructor(props) {
    super(props)

    this.state = {
      activePage: 1,
      startTS: null,
      event: {},
      events: [],
      fetching: false,
      hideASNAP: true,
      showNewEventDetails: true,
      showEventHistory: true,
      showExpandedEventHistory: false,
      filterTimer: null,
      eventFilter: null
    }

    this.client = new Client(`${WS_ROOT_URL}`)
    this.connectToWS = this.connectToWS.bind(this)
    this.fetchEventExport = this.fetchEventExport.bind(this)
    this.fetchEvents = this.fetchEvents.bind(this)
    this.handleImagePreviewModal = this.handleImagePreviewModal.bind(this)
    this.handleSearchChange = this.handleSearchChange.bind(this)
    this.handleUpdateEvent = this.handleUpdateEvent.bind(this)
    this.toggleASNAP = this.toggleASNAP.bind(this)
    this.toggleEventHistory = this.toggleEventHistory.bind(this)
    this.toggleExpandedEventHistory = this.toggleExpandedEventHistory.bind(this)
    this.toggleNewEventDetails = this.toggleNewEventDetails.bind(this)
  }

  componentDidMount() {
    if (this.props.authenticated) {
      this.initStartTS()
      this.fetchEvents()
      this.connectToWS()
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.activePage !== this.state.activePage) {
      this.fetchEvents()
    }

    if (prevState.eventFilter !== this.state.eventFilter) {
      this.setState({ activePage: 1 }, () => this.fetchEvents())
    }

    if (prevState.hideASNAP !== this.state.hideASNAP) {
      this.setState({ activePage: 1 }, () => this.fetchEvents())
    }

    if (prevState.showNewEventDetails !== this.state.showNewEventDetails && this.state.showNewEventDetails && this.state.events.length) {
      this.fetchEventExport(this.state.events[0].id)
    }

    if (prevState.events !== this.state.events) {
      if (this.state.events.length === 0) {
        this.setState({ event: {} })
      } else if (this.state.activePage > 1) {
        this.fetchEventExport(null)
      } else if (prevState.event.id !== this.state.events[0].id) {
        this.fetchEventExport(this.state.events[0].id)
      } else {
        const cur_event = this.state.events.find((event) => event.id === this.state.event.id)
        if (cur_event) {
          this.fetchEventExport(cur_event.id)
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.props.authenticated) {
      this.client.disconnect()
    }
  }

  async connectToWS() {
    const updateHandler = async (update) => {
      if (this.state.events.length === 0) {
        await this.fetchEvents()
      } else {
        const oldest_ts = Moment(this.state.events.slice(-1)[0].ts)
        const update_ts = Moment(update.ts)
        if (update_ts > oldest_ts) {
          await this.fetchEvents()
        }
      }
    }

    const updateAuxDataHandler = async (update) => {
      const event = (await get_events({}, update.event_id)) || {}
      if (event.id) {
        updateHandler(event)
      }
    }

    await connectWSClient(this.client, {
      '/ws/status/newEvents': updateHandler,
      '/ws/status/updateEvents': updateHandler,
      '/ws/status/deleteEvents': updateHandler,
      '/ws/status/newEventAuxData': updateAuxDataHandler,
      '/ws/status/updateEventAuxData': updateAuxDataHandler
    })
  }

  async initStartTS() {
    const startTS = await resolveStartTS(this.props.roles)
    if (startTS === undefined) return
    if (startTS !== null) this.setState({ startTS })
    this.fetchEvents()
  }

  async fetchEvents() {
    this.setState({ fetching: true })

    if (this.props.roles && !this.props.roles.includes('admin') && !this.state.startTS) {
      this.setState({ fetching: false })
      return
    }

    const query = buildEventQuery({
      startTS: this.state.startTS,
      eventFilterValue: this.state.eventFilter,
      hideASNAP: this.state.hideASNAP,
      activePage: this.state.activePage,
      maxPerPage: maxEventsPerPage
    })

    const events = await get_events(query)
    this.setState({ events, fetching: false })
  }

  async fetchEventExport(event_id) {
    if (!event_id) {
      const query = {
        value: this.state.hideASNAP ? ['!ASNAP'] : null,
        sort: 'newest',
        limit: 1
      }

      const event = await get_events(query)
      event_id = event.length ? event[0].id : null
    }

    if (event_id) {
      const event_export = await get_event_exports({}, event_id)
      this.setState({ event: event_export })
    } else {
      this.setState({ event: {} })
    }
  }

  handleEventShowDetailsModal(event) {
    this.props.showModal('eventShowDetails', { event })
  }

  handleEventCommentModal(event) {
    this.props.showModal('eventComment', {
      event,
      handleUpdateEvent: this.handleUpdateEvent
    })
  }

  handleUpdateEvent(event) {
    this.props.updateEvent(event)
    this.fetchEvents()
  }

  handleSearchChange(event) {
    let eventFilterValue = event.target.value !== '' ? event.target.value : null
    clearTimeout(this.state.filterTimer)
    this.setState({
      filterTimer: setTimeout(() => {
        this.setState({ eventFilter: eventFilterValue })
      }, 500)
    })
  }

  handleKeyDown(event) {
    if (event.key === 'Enter' && event.shiftKey === false) {
      event.preventDefault()
    }
  }

  toggleASNAP() {
    this.setState((prevState) => ({ hideASNAP: !prevState.hideASNAP }))
  }

  toggleEventHistory() {
    this.setState((prevState) => ({
      showEventHistory: !prevState.showEventHistory
    }))
  }

  toggleExpandedEventHistory() {
    this.setState((prevState) => ({
      showExpandedEventHistory: !prevState.showExpandedEventHistory
    }))
  }

  toggleNewEventDetails() {
    this.setState((prevState) => ({
      showNewEventDetails: !prevState.showNewEventDetails
    }))
  }

  incrementPage() {
    this.setState((prevState) => ({ activePage: prevState.activePage + 1 }))
  }

  decrementPage() {
    this.setState((prevState) => ({ activePage: prevState.activePage - 1 }))
  }

  firstPage() {
    this.setState({ activePage: 1 })
  }

  handleImagePreviewModal(source, filepath) {
    this.props.showModal('imagePreview', { name: source, filepath: filepath })
  }

  renderEventHistory() {
    if (this.state.events && this.state.events.length > 0) {
      let eventArray = []

      for (let i = 0; i < this.state.events.length; i++) {
        let event = this.state.events[i]
        let comment_exists = false
        let eventOptionsArray = event.event_options.reduce((filtered, option) => {
          if (option.event_option_name === 'event_comment') {
            if (option.event_option_value.length > 0) {
              comment_exists = true
            }
          } else {
            filtered.push(`${option.event_option_name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}: "${option.event_option_value}"`)
          }
          return filtered
        }, [])

        if (event.event_free_text) {
          eventOptionsArray.push(`text: "${event.event_free_text}"`)
        }
        let eventOptions = eventOptionsArray.length > 0 ? eventOptionsArray.join(', ') : ''
        let commentIcon = comment_exists ? (
          <FontAwesomeIcon onClick={() => this.handleEventCommentModal(event)} icon='comment' fixedWidth transform='grow-4' />
        ) : (
          <span onClick={() => this.handleEventCommentModal(event)} className='fa-layers fa-fw'>
            <FontAwesomeIcon icon='comment' fixedWidth transform='grow-4' />
            <FontAwesomeIcon inverse icon='plus' style={{ color: 'var(--bs-black' }} fixedWidth transform='shrink-4' />
          </span>
        )
        let commentTooltip = comment_exists ? (
          <OverlayTrigger placement='left' overlay={<Tooltip id={`commentTooltip_${event.id}`}>Edit/View Comment</Tooltip>}>
            {commentIcon}
          </OverlayTrigger>
        ) : (
          <OverlayTrigger placement='left' overlay={<Tooltip id={`commentTooltip_${event.id}`}>Add Comment</Tooltip>}>
            {commentIcon}
          </OverlayTrigger>
        )

        eventArray.push(
          <ListGroup.Item key={event.id} className='event-list-item d-flex justify-content-between'>
            <div onClick={() => this.handleEventShowDetailsModal(event)}>
              {event.ts}{' '}
              <b>
                <i>{event.event_author}</i>
              </b>
              : {event.event_value} {eventOptions ? <FontAwesomeIcon icon='arrow-right' fixedWidth /> : null} {eventOptions}
            </div>
            <div>{commentTooltip}</div>
          </ListGroup.Item>
        )
      }
      return eventArray
    }

    return (
      <ListGroup.Item className='event-list-item' key='emptyHistory'>
        No events found
      </ListGroup.Item>
    )
  }

  renderNewestEventCard() {
    if (!this.state.event.id) {
      return null
    }

    const showNewEventTooltip = (
      <Tooltip id='showHistoryTooltip'>{this.state.showNewEventDetails ? 'Hide new event details' : 'Show new event details'}</Tooltip>
    )
    const showNewEventIcon = this.state.showNewEventDetails ? 'eye' : 'eye-slash'

    const event_free_text_card = this.state.event.event_free_text ? (
      <Col className='event-data-col' sm={6} md={4} lg={3}>
        <Card className='event-data-card'>
          <Card.Header className='event-details'>Free-form Text</Card.Header>
          <Card.Body>{this.state.event.event_free_text}</Card.Body>
        </Card>
      </Col>
    ) : null

    const image_data_sources = this.state.event.aux_data
      ? this.state.event.aux_data.filter((aux_data) => IMAGES_AUX_DATA_SOURCES.includes(aux_data.data_source))
      : []

    const aux_data = this.state.event.aux_data
      ? this.state.event.aux_data.filter((data) => !excludeAuxDataSources.includes(data.data_source))
      : []
    aux_data.sort((a, b) => {
      return AUX_DATA_SORT_ORDER.indexOf(a.data_source) < AUX_DATA_SORT_ORDER.indexOf(b.data_source) ? -1 : 1
    })

    return (
      <Card className={this.props.className}>
        <ImagePreviewModal handleDownload={handle_image_file_download} />
        <Card.Header className='event-details'>
          {this.state.event.event_value}
          <span className='float-end'>
            <i>{this.state.event.event_author}</i> @ {this.state.event.ts}
            <OverlayTrigger placement='top' overlay={showNewEventTooltip}>
              <span className='float-end ps-2' size='sm' onClick={this.toggleNewEventDetails}>
                <FontAwesomeIcon icon={showNewEventIcon} fixedWidth />
              </span>
            </OverlayTrigger>
          </span>
        </Card.Header>
        {this.state.showNewEventDetails &&
        (image_data_sources.length || aux_data.length || event_free_text_card || this.state.event.event_options) ? (
          <Card.Body className='pt-2 pb-1'>
            <Row>
              <ImageryCards image_data_sources={image_data_sources} onClick={this.handleImagePreviewModal} md={4} lg={3} />
              <AuxDataCards aux_data={aux_data} md={4} lg={3} />
              <EventOptionsCard event={this.state.event} md={4} lg={3} />
              {event_free_text_card}
              <EventCommentCard event={this.state.event} md={4} lg={3} />
            </Row>
          </Card.Body>
        ) : null}
      </Card>
    )
  }

  renderEventHistoryHeader() {
    const showHistoryFullscreenTooltip = (
      <Tooltip id='compressTooltip'>{this.state.showExpandedEventHistory ? 'Compress event history' : 'Expand event history'}</Tooltip>
    )
    const showExpandedHistoryIcon = this.state.showExpandedEventHistory ? 'compress' : 'expand'
    const showHistoryTooltip = (
      <Tooltip id='showHistoryTooltip'>{this.state.showEventHistory ? 'Hide event history' : 'Show event history'}</Tooltip>
    )
    const showHistoryIcon = this.state.showEventHistory ? 'eye' : 'eye-slash'

    return (
      <Card.Header>
        Event History
        <OverlayTrigger placement='left' overlay={showHistoryTooltip}>
          <FontAwesomeIcon
            icon={showHistoryIcon}
            fixedWidth
            className='float-end'
            style={{ paddingTop: '8px' }}
            onClick={this.toggleEventHistory}
          />
        </OverlayTrigger>
        {this.state.showEventHistory ? (
          <React.Fragment>
            <OverlayTrigger placement='left' overlay={showHistoryFullscreenTooltip}>
              <FontAwesomeIcon
                icon={showExpandedHistoryIcon}
                fixedWidth
                className='mx-2 float-end'
                style={{ paddingTop: '8px' }}
                onClick={this.toggleExpandedEventHistory}
              />
            </OverlayTrigger>
            <Form className='float-end'>
              {this.state.showEventHistory ? (
                <FormControl
                  size='sm'
                  type='text'
                  placeholder='Filter'
                  className='me-2'
                  onKeyPress={this.handleKeyDown}
                  onChange={this.handleSearchChange}
                />
              ) : null}
            </Form>
            <div className='float-end mt-1 pe-2 text-primary' style={{ fontSize: '.85rem' }} onClick={this.toggleASNAP}>
              {this.state.hideASNAP ? 'Show ASNAP' : 'Hide ASNAP'}
            </div>
          </React.Fragment>
        ) : null}
      </Card.Header>
    )
  }

  renderEventHistoryBody() {
    if (!this.state.showEventHistory) {
      return null
    }

    return (
      <React.Fragment>
        <ListGroup variant='flush' className={`eventList ${!this.state.showExpandedEventHistory ? 'collapsed' : ''}`} ref={eventHistoryRef}>
          {this.renderEventHistory()}
        </ListGroup>
        <Card.Footer>
          <Button
            className='me-1'
            size={'sm'}
            variant={this.state.activePage === 1 ? 'outline' : 'outline-primary'}
            onClick={() => this.firstPage()}
            disabled={this.state.activePage === 1}
          >
            Newest Events
          </Button>
          <Button
            className='me-1'
            size={'sm'}
            variant={this.state.activePage === 1 ? 'outline' : 'outline-primary'}
            onClick={() => this.decrementPage()}
            disabled={this.state.activePage === 1}
          >
            Newer Events
          </Button>
          <Button
            size={'sm'}
            variant='outline-primary'
            onClick={() => this.incrementPage()}
            disabled={this.state.events && this.state.events.length !== 20}
          >
            Older Events
          </Button>
        </Card.Footer>
      </React.Fragment>
    )
  }

  renderEventHistoryCard() {
    return (
      <Card className={this.props.className}>
        {this.renderEventHistoryHeader()}
        {this.renderEventHistoryBody()}
      </Card>
    )
  }

  render() {
    return (
      <React.Fragment>
        {this.renderNewestEventCard()}
        {this.renderEventHistoryCard()}
      </React.Fragment>
    )
  }
}

EventHistory.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  className: PropTypes.string.isRequired,
  roles: PropTypes.array,
  showModal: PropTypes.func.isRequired,
  updateEvent: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    authenticated: state.auth.authenticated,
    roles: state.user.profile.roles
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(EventHistory)
