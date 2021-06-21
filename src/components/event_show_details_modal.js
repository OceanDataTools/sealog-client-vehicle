import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { connectModal } from 'redux-modal';
import PropTypes from 'prop-types';
import axios from 'axios';
import Cookies from 'universal-cookie';
import { Row, Col, Image, Card, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import ImagePreviewModal from './image_preview_modal';

import * as mapDispatchToProps from '../actions';

import { API_ROOT_URL } from '../client_config';
import { getImageUrl, handleMissingImage } from '../utils';

const cookies = new Cookies();

const excludeAuxDataSources = ['vehicleRealtimeFramegrabberData','vehicleRealtimeFramegrabber2Data','vehicleRealtimeVideoFileData','vehicleRealtimeVideoFile2Data']

const imageAuxDataSources = ['vehicleRealtimeFramegrabberData','vehicleRealtimeFramegrabber2Data']
const videoAuxDataSources = ['vehicleRealtimeVideoFileData','vehicleRealtimeVideoFile2Data']

const sortAuxDataSourceReference = ['vehicleRealtimeNavData','vesselRealtimeNavData'];

class EventShowDetailsModal extends Component {

  constructor (props) {
    super(props);

    this.state = { event: {} }

    this.handleImageClick = this.handleImageClick.bind(this);

  }

  static propTypes = {
    event: PropTypes.object,
    handleHide: PropTypes.func.isRequired
  };

  componentDidMount() {
    this.initEvent()
  }

  componentWillUnmount() {
  }

  async initEvent() {
    try {
      const response = await axios.get(`${API_ROOT_URL}/api/v1/event_exports/${this.props.event.id}`,
        {
          headers: {
          authorization: cookies.get('token')
          }
        }      
      )
      this.setState({event: response.data});
    }
    catch(error) {
      console.log(error);
    }    
  }

  handleImageClick(source, filepath) {
    this.props.showModal('imagePreview', { name: source, filepath: filepath })
  }

  renderImage(source, filepath, videoData = null) {

    const videoFilename = (videoData) ? <OverlayTrigger placement="top" overlay={<Tooltip id="videoFilename">{videoData['videoFilename']}</Tooltip>}><FontAwesomeIcon className="mr-1" icon="file"/></OverlayTrigger> : "";
    const videoElapse = (videoData) ? <OverlayTrigger placement="top" overlay={<Tooltip id="videoFilename">{videoData['videoElapse']}</Tooltip>}><FontAwesomeIcon className="mr-1" icon={["far", "clock"]}/></OverlayTrigger> : "";

    return (
      <Card  className="event-image-data-card" id={`image_${source}`}>
        <Image fluid onError={handleMissingImage} src={filepath} onClick={ () => this.handleImageClick(source, filepath)} />
        <span>{source.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}<span className="float-right">{videoFilename}{videoElapse}</span></span>

      </Card>
    );
  }

  renderImageryCard() {
    if(this.props.event && this.state.event.aux_data) { 
      let frameGrabberData = this.state.event.aux_data.filter(aux_data => imageAuxDataSources.includes(aux_data.data_source));
      let videoLoggerData = this.state.event.aux_data.filter(aux_data => videoAuxDataSources.includes(aux_data.data_source));

      if(frameGrabberData.length === 0) {
        return null;
      }

      return frameGrabberData.map((frameGrabber,idx) => {

        let tmpData = [];
        for (let i = 0; i < frameGrabber.data_array.length; i+=2) {

          const videoDataIndex = videoLoggerData[idx].data_array.findIndex((data) => data.data_value === frameGrabber.data_array[i].data_value)

          const videoData = (videoDataIndex != null) ? { 
              videoFilename: videoLoggerData[idx].data_array[videoDataIndex + 1]['data_value'],
              videoElapse: videoLoggerData[idx].data_array[videoDataIndex + 2]['data_value']
            }
          : null

          tmpData.push({
            source: frameGrabber.data_array[i].data_value,
            filepath: getImageUrl(frameGrabber.data_array[i+1].data_value),
            videoData: videoData
          });
        }

        return (
          tmpData.map((camera) => {
            return (
              <Col className="px-1 mb-2" key={camera.source} xs={12} sm={6} md={4} lg={3}>
                {this.renderImage(camera.source, camera.filepath, camera.videoData)}
              </Col>
            );
          })
        )
      });
    }
  }

  renderEventOptionsCard() {

    // return null;
    let return_event_options = this.state.event.event_options.reduce((filtered, event_option, index) => {
      if(event_option.event_option_name !== 'event_comment') {
        filtered.push(<div key={`event_option_${index}`}><span className="data-name">{event_option.event_option_name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span> <span className="float-right" style={{wordWrap:'break-word'}} >{event_option.event_option_value}</span><br/></div>);
      }
      return filtered
    },[])

    return (return_event_options.length > 0)? (
      <Col className="px-1 pb-2" xs={12} sm={6} md={6} lg={4}>
        <Card className="event-data-card">
          <Card.Header>Event Options</Card.Header>
          <Card.Body>
            {return_event_options}
          </Card.Body>
        </Card>
      </Col>
    ) : null
  }

  renderAuxDataCard() {

    if(this.state.event && this.state.event.aux_data) {

      const aux_data = this.state.event.aux_data.filter((data) => !excludeAuxDataSources.includes(data.data_source))

      aux_data.sort((a, b) => {
        return (sortAuxDataSourceReference.indexOf(a.data_source) < sortAuxDataSourceReference.indexOf(b.data_source)) ? -1 : 1;
      });

      let return_aux_data = aux_data.map((aux_data) => {
        const aux_data_points = aux_data.data_array.map((data, index) => {
          return(<div key={`${aux_data.data_source}_data_point_${index}`}><span className="data-name">{data.data_name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span> <span className="float-right" style={{wordWrap:'break-word'}} >{data.data_value} {data.data_uom}</span><br/></div>);
        });

        return (
          <Col className="px-1 pb-2" key={`${aux_data.data_source}_col`} sm={6} md={6} lg={4}>
            <Card className="event-data-card" key={`${aux_data.data_source}`}>
              <Card.Header>{aux_data.data_source.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</Card.Header>
              <Card.Body>
                {aux_data_points}
              </Card.Body>
            </Card>
          </Col>
        );
      });

      return return_aux_data;
    }

    return null;
  }

  render() {
    const { show, event } = this.props

    const event_free_text_card = (this.state.event.event_free_text)? (<Col className="px-1 pb-2" xs={12}><Card className="event-data-card"><Card.Body>Free-form Text: {this.state.event.event_free_text}</Card.Body></Card></Col>) : null;
    const event_comment = (this.state.event.event_options) ? this.state.event.event_options.find((event_option) => (event_option.event_option_name === 'event_comment' && event_option.event_option_value.length > 0)) : null

    const event_comment_card = (event_comment)?(<Col className="px-1" xs={12}><Card className="event-data-card"><Card.Body>Comment: {event_comment.event_option_value}</Card.Body></Card></Col>) : null;
    
    if (event ) {
      if(this.state.event.event_options) {
        return (
          <Modal size="lg" show={show} onHide={this.props.handleHide}>
              <ImagePreviewModal />
              <Modal.Header closeButton>
                <Modal.Title as="h5">Event Details: {this.state.event.event_value}</Modal.Title>
              </Modal.Header>

              <Modal.Body className="px-4">
                <Row>
                  <Col className="px-1 pb-2" xs={12}>
                    <Card className="event-data-card">
                      <Card.Body>
                        <span>User: {this.state.event.event_author}</span>
                        <span className="float-right">Date: {this.state.event.ts}</span>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                <Row>
                  {this.renderImageryCard()}
                  {this.renderAuxDataCard()}
                  {this.renderEventOptionsCard()}
                </Row>
                <Row>
                  {event_free_text_card}
                  {event_comment_card}
                </Row>
              </Modal.Body>
          </Modal>
        );
      } else {
        return (
          <Modal size="lg" show={show} onHide={this.props.handleHide}>
            <Modal.Header closeButton>
              <Modal.Title as="h5">Event Details: {this.state.event.event_value}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Loading...
            </Modal.Body>
          </Modal>
        );
      }
    }
    else {
      return null;
    }
  }
}

function mapStateToProps(state) {

  return {
    lowering: state.lowering.lowering,
    roles: state.user.profile.roles,
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  connectModal({ name: 'eventShowDetails', destroyOnHide: true }) 
)(EventShowDetailsModal)
