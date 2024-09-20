import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Row, Col, Card, Image } from 'react-bootstrap'
import CustomPagination from './custom_pagination'
import { getImageUrl, handleMissingImage } from '../utils'
import * as mapDispatchToProps from '../actions'

class LoweringGalleryTab extends Component {
  constructor(props) {
    super(props)

    this.state = {
      activePage: 1,
      selectedPage: 1,
      paginationTimer: null
    }

    this.handlePageSelect = this.handlePageSelect.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.maxImagesPerPage !== this.props.maxImagesPerPage) {
      const currentFirstImage = (this.state.activePage - 1) * prevProps.maxImagesPerPage + 1
      this.handlePageSelect(Math.ceil(currentFirstImage / this.props.maxImagesPerPage))
    }
  }

  componentWillUnmount() {
    if (this.state.paginationTimer) {
      clearInterval(this.state.paginationTimer)
    }

    document.removeEventListener('keydown', this.handleKeyDown)
  }

  handleKeyDown(event) {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return
    }

    if (
      event.key === 'ArrowRight' &&
      this.state.selectedPage < Math.ceil(this.props.imagesData.images.length / this.props.maxImagesPerPage)
    ) {
      this.handlePageSelect(this.state.selectedPage + 1)
    } else if (event.key === 'ArrowLeft' && this.state.selectedPage > 1) {
      this.handlePageSelect(this.state.selectedPage - 1)
    }
  }

  handlePageSelect(page) {
    this.setState({ selectedPage: page })
    clearTimeout(this.state.paginationTimer)
    this.setState({
      paginationTimer: setTimeout(() => {
        this.setState({
          activePage: this.state.selectedPage
        })
      }, 250)
    })
  }

  handleEventShowDetailsModal(event_id) {
    this.props.showModal('eventShowDetails', {
      event: { id: event_id },
      handleUpdateEvent: this.props.updateEvent
    })
  }

  renderImage(source, filepath, onclickFunc = null) {
    return (
      <Card className='event-image-data-card' id={`image_${source}`}>
        <Image fluid onClick={onclickFunc} onError={handleMissingImage} src={getImageUrl(filepath)} />
      </Card>
    )
  }

  renderGallery(imagesSource, imagesData) {
    return imagesData.images.map((image, index) => {
      if (
        index >= (this.state.activePage - 1) * this.props.maxImagesPerPage &&
        index < this.state.activePage * this.props.maxImagesPerPage
      ) {
        return (
          <Col className='m-0 p-1' key={`${imagesSource}_${image.event_id}`} xs={12} sm={6} md={4} lg={3}>
            {this.renderImage(imagesSource, image.filepath, () => this.handleEventShowDetailsModal(image.event_id))}
          </Col>
        )
      }
    })
  }

  render() {
    return (
      <React.Fragment>
        <Row key={`${this.props.imagesSource}_images`} tabIndex='-1'>
          {this.renderGallery(this.props.imagesSource, this.props.imagesData)}
        </Row>
        <Row key={`${this.props.imagesSource}_images_pagination`}>
          <CustomPagination
            className='mt-2'
            page={this.state.selectedPage}
            count={this.props.imagesData.images ? this.props.imagesData.images.length : 0}
            pageSelectFunc={this.handlePageSelect}
            maxPerPage={this.props.maxImagesPerPage}
          />
        </Row>
      </React.Fragment>
    )
  }
}

LoweringGalleryTab.propTypes = {
  imagesSource: PropTypes.string.isRequired,
  imagesData: PropTypes.object.isRequired,
  maxImagesPerPage: PropTypes.number.isRequired,
  showModal: PropTypes.func.isRequired,
  updateEvent: PropTypes.func.isRequired
}

export default connect(null, mapDispatchToProps)(LoweringGalleryTab)
