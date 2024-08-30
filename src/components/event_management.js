import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { connect } from 'react-redux'
import { Card, Col, Container, Form, ListGroup, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import PropTypes from 'prop-types'
import EventFilterForm from './event_filter_form'
import EventCommentModal from './event_comment_modal'
import DeleteEventModal from './delete_event_modal'
import EventShowDetailsModal from './event_show_details_modal'
import CustomPagination from './custom_pagination'
import ExportDropdown from './export_dropdown'
import { get_events, get_events_count, get_events_by_cruise, get_events_count_by_cruise, get_cruises } from '../api'
import * as mapDispatchToProps from '../actions'

const maxEventsPerPage = 15
const maxEventDownload = 15000

class EventManagement extends Component {
  constructor(props) {
    super(props)

    this.state = {
      hideASNAP: true,
      cruise_id: null,
      activePage: 1,
      fetching: false,
      events: [],
      eventCount: 0,
      eventFilter: {}
    }

    this.initEvents = this.initEvents.bind(this)
    this.handleEventUpdate = this.handleEventUpdate.bind(this)
    this.handleEventDelete = this.handleEventDelete.bind(this)
    this.handlePageSelect = this.handlePageSelect.bind(this)
    this.updateEventFilter = this.updateEventFilter.bind(this)
  }

  componentDidMount() {
    this.initEvents()
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.roles !== this.props.roles) {
      this.initEvents()
    }

    if (prevState.activePage !== this.state.activePage) {
      this.fetchEvents()
    }

    if (prevState.eventFilter !== this.state.eventFilter) {
      if (this.state.activePage > 1) {
        this.setState({ activePage: 1 })
      } else {
        this.fetchEvents()
      }
      this.fetchEventsCount()
    }

    if (prevState.hideASNAP !== this.state.hideASNAP) {
      this.setState({ activePage: 1 })
      this.fetchEvents()
      this.fetchEventsCount()
    }
  }

  handlePageSelect(eventKey) {
    this.setState({ activePage: eventKey })
  }

  handleEventCommentModal(event) {
    this.props.showModal('eventComment', {
      event: event,
      handleUpdateEvent: this.handleEventUpdate
    })
  }

  updateEventFilter(filter = {}) {
    this.setState({ eventFilter: filter })
  }

  async handleEventUpdate(formProps) {
    await this.props.updateEvent(formProps)
    this.fetchEvents()
    // const response = await this.props.updateEvent(formProps);
    // if(response.response.status === 204) {
    //   this.setState(prevState => ({ events: prevState.events.map((event) => {
    //     if(event.id === event_id) {
    //       event.event_options = event_options;
    //     }
    //     return event;
    //   })
    //   }));
    // }
  }

  handleEventDeleteModal(event) {
    this.props.showModal('deleteEvent', {
      id: event.id,
      handleDelete: this.handleEventDelete
    })
  }

  async handleEventDelete(id) {
    const response = await this.props.deleteEvent(id)
    if (response.success) {
      if (this.state.events.length % maxEventsPerPage === 0 && this.state.events.length / maxEventsPerPage === this.state.activePage - 1) {
        this.handlePageSelect(this.state.activePage - 1)
      }
      this.setState({
        events: this.state.events.filter((event) => event.id !== id)
      })
      if (this.state.events.length % maxEventsPerPage === 0 && this.state.events.length / maxEventsPerPage === this.state.activePage - 1) {
        this.handlePageSelect(this.state.activePage - 1)
      }
    }
  }

  handleEventShowDetailsModal(event) {
    this.props.showModal('eventShowDetails', {
      event: event,
      handleUpdateEvent: this.handleEventUpdate
    })
  }

  async initEvents() {
    if (!this.props.roles) {
      return
    }

    if (this.props.roles && !this.props.roles.includes('admin')) {
      let query = {
        startTS: new Date().toISOString()
      }

      query.stopTS = query.startTS
      const cruises = await get_cruises(query)

      if (cruises.length) {
        this.setState({ cruise_id: cruises[0].id })
      } else {
        this.setState({ events: [], eventCount: 0, fetching: false })
        return
      }
    }

    this.fetchEvents()
    this.fetchEventsCount()
  }

  async fetchEvents() {
    this.setState({ fetching: true })

    if (this.props.roles && !this.props.roles.includes('admin') && !this.state.cruise_id) {
      this.setState({ fetching: false })
      return
    }

    let eventFilter_value = this.state.eventFilter.value ? this.state.eventFilter.value : this.state.hideASNAP ? '!ASNAP' : null

    let query = {
      ...this.state.eventFilter,
      value: eventFilter_value ? eventFilter_value.split(',') : null,
      sort: 'newest',
      offset: (this.state.activePage - 1) * maxEventsPerPage,
      limit: maxEventsPerPage
    }
    const events = this.state.cruise_id ? await get_events_by_cruise(query, this.state.cruise_id) : await get_events(query)
    this.setState({ events, fetching: false })
  }

  async fetchEventsCount() {
    if (this.props.roles && !this.props.roles.includes('admin') && !this.state.cruise_id) {
      return
    }

    let eventFilter_value = this.state.eventFilter.value ? this.state.eventFilter.value : this.state.hideASNAP ? '!ASNAP' : null

    let query = {
      ...this.state.eventFilter,
      value: eventFilter_value ? eventFilter_value.split(',') : null,
      sort: 'newest'
    }
    const eventCount = this.state.cruise_id ? await get_events_count_by_cruise(query, this.state.cruise_id) : await get_events_count(query)

    this.setState({ eventCount })
  }

  async toggleASNAP() {
    await this.setState((prevState) => ({
      hideASNAP: !prevState.hideASNAP,
      activePage: 1
    }))
    this.fetchEvents()
  }

  renderEventListHeader() {
    const Label = 'Filtered Events'
    const ASNAPToggle = (
      <Form.Check
        id='ASNAP'
        type='switch'
        inline
        checked={!this.state.hideASNAP}
        onChange={() => this.toggleASNAP()}
        disabled={this.state.fetching}
        label='ASNAP'
        className='mr-0'
      />
    )

    return (
      <div>
        {Label}
        <span className='float-right'>
          {ASNAPToggle}
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
        let eventOptions = eventOptionsArray.length > 0 ? '--> ' + eventOptionsArray.join(', ') : ''
        let commentIcon = comment_exists ? (
          <FontAwesomeIcon onClick={() => this.handleEventCommentModal(event)} icon='comment' fixedWidth transform='grow-4' />
        ) : (
          <span onClick={() => this.handleEventCommentModal(event)} className='fa-layers fa-fw'>
            <FontAwesomeIcon icon='comment' fixedWidth transform='grow-4' />
            <FontAwesomeIcon className={'text-secondary'} icon='plus' fixedWidth inverse transform='shrink-4' />
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
          <FontAwesomeIcon className={'text-danger'} onClick={() => this.handleEventDeleteModal(event)} icon='trash' fixedWidth />
        )
        let deleteTooltip =
          this.props.roles && this.props.roles.includes('admin') ? (
            <OverlayTrigger placement='top' overlay={<Tooltip id={`deleteTooltip_${event.id}`}>Delete this event</Tooltip>}>
              {deleteIcon}
            </OverlayTrigger>
          ) : null

        return (
          <ListGroup.Item className='event-list-item' key={event.id}>
            <span onClick={() => this.handleEventShowDetailsModal(event)}>
              {event.ts} {`<${event.event_author}>`}: {event.event_value} {eventOptions}
            </span>
            <span className='float-right'>
              {deleteTooltip} {commentTooltip}
            </span>
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
        <ListGroup className='eventList'>{this.renderEvents()}</ListGroup>
      </Card>
    )
  }

  render() {
    return (
      <Container className='mt-2'>
        <EventCommentModal />
        <DeleteEventModal />
        <EventShowDetailsModal />
        <Row>
          <Col className='px-1 pb-2' sm={12} md={9} lg={9}>
            {this.renderEventCard()}
            <CustomPagination
              className='mt-2'
              page={this.state.activePage}
              count={this.state.eventCount}
              pageSelectFunc={this.handlePageSelect}
              maxPerPage={maxEventsPerPage}
            />
          </Col>
          <Col className='px-1 pb-2' sm={12} md={3} lg={3}>
            <EventFilterForm
              disabled={this.state.fetching}
              hideASNAP={this.state.hideASNAP}
              handlePostSubmit={this.updateEventFilter}
              sort='newest'
            />
          </Col>
        </Row>
      </Container>
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
