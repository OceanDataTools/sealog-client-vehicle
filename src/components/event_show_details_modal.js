import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { connectModal } from 'redux-modal'
import PropTypes from 'prop-types'
import { Row, Col, Card, Modal } from 'react-bootstrap'
import ImagePreviewModal from './image_preview_modal'
import AuxDataCards from './aux_data_cards'
import EventCommentCard from './event_comment_card'
import EventOptionsCard from './event_options_card'
import ImageryCards from './imagery_cards'
import { EXCLUDE_AUX_DATA_SOURCES, IMAGES_AUX_DATA_SOURCES, AUX_DATA_SORT_ORDER } from '../client_settings'
import { get_event_exports, handle_image_file_download } from '../api'
import * as mapDispatchToProps from '../actions'

const excludeAuxDataSources = Array.from(new Set([...EXCLUDE_AUX_DATA_SOURCES, ...IMAGES_AUX_DATA_SOURCES]))

class EventShowDetailsModal extends Component {
  constructor(props) {
    super(props)

    this.state = { event: {} }
    this.handleImagePreviewModal = this.handleImagePreviewModal.bind(this)
  }

  componentDidMount() {
    this.initEvent()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.event !== this.props.event) {
      if (this.props.event && this.props.event.id) {
        this.initEvent()
      } else {
        this.setState({ event: {} })
      }
    }
  }

  async initEvent() {
    const event = await get_event_exports({}, this.props.event.id)
    this.setState({ event })
  }

  handleImagePreviewModal(source, filepath) {
    this.props.showModal('imagePreview', { name: source, filepath: filepath })
  }

  render() {
    const { show, event } = this.props

    const event_free_text_card = this.state.event.event_free_text ? (
      <Col className='event-data-col' sm={6} md={4}>
        <Card className='event-data-card'>
          <Card.Header>Free-form Text</Card.Header>
          <Card.Body>{this.state.event.event_free_text}</Card.Body>
        </Card>
      </Col>
    ) : null

    const framegrab_data_sources = this.state.event.aux_data
      ? this.state.event.aux_data.filter((aux_data) => IMAGES_AUX_DATA_SOURCES.includes(aux_data.data_source))
      : []
    const aux_data = this.state.event.aux_data
      ? this.state.event.aux_data.filter((data) => !excludeAuxDataSources.includes(data.data_source))
      : []
    aux_data.sort((a, b) => {
      return AUX_DATA_SORT_ORDER.indexOf(a.data_source) < AUX_DATA_SORT_ORDER.indexOf(b.data_source) ? -1 : 1
    })

    if (event) {
      if (this.state.event.event_options) {
        return (
          <Modal size='lg' show={show} onHide={this.props.handleHide}>
            <ImagePreviewModal handleDownload={handle_image_file_download} />
            <Modal.Header className='bg-light pb-0' closeButton>
              <Modal.Title as="h5">
                Event Details:
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className='px-4'>
              <Row>
                <Col className='event-data-col' xs={12}>
                  <Card className='event-header-card'>
                    <Card.Header>
                      <span>{this.state.event.event_value}</span>
                      <span className='float-right'>
                        {this.state.event.event_author}
                        {' @ '}
                        {this.state.event.ts}
                      </span>
                    </Card.Header>
                  </Card>
                </Col>
              </Row>
              <Row>
                <ImageryCards framegrab_data_sources={framegrab_data_sources} onClick={this.handleImagePreviewModal} lg={4} />
                <AuxDataCards aux_data={aux_data} lg={4} />
                <EventOptionsCard event={this.state.event} lg={4} />
                {event_free_text_card}
                <EventCommentCard event={this.state.event} lg={4} filter_comment={false}/>
              </Row>
            </Modal.Body>
          </Modal>
        )
      } else {
        return (
          <Modal size='lg' show={show} onHide={this.props.handleHide}>
            <Modal.Header className='bg-light' closeButton>
              <Modal.Title as='h5'>Event Details: {this.state.event.event_value}</Modal.Title>
            </Modal.Header>
            <Modal.Body>Loading...</Modal.Body>
          </Modal>
        )
      }
    } else {
      return null
    }
  }
}

EventShowDetailsModal.propTypes = {
  event: PropTypes.object,
  handleHide: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  showModal: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    cruise: state.cruise.cruise,
    roles: state.user.profile.roles
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  connectModal({ name: 'eventShowDetails', destroyOnHide: true })
)(EventShowDetailsModal)
