import React, { Component } from 'react'
import { connect } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ButtonToolbar, Container, Row, Col, Tabs, Tab, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'
import EventShowDetailsModal from './event_show_details_modal'
import LoweringGalleryTab from './lowering_gallery_tab'
import LoweringModeDropdown from './lowering_mode_dropdown'
import { get_event_aux_data_by_lowering } from '../api'
import { IMAGES_AUX_DATA_SOURCES } from '../client_settings'
import { _Lowerings_ } from '../vocab'
import * as mapDispatchToProps from '../actions'

class LoweringGallery extends Component {
  constructor(props) {
    super(props)

    this.state = {
      fetching: false,
      aux_data: [],
      maxImagesPerPage: 16
    }

    this.formRef = React.createRef() // Reference to the slider

    this.handleImageCountChange = this.handleImageCountChange.bind(this)
    this.handleLoweringModeSelect = this.handleLoweringModeSelect.bind(this)
  }

  componentDidMount() {
    this.initLoweringImages(this.props.match.params.id)

    if (!this.props.lowering.id || this.props.lowering.id !== this.props.match.params.id || this.props.event.events.length === 0) {
      this.props.initLowering(this.props.match.params.id)
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.event.hideASNAP !== this.props.event.hideASNAP) {
      this.initLoweringImages(this.props.match.params.id)
    }
  }

  toggleASNAP() {
    this.props.toggleASNAP()
    this.props.eventUpdateLoweringReplay()
  }

  async initLoweringImages(id, auxDatasourceFilter = IMAGES_AUX_DATA_SOURCES) {
    this.setState({ fetching: true })

    let query = {
      datasource: auxDatasourceFilter,
      value: this.props.event.hideASNAP ? ['!ASNAP'] : null
    }

    const aux_data = await get_event_aux_data_by_lowering(query, id)

    let image_data = {}
    aux_data.forEach((data) => {
      for (let i = 0; i < data.data_array.length; i += 2) {
        if (!(data.data_array[i].data_value in image_data)) {
          image_data[data.data_array[i].data_value] = { images: [] }
        }

        image_data[data.data_array[i].data_value].images.push({
          event_id: data.event_id,
          filepath: data.data_array[i + 1].data_value
        })
      }
    })

    this.setState({ aux_data: image_data, fetching: false })
  }

  handleImageCountChange(event) {
    this.setState({ maxImagesPerPage: parseInt(event.target.value) })
    event.currentTarget.blur()
  }

  handleLoweringModeSelect(mode) {
    if (mode === 'Map') {
      this.props.gotoLoweringMap(this.props.match.params.id)
    } else if (mode === 'Replay') {
      this.props.gotoLoweringReplay(this.props.match.params.id)
    }
  }

  handleTabSelect(key, event) {
    if (event) {
      event.currentTarget.blur()
    }
  }

  renderGalleries() {
    let galleries = []
    for (const [key, value] of Object.entries(this.state.aux_data)) {
      galleries.push(
        <Tab key={`tab_${key}`} eventKey={`tab_${key}`} title={key}>
          <LoweringGalleryTab imagesSource={key} imagesData={value} maxImagesPerPage={this.state.maxImagesPerPage} />
        </Tab>
      )
    }

    return galleries.length ? (
      <Tabs
        className='category-tab'
        variant='pills'
        transition={false}
        id='galleries'
        mountOnEnter={true}
        unmountOnExit={true}
        onSelect={this.handleTabSelect}
      >
        {galleries}
      </Tabs>
    ) : (
      <div>
        <hr className='border-secondary' />
        <span className='pl-2'>No images found</span>
      </div>
    )
  }

  render() {
    const galleries = this.state.fetching ? (
      <div>
        <hr className='border-secondary' />
        <span className='pl-2'>Loading...</span>
      </div>
    ) : (
      this.renderGalleries()
    )
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
    const imgCountOptions = [16, 32, 48, 64, 80].map((img_count, idx) => {
      return <option key={`count_option${idx}`}>{img_count}</option>
    })

    return (
      <Container className='mt-2'>
        <EventShowDetailsModal />
        <Row className='d-flex align-items-center justify-content-between'>
          <ButtonToolbar className='align-items-center'>
            <span onClick={() => this.props.gotoCruiseMenu()} className='text-warning'>
              {_Lowerings_}
            </span>
            <FontAwesomeIcon icon='chevron-right' fixedWidth />
            <span className='text-warning'>{this.props.lowering.lowering_id || 'Loading...'}</span>
            <FontAwesomeIcon icon='chevron-right' fixedWidth />
            <LoweringModeDropdown onClick={this.handleLoweringModeSelect} active_mode={'Gallery'} modes={['Replay', 'Map']} />
          </ButtonToolbar>
          <span className='float-right' ref={this.formRef}>
            <Form style={{ marginTop: '-4px' }} className='float-right' inline>
              <Form.Group controlId='selectMaxImagesPerPage'>
                <Form.Control size='sm' as='select' onChange={this.handleImageCountChange}>
                  {imgCountOptions}
                </Form.Control>
                <Form.Label>&nbsp;&nbsp;Images/Page&nbsp;&nbsp;</Form.Label>
              </Form.Group>
            </Form>
            {ASNAPToggle}
          </span>
        </Row>
        <Row>
          <Col>{galleries}</Col>
        </Row>
      </Container>
    )
  }
}

LoweringGallery.propTypes = {
  lowering: PropTypes.object.isRequired,
  event: PropTypes.object.isRequired,
  eventUpdateLoweringReplay: PropTypes.func.isRequired,
  gotoCruiseMenu: PropTypes.func.isRequired,
  gotoLoweringMap: PropTypes.func.isRequired,
  gotoLoweringReplay: PropTypes.func.isRequired,
  initLowering: PropTypes.func.isRequired,
  match: PropTypes.object.isRequired,
  toggleASNAP: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    roles: state.user.profile.roles,
    event: state.event,
    lowering: state.lowering.lowering
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(LoweringGallery)
