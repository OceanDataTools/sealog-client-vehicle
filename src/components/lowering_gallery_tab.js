import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Row, Col, Card, Image } from 'react-bootstrap';
import CustomPagination from './custom_pagination';
import * as mapDispatchToProps from '../actions';
import { ROOT_PATH } from '../client_config';
import { handleMissingImage } from '../utils';

// const maxImagesPerPage = 16

class LoweringGalleryTab extends Component {

  constructor (props) {
    super(props);

    this.divFocus = null;

    this.state = {
      activePage: 1
    }

    this.handlePageSelect = this.handlePageSelect.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);

  }

  static propTypes = {
    imagesSource: PropTypes.string.isRequired,
    imagesData: PropTypes.object.isRequired,
    maxImagesPerPage: PropTypes.number.isRequired
  };

  componentDidMount() {
    this.divFocus.focus();
  }

  handleKeyPress(event) {
    if(event.key === "ArrowRight" && this.state.activePage < Math.ceil(this.props.imagesData.images.length / this.props.maxImagesPerPage)) {
      this.handlePageSelect(this.state.activePage + 1)
    }
    else if(event.key === "ArrowLeft" && this.state.activePage > 1) {
      this.handlePageSelect(this.state.activePage - 1)
    }
  }

  handlePageSelect(eventKey) {
    this.setState({activePage: eventKey});
  }

  handleEventShowDetailsModal(event_id) {
    this.props.showModal('eventShowDetails', { event: { id: event_id } , handleUpdateEvent: this.props.updateEvent });
  }

  renderImage(source, filepath, event_id) {
    return (
      <Card className="event-image-data-card" id={`image_${source}`}>
        <Image fluid onClick={ () => this.handleEventShowDetailsModal(event_id) } onError={handleMissingImage} src={filepath}/>
      </Card>
    )
  }


  renderGallery(imagesSource, imagesData) {
    return imagesData.images.map((image, index) => {
      if(index >= (this.state.activePage-1) * this.props.maxImagesPerPage && index < (this.state.activePage * this.props.maxImagesPerPage)) {
        return (
          <Col className="m-0 p-1" key={`${imagesSource}_${image.event_id}`} xs={12} sm={6} md={4} lg={3}>
            {this.renderImage(imagesSource, image.filepath, image.event_id)}
          </Col>
        )
      }
    })
  }

  render(){
    return (
      <React.Fragment>
        <Row key={`${this.props.imagesSource}_images`} tabIndex="-1" onKeyDown={this.handleKeyPress} ref={(div) => { this.divFocus = div }}>
          {this.renderGallery(this.props.imagesSource, this.props.imagesData)}
        </Row>
        <Row key={`${this.props.imagesSource}_images_pagination`}>
          <CustomPagination className="mt-2" page={this.state.activePage} count={(this.props.imagesData.images)? this.props.imagesData.images.length : 0} pageSelectFunc={this.handlePageSelect} maxPerPage={this.props.maxImagesPerPage}/>
        </Row>
      </React.Fragment>
    )
  }
}

function mapStateToProps() {
  return {}
}

export default connect(mapStateToProps, mapDispatchToProps)(LoweringGalleryTab);
