import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Card, Col } from 'react-bootstrap'

class EventCommentCard extends Component {
  render() {
    if (!this.props.event || !this.props.event.event_options) {
      return null
    }

    const event_comment = this.props.event.event_options.find((event_option) => {
      if (event_option.event_option_name === 'event_comment') {
        return event_option
      }
    })

    return event_comment ? (
      <Col className='event-data-col' sm={this.props.sm || 6} md={this.props.md || 4} lg={this.props.lg || 3}>
        <Card className='event-data-card'>
          <Card.Header>Comment</Card.Header>
          <Card.Body>{event_comment.event_option_value}</Card.Body>
        </Card>
      </Col>
    ) : null
  }
}

EventCommentCard.propTypes = {
  event: PropTypes.object.isRequired,
  sm: PropTypes.number,
  md: PropTypes.number,
  lg: PropTypes.number
}

export default EventCommentCard
