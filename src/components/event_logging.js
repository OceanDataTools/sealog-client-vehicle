import React, { Component } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import EventTemplateList from './event_template_list'
import EventHistory from './event_history'
import EventInput from './event_input'
import EventCommentModal from './event_comment_modal'
import { Row, Col } from 'react-bootstrap'
import EventShowDetailsModal from './event_show_details_modal'

class EventLogging extends Component {
  render() {
    if (this.props.roles && this.props.roles.some((item) => ['admin', 'cruise_manager', 'event_logger'].includes(item))) {
      return (
        <React.Fragment>
          <EventShowDetailsModal />
          <EventCommentModal />
          <Row>
            <Col>
              <EventTemplateList />
            </Col>
          </Row>
          <Row>
            <Col>
              <EventInput className='mt-2 event-input' />
            </Col>
          </Row>
          <Row>
            <Col>
              <EventHistory className='mt-2' />
            </Col>
          </Row>
        </React.Fragment>
      )
    } else if (this.props.roles && this.props.roles.includes('event_watcher')) {
      return (
        <div>
          <EventShowDetailsModal />
          <Row>
            <Col>
              <EventHistory className='mt-2' />
            </Col>
          </Row>
        </div>
      )
    }
    return null
  }
}

EventLogging.propTypes = {
  roles: PropTypes.array
}

const mapStateToProps = (state) => {
  return {
    roles: state.user.profile.roles
  }
}

export default connect(mapStateToProps)(EventLogging)
