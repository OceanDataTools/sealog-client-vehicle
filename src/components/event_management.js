import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { connect } from 'react-redux'
import { Card, Col, ListGroup, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import PropTypes from 'prop-types'
import EventFilterForm from './event_filter_form'
import EventCommentModal from './event_comment_modal'
import DeleteModal from './delete_modal'
import EventShowDetailsModal from './event_show_details_modal'
import CustomPagination from './custom_pagination'
import ExportDropdown from './export_dropdown'
import { get_events, get_events_count } from '../api'
import { Client } from '@hapi/nes/lib/client'
import { WS_ROOT_URL } from '../client_settings'
import { buildEventQuery, connectWSClient, resolveStartTS } from '../utils'
import * as mapDispatchToProps from '../actions'

const maxEventsPerPage = 15
const maxEventDownload = 15000

class EventManagement extends Component {
  constructor(props) {
    super(props)

    this.state = {
      activePage: 1,
      eventCount: 0,
      eventFilter: {},
      events: [],
      fetching: false,
      hideASNAP: true,
      startTS: null
    }

    this.handleEventUpdate = this.handleEventUpdate.bind(this)
    this.handleEventDelete = this.handleEventDelete.bind(this)
    this.handlePageSelect = this.handlePageSelect.bind(this)
    this.toggleASNAP = this.toggleASNAP.bind(this)
    this.updateEventFilter = this.updateEventFilter.bind(this)
    this.connectToWS = this.connectToWS.bind(this)

    this.client = new Client(`${WS_ROOT_URL}`)
  }

  componentDidMount() {
    this.initStartTS()
    this.connectToWS()
  }

  componentWillUnmount() {
    this.client.disconnect()
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.roles != this.props.roles) {
      this.initStartTS()
    }

    if (prevState.activePage !== this.state.activePage) {
      this.fetchEvents()
    }

    if (prevState.eventFilter !== this.state.eventFilter) {
      this.setState({ activePage: 1 }, () => this.fetchEvents())
    }

    if (prevState.hideASNAP !== this.state.hideASNAP) {
      this.setState({ activePage: 1 }, () => this.fetchEvents())
    }
  }

  async connectToWS() {
    const updateHandler = async () => {
      await this.fetchEvents()
    }

    await connectWSClient(this.client, {
      '/ws/status/newEvents': updateHandler,
      '/ws/status/updateEvents': updateHandler,
      '/ws/status/deleteEvents': updateHandler
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
      eventFilterValue: this.state.eventFilter.value,
      hideASNAP: this.state.hideASNAP,
      activePage: this.state.activePage,
      maxPerPage: maxEventsPerPage,
      extraFilter: this.state.eventFilter
    })

    const events = await get_events(query)
    const eventCount = await get_events_count(query)
    this.setState({ events, eventCount, fetching: false })
  }

  handleEventCommentModal(event) {
    this.props.showModal('eventComment', {
      event: event,
      handleUpdateEvent: this.handleEventUpdate
    })
  }

  async handleEventDelete(id) {
    const response = await this.props.deleteEvent(id)
    if (response.success) {
      const newCount = this.state.eventCount - 1
      const maxPage = Math.max(1, Math.ceil(newCount / maxEventsPerPage))
      const newPage = Math.min(this.state.activePage, maxPage)
      this.setState({ activePage: newPage }, () => this.fetchEvents())
    }
  }

  handleEventDeleteModal(event) {
    this.props.showModal('deleteModal', {
      id: event.id,
      handleDelete: this.handleEventDelete,
      message: 'this event'
    })
  }

  handlePageSelect(eventKey) {
    this.setState({ activePage: eventKey })
  }

  async handleEventUpdate(formProps) {
    await this.props.updateEvent(formProps)
    this.fetchEvents()
  }

  handleEventShowDetailsModal(event) {
    this.props.showModal('eventShowDetails', {
      event: event,
      handleUpdateEvent: this.handleEventUpdate
    })
  }

  toggleASNAP() {
    this.setState(
      (prevState) => ({ hideASNAP: !prevState.hideASNAP, activePage: 1 }),
      () => this.fetchEvents()
    )
  }

  updateEventFilter(filter = {}) {
    this.setState({ eventFilter: filter })
  }

  renderEventListHeader() {
    const Label = 'Filtered Events'

    return (
      <div>
        {Label}
        <span className='float-end'>
          <span className='me-2 text-primary' style={{ fontSize: '.85rem' }} onClick={this.toggleASNAP}>
            {this.state.hideASNAP ? 'Show ASNAP' : 'Hide ASNAP'}
          </span>
          <ExportDropdown
            id='dropdown-download'
            disabled={this.state.fetching || this.state.eventCount > maxEventDownload}
            hideASNAP={this.state.hideASNAP}
            eventFilter={this.state.eventFilter}
          />
        </span>
      </div>
    )
  }

  renderEvents() {
    if (this.state.events && this.state.events.length > 0) {
      let eventList = this.state.events.map((event) => {
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
          <OverlayTrigger placement='top' overlay={<Tooltip id={`commentTooltip_${event.id}`}>Edit/View Comment</Tooltip>}>
            {commentIcon}
          </OverlayTrigger>
        ) : (
          <OverlayTrigger placement='top' overlay={<Tooltip id={`commentTooltip_${event.id}`}>Add Comment</Tooltip>}>
            {commentIcon}
          </OverlayTrigger>
        )

        let deleteIcon = (
          <FontAwesomeIcon className={'text-danger me-1'} onClick={() => this.handleEventDeleteModal(event)} icon='trash' fixedWidth />
        )
        let deleteTooltip =
          this.props.roles && this.props.roles.some((role) => ['admin', 'event_manager'].includes(role)) ? (
            <OverlayTrigger placement='top' overlay={<Tooltip id={`deleteTooltip_${event.id}`}>Delete this event</Tooltip>}>
              {deleteIcon}
            </OverlayTrigger>
          ) : null

        return (
          <ListGroup.Item key={event.id} className='event-list-item d-flex justify-content-between'>
            <div onClick={() => this.handleEventShowDetailsModal(event)}>
              {event.ts}{' '}
              <b>
                <i>{event.event_author}</i>
              </b>
              : {event.event_value} {eventOptions ? <FontAwesomeIcon icon='arrow-right' fixedWidth /> : null} {eventOptions}
            </div>
            <div style={{ minWidth: '44px' }}>
              {deleteTooltip}
              {commentTooltip}
            </div>
          </ListGroup.Item>
        )
      })

      return eventList
    }

    return (
      <ListGroup.Item className='event-list-item' key='emptyHistory'>
        No events found
      </ListGroup.Item>
    )
  }

  renderEventCard() {
    if (!this.state.events) {
      return (
        <Card className='border-secondary'>
          <Card.Header>{this.renderEventListHeader()}</Card.Header>
          <Card.Body>Loading...</Card.Body>
        </Card>
      )
    }

    return (
      <Card className='border-secondary'>
        <Card.Header>{this.renderEventListHeader()}</Card.Header>
        <ListGroup>{this.renderEvents()}</ListGroup>
      </Card>
    )
  }

  render() {
    return (
      <React.Fragment>
        <EventCommentModal />
        <DeleteModal />
        <EventShowDetailsModal />
        <Row className='py-2 px-1'>
          <Col className='px-1' sm={12} md={8} lg={9}>
            {this.renderEventCard()}
            <CustomPagination
              className='pt-2'
              page={this.state.activePage}
              count={this.state.eventCount}
              pageSelectFunc={this.handlePageSelect}
              maxPerPage={maxEventsPerPage}
            />
          </Col>
          <Col className='px-1' sm={12} md={4} lg={3}>
            <EventFilterForm
              disabled={this.state.fetching}
              hideASNAP={this.state.hideASNAP}
              handlePostSubmit={this.updateEventFilter}
              sort='newest'
            />
          </Col>
        </Row>
      </React.Fragment>
    )
  }
}

EventManagement.propTypes = {
  deleteEvent: PropTypes.func.isRequired,
  roles: PropTypes.array,
  showModal: PropTypes.func.isRequired,
  updateEvent: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    roles: state.user.profile.roles
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(EventManagement)
