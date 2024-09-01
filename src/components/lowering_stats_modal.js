import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { connectModal } from 'redux-modal'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Map, TileLayer, WMSTileLayer, Marker, Polyline, Popup, LayersControl, ScaleControl, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import Highcharts from 'highcharts'
import HighchartsExporting from 'highcharts/modules/exporting'
import HighchartsNoDataToDisplay from 'highcharts/modules/no-data-to-display'
import HighchartsReact from 'highcharts-react-official'
import moment from 'moment'
import { Button, Row, Col, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { renderAlert, renderMessage } from './form_elements'
import { highchartsTheme } from '../utils'
import LoweringStatsForm from './lowering_stats_form'
import { DEFAULT_LOCATION, TILE_LAYERS } from '../map_tilelayers'
import { POSITION_DATASOURCES } from '../client_settings'
import { get_event_exports_by_lowering } from '../api'
import * as mapDispatchToProps from '../actions'

// Set custom theme
Highcharts.theme = highchartsTheme
Highcharts.setOptions(Highcharts.theme);

HighchartsExporting(Highcharts)
HighchartsNoDataToDisplay(Highcharts)

const { BaseLayer } = LayersControl

class LoweringStatsModal extends Component {
  constructor(props) {
    super(props)

    this.state = {
      posDataSource: null,

      event: {},
      events: [],

      fetching: false,
      tracklines: {},

      show_edit_form: false,

      zoom: 13,
      center: DEFAULT_LOCATION,
      position: DEFAULT_LOCATION,
      showMarker: false,
      height: '400px',

      milestone_to_edit: null,
      milestones: {
        lowering_start: this.props.lowering.start_ts,
        lowering_descending:
          this.props.lowering.lowering_additional_meta.milestones &&
          this.props.lowering.lowering_additional_meta.milestones.lowering_descending
            ? this.props.lowering.lowering_additional_meta.milestones.lowering_descending
            : null,
        lowering_on_bottom:
          this.props.lowering.lowering_additional_meta.milestones &&
          this.props.lowering.lowering_additional_meta.milestones.lowering_on_bottom
            ? this.props.lowering.lowering_additional_meta.milestones.lowering_on_bottom
            : null,
        lowering_off_bottom:
          this.props.lowering.lowering_additional_meta.milestones &&
          this.props.lowering.lowering_additional_meta.milestones.lowering_off_bottom
            ? this.props.lowering.lowering_additional_meta.milestones.lowering_off_bottom
            : null,
        lowering_on_surface:
          this.props.lowering.lowering_additional_meta.milestones &&
          this.props.lowering.lowering_additional_meta.milestones.lowering_on_surface
            ? this.props.lowering.lowering_additional_meta.milestones.lowering_on_surface
            : null,
        lowering_stop: this.props.lowering.stop_ts,
        lowering_aborted:
          this.props.lowering.lowering_additional_meta.milestones &&
          this.props.lowering.lowering_additional_meta.milestones.lowering_aborted
            ? this.props.lowering.lowering_additional_meta.milestones.lowering_aborted
            : null
      },
      stats: {
        max_depth:
          this.props.lowering.lowering_additional_meta.stats && this.props.lowering.lowering_additional_meta.stats.max_depth
            ? this.props.lowering.lowering_additional_meta.stats.max_depth
            : null,
        bounding_box:
          this.props.lowering.lowering_additional_meta.stats && this.props.lowering.lowering_additional_meta.stats.bounding_box
            ? this.props.lowering.lowering_additional_meta.stats.bounding_box
            : []
      },
      touched: false,

      depthChartOptions: {
        title: {
          text: null
        },
        chart: {
          height: 200,
          zoomType: 'x'
        },
        legend: {
          enabled: false
        },
        series: [
          {
            data: []
          }
        ],
        tooltip: {
          enabled: true,
          crosshairs: true,
          formatter: this.tooltipFormatter.bind(this)
        },
        xAxis: {
          type: 'datetime',
          plotLines: []
        },
        yAxis: {
          title: {
            text: null
          },
          min: 0,
          reversed: true
        },
        plotOptions: {
          series: {
            animation: false,
            events: {
              mouseOut: this.clearEvent.bind(this)
            },
            point: {
              events: {
                click: this.handleClick.bind(this),
                mouseOver: this.setEventbyTS.bind(this)
              },
              marker: {
                lineWidth: 1
              }
            }
          }
        }
      }
    }

    this.handleMoveEnd = this.handleMoveEnd.bind(this)
    this.handleZoomEnd = this.handleZoomEnd.bind(this)
    this.initMapView = this.initMapView.bind(this)
    this.setEventbyTS = this.setEventbyTS.bind(this)
    this.clearEvent = this.clearEvent.bind(this)
    this.handleFormSubmit = this.handleFormSubmit.bind(this)
    this.handleShowEditForm = this.handleShowEditForm.bind(this)
  }

  componentDidMount() {
    this.initEvents(this.props.lowering.id)
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.milestones !== prevState.milestones) {
      this.setPlotLines()
    }

    if (this.state.milestone_to_edit !== prevState.milestone_to_edit) {
      this.setPlotLines()
    }
  }

  componentWillUnmount() {
    if (this.props.lowering) {
      this.props.initLowering(this.props.lowering.id)
    }
  }

  async initEvents() {
    const events = await get_event_exports_by_lowering({}, this.props.lowering.id)
    // console.debug('events:', events)
    this.setState({ events })
    this.initLoweringTrackline()
    this.setPlotLines()
  }

  async initLoweringTrackline() {
    this.setState({ fetching: true })

    let tracklines = {}

    for (const datasource of POSITION_DATASOURCES) {
      let trackline = {
        ts: [],
        depth: [],
        polyline: L.polyline([]),
        startPoint: null,
        endPoint: null
      }

      if (!this.state.events.length) {
        // console.debug(`No data found for ${datasource}`)
        continue
      }

      this.state.events.forEach((event) => {
        const aux_data = event['aux_data'].find((aux_data_source) => aux_data_source['data_source'] === datasource) || {}

        if (!aux_data.data_array) {
          return
        }

        try {
          const latLng = [
            parseFloat(aux_data['data_array'].find((data) => data['data_name'] === 'latitude')['data_value']),
            parseFloat(aux_data['data_array'].find((data) => data['data_name'] === 'longitude')['data_value'])
          ]

          if (latLng[0] != 0 && latLng[1] != 0) {
            trackline.polyline.addLatLng(latLng)
            if (trackline.startPoint === null) {
              trackline.startPoint = latLng
            }
            trackline.endPoint = latLng
          }

          trackline.ts.push(moment.utc(event['ts']).valueOf())
          trackline.depth.push([
            trackline.ts[trackline.ts.length - 1],
            parseFloat(aux_data['data_array'].find((data) => data['data_name'] == 'depth')['data_value'])
          ])
        } catch {
          console.error('Problem parsing', aux_data['data_array'])
        }
      })

      if (trackline.ts.length) {
        tracklines[datasource] = trackline

        // console.debug(tracklines)

        this.setState((prevState) => {
          return {
            tracklines,
            posDataSource: datasource,
            depthChartOptions: { ...prevState.depthChartOptions, series: [{ data: tracklines[datasource].depth }] }
          }
        })
        break
      }
    }

    this.setState({ fetching: false })
    this.initMapView()
  }

  initMapView() {
    // console.debug(`Init map`)
    // console.debug(this.state.tracklines)

    if (this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].polyline.isEmpty()) {
      this.map.leafletElement.panTo(this.state.tracklines[this.state.posDataSource].polyline.getBounds().getCenter())
      this.map.leafletElement.fitBounds(this.state.tracklines[this.state.posDataSource].polyline.getBounds())
    }
  }

  handleShowEditForm() {
    this.setState((prevState) => {
      return { show_edit_form: !prevState.show_edit_form }
    })
  }

  handleFormSubmit(formProps) {
    this.setState({
      milestones: {
        ...formProps.lowering_additional_meta.milestones,
        lowering_start: formProps.start_ts,
        lowering_stop: formProps.stop_ts
      },
      stats: formProps.lowering_additional_meta.stats,
      touched: false,
      show_edit_form: false
    })

    this.props.updateLowering(formProps)
  }

  handleCalculateBoundingBox() {
    if (this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].polyline.isEmpty()) {
      let lowering_bounds = this.state.tracklines[this.state.posDataSource].polyline.getBounds()
      this.setState((prevState) => {
        return {
          touched: true,
          stats: {
            ...prevState.stats,
            bounding_box: [lowering_bounds.getNorth(), lowering_bounds.getEast(), lowering_bounds.getSouth(), lowering_bounds.getWest()]
          }
        }
      })
    }
  }

  handleCalculateMaxDepth() {
    if (this.state.tracklines[this.state.posDataSource] && this.state.tracklines[this.state.posDataSource].depth.length > 0) {
      let maxDepth = this.state.tracklines[this.state.posDataSource].depth.reduce((current_max_depth, depth) => {
        current_max_depth = depth[1] > current_max_depth ? depth[1] : current_max_depth
        return current_max_depth
      }, 0)

      this.setState((prevState) => {
        return { touched: true, stats: { ...prevState.stats, max_depth: maxDepth } }
      })
    }
  }

  handleClick() {
    if (this.state.milestone_to_edit) {
      this.setState((prevState) => {
        return { touched: true, milestones: { ...prevState.milestones, [prevState.milestone_to_edit]: prevState.event.ts } }
      })
      this.setMilestoneToEdit()
    }
  }

  handleUpdateLowering() {
    const newMilestones = { ...this.state.milestones }
    delete newMilestones.lowering_start
    delete newMilestones.lowering_stop

    const newLoweringAdditionalMeta = {
      ...this.props.lowering.lowering_additional_meta,
      milestones: newMilestones,
      stats: this.state.stats
    }

    const newLoweringRecord = {
      ...this.props.lowering,
      start_ts: this.state.milestones.lowering_start,
      stop_ts: this.state.milestones.lowering_stop,
      lowering_additional_meta: newLoweringAdditionalMeta
    }

    this.props.updateLowering(newLoweringRecord)
    this.setState({ touched: false })
  }

  setMilestoneToEdit(milestone = null) {
    if (milestone !== null && milestone !== this.state.milestone_to_edit) {
      this.setState({ milestone_to_edit: milestone })
    } else {
      this.setState({ milestone_to_edit: null })
    }
  }

  setPlotLines() {
    let xAxis = this.state.depthChartOptions.xAxis
    xAxis.plotLines = []

    for (const [key, value] of Object.entries(this.state.milestones)) {
      if (value) {
        if (key === this.state.milestone_to_edit) {
          xAxis.plotLines.push({
            color: '#FF0000',
            width: 2,
            value: moment.utc(value).valueOf()
          })
        } else {
          xAxis.plotLines.push({
            color: '#CFCFCF',
            width: 2,
            value: moment.utc(value).valueOf()
          })
        }
      }
    }

    this.setState((prevState) => {
      return { depthChartOptions: { ...prevState.depthChartOptions, xAxis: xAxis } }
    })
  }

  clearEvent() {
    this.setState({ event: {} })
  }

  setEventbyTS(e) {
    let tsStr = moment.utc(e.target.x).toISOString()
    this.setState({ event: this.state.events.find((event) => event.ts === tsStr) })
  }

  tooltipFormatter() {
    let event_txt = `<b>EVENT: ${this.state.event.event_value}</b>`
    if (this.state.event.event_value === 'FREE_FORM') {
      event_txt = `<span>${event_txt}<br/><b>Text:</b> ${this.state.event.event_free_text}</span>`
    } else if (this.state.event.event_value === 'VEHICLE') {
      const milestone = this.state.event.event_options.find((option) => option['event_option_name'] === 'milestone')
      if (milestone) {
        event_txt = `<span>${event_txt}<br/><b>Milestone:</b> ${milestone['event_option_value']}</span>`
      }
    }

    return `${event_txt}<br/><span>${this.state.event.ts}</span><br/>
      ${this.state.milestone_to_edit ? '<span>Click to set ' + this.state.milestone_to_edit + '.</span>' : ''}`
  }

  handleZoomEnd() {
    if (this.map) {
      this.setState({ zoom: this.map.leafletElement.getZoom() })
    }
  }

  handleMoveEnd() {
    if (this.map) {
      this.setState({ center: this.map.leafletElement.getCenter() })
    }
  }

  renderMarker() {
    if (this.state.event.id) {
      const posData = this.state.event.aux_data.find((data) => data['data_source'] === this.state.posDataSource)
      const rawLat = posData['data_array'].find((data) => data['data_name'] == 'latitude')
      const rawLng = posData['data_array'].find((data) => data['data_name'] == 'longitude')
      if (rawLat && rawLng) {
        return (
          <Marker position={[parseFloat(rawLat['data_value']), parseFloat(rawLng['data_value'])]}>
            <Popup>You are here! :-)</Popup>
          </Marker>
        )
      }
    }
  }

  render() {
    const { show, handleHide } = this.props

    const baseLayers = TILE_LAYERS.map((layer, index) => {
      if (layer.wms) {
        return (
          <BaseLayer checked={layer.default} key={`baseLayer_${index}`} name={layer.name}>
            <WMSTileLayer attribution={layer.attribution} url={layer.url} layers={layer.layers} transparent={layer.transparent} />
          </BaseLayer>
        )
      } else {
        return (
          <BaseLayer checked={layer.default} key={`baseLayer_${index}`} name={layer.name}>
            <TileLayer
              attribution={layer.attribution}
              url={layer.url}
              tms={layer.tms ?? false}
              zoomOffset={layer.zoomOffset ?? 0}
              maxNativeZoom={layer.maxNativeZoom}
            />
          </BaseLayer>
        )
      }
    })

    const milestones_and_stats = this.state.show_edit_form ? (
      <Col md={12}>
        <LoweringStatsForm
          milestones={this.state.milestones}
          stats={this.state.stats}
          handleHide={this.handleShowEditForm}
          handleFormSubmit={this.handleFormSubmit}
        />
      </Col>
    ) : (
      [
        <Col key='milestones' md={6}>
          <div>
            <span
              className={this.state.milestone_to_edit == 'lowering_start' ? 'text-warning' : ''}
              onClick={() => this.setMilestoneToEdit('lowering_start')}
            >
              Off Deck: {this.state.milestones.lowering_start}
            </span>
            <br />
            <span
              className={this.state.milestone_to_edit == 'lowering_descending' ? 'text-warning' : ''}
              onClick={() => this.setMilestoneToEdit('lowering_descending')}
            >
              Descending: {this.state.milestones.lowering_descending}
            </span>
            <br />
            <span
              className={this.state.milestone_to_edit == 'lowering_on_bottom' ? 'text-warning' : ''}
              onClick={() => this.setMilestoneToEdit('lowering_on_bottom')}
            >
              On Bottom: {this.state.milestones.lowering_on_bottom}
            </span>
            <br />
            <span
              className={this.state.milestone_to_edit == 'lowering_off_bottom' ? 'text-warning' : ''}
              onClick={() => this.setMilestoneToEdit('lowering_off_bottom')}
            >
              Off Bottom: {this.state.milestones.lowering_off_bottom}
            </span>
            <br />
            <span
              className={this.state.milestone_to_edit == 'lowering_on_surface' ? 'text-warning' : ''}
              onClick={() => this.setMilestoneToEdit('lowering_on_surface')}
            >
              On Surface: {this.state.milestones.lowering_on_surface}
            </span>
            <br />
            <span
              className={this.state.milestone_to_edit == 'lowering_stop' ? 'text-warning' : ''}
              onClick={() => this.setMilestoneToEdit('lowering_stop')}
            >
              On Deck: {this.state.milestones.lowering_stop}
            </span>
            <br />
            <span
              className={this.state.milestone_to_edit == 'lowering_aborted' ? 'text-warning' : ''}
              onClick={() => this.setMilestoneToEdit('lowering_aborted')}
            >
              Aborted: {this.state.milestones.lowering_aborted}
            </span>
          </div>
        </Col>,
        <Col key='stats' md={6}>
          <div>
            <span>
              Max Depth: {this.state.stats.max_depth}{' '}
              <OverlayTrigger
                placement='top'
                overlay={<Tooltip id='maxDepthTooltip'>Click to calculate max depth from depth data.</Tooltip>}
              >
                <FontAwesomeIcon className='text-primary' onClick={() => this.handleCalculateMaxDepth()} icon='calculator' fixedWidth />
              </OverlayTrigger>
            </span>
            <br />
            <span>
              Bounding Box: {this.state.stats.bounding_box ? this.state.stats.bounding_box.join(', ') : ''}{' '}
              <OverlayTrigger
                placement='top'
                overlay={<Tooltip id='boundingBoxTooltip'>Click to calculate the bounding box from position data.</Tooltip>}
              >
                <FontAwesomeIcon className='text-primary' onClick={() => this.handleCalculateBoundingBox()} icon='calculator' fixedWidth />
              </OverlayTrigger>
            </span>
            <br />
          </div>
        </Col>
      ]
    )
    const depth_profile = <HighchartsReact highcharts={Highcharts} options={this.state.depthChartOptions} oneToOne={true} />

    const trackLine =
      this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].polyline.isEmpty() ? (
        <Polyline color='yellow' positions={this.state.tracklines[this.state.posDataSource].polyline.getLatLngs()} />
      ) : null

    const startMarker = //null
      this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].startPoint !== null ? (
        <CircleMarker center={this.state.tracklines[this.state.posDataSource].startPoint} radius={3} color={'green'} />
      ) : null

    const endMarker = //null
      this.state.tracklines[this.state.posDataSource] && !this.state.tracklines[this.state.posDataSource].endPoint !== null ? (
        <CircleMarker center={this.state.tracklines[this.state.posDataSource].endPoint} radius={3} color={'red'} />
      ) : null

    if (this.props.lowering) {
      if (!this.state.fetching) {
        return (
          <Modal size='lg' show={show} onHide={handleHide}>
            <Modal.Header closeButton>
              <Modal.Title as='h5'>{this.props.lowering.lowering_id} - Milestones / Stats</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <Row className='mt-2'>
                <Col xs={12}>
                  <Map
                    style={{ height: this.state.height }}
                    center={this.state.center}
                    zoom={this.state.zoom}
                    onMoveEnd={this.handleMoveEnd}
                    onZoomEnd={this.handleZoomEnd}
                    ref={(map) => (this.map = map)}
                  >
                    <LayersControl position='topright'>{baseLayers}</LayersControl>
                    <ScaleControl position='bottomleft' />
                    {trackLine}
                    {startMarker}
                    {endMarker}
                    {this.renderMarker()}
                  </Map>
                </Col>
              </Row>
              <Row className='mt-2'>
                <Col xs={12}>{depth_profile}</Col>
              </Row>
              <Row className='mt-2'>{milestones_and_stats}</Row>
              <Row className='mt-2'>
                <Col xs={12}>
                  {renderAlert(this.props.errorMessage)}
                  {renderMessage(this.props.message)}
                </Col>
              </Row>
              <Row className='mt-2'>
                <Col xs={12}>
                  <span className='float-right'>
                    {!this.state.show_edit_form ? (
                      <Button className='mr-1' variant='warning' size='sm' onClick={() => this.handleShowEditForm()}>
                        Tweak!
                      </Button>
                    ) : null}
                    {!this.state.show_edit_form ? (
                      <Button className='mr-1' variant='secondary' size='sm' onClick={handleHide}>
                        Close
                      </Button>
                    ) : null}
                    {!this.state.show_edit_form ? (
                      <Button
                        className='mr-1'
                        variant='primary'
                        size='sm'
                        disabled={!this.state.touched}
                        onClick={() => this.handleUpdateLowering()}
                      >
                        Update
                      </Button>
                    ) : null}
                  </span>
                </Col>
              </Row>
            </Modal.Body>
          </Modal>
        )
      } else {
        return (
          <Modal size='lg' show={show} onHide={handleHide}>
            <Modal.Body>Loading...</Modal.Body>
          </Modal>
        )
      }
    } else {
      return null
    }
  }
}

LoweringStatsModal.propTypes = {
  errorMessage: PropTypes.string,
  handleHide: PropTypes.func.isRequired,
  initLowering: PropTypes.func.isRequired,
  lowering: PropTypes.object,
  message: PropTypes.string,
  show: PropTypes.bool.isRequired,
  updateLowering: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    lowering: state.lowering.lowering,
    errorMessage: state.lowering.lowering_error,
    message: state.lowering.lowering_message
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  connectModal({ name: 'setLoweringStats', destroyOnHide: true })
)(LoweringStatsModal)
