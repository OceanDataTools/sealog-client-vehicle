import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap'
import PropTypes from 'prop-types'
import moment from 'moment'
import { connect } from 'react-redux'
import {
  get_event_aux_data,
  get_event_aux_data_by_cruise,
  get_event_aux_data_by_lowering,
  get_event_exports,
  get_event_exports_by_cruise,
  get_event_exports_by_lowering,
  get_events,
  get_events_by_cruise,
  get_events_by_lowering
} from '../api'

let fileDownload = require('js-file-download')

const dateFormat = 'YYYYMMDD'
const timeFormat = 'HHmm'

class ExportDropdown extends Component {
  constructor(props) {
    super(props)

    this.state = {
      id: this.props.id ? this.props.id : 'dropdown-download',
      prefix: this.props.prefix ? this.props.prefix : null,
      sort: this.props.sort ? this.props.sort : null
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.prefix !== prevProps.prefix) {
      this.setState({ prefix: this.props.prefix })
    }

    if (this.props.sort !== prevProps.sort) {
      this.setState({ sort: this.props.sort })
    }
  }

  async fetchEvents(exportFormat) {
    let eventFilter_value = this.props.eventFilter.value ? this.props.eventFilter.value : this.props.hideASNAP ? '!ASNAP' : null

    const query = {
      ...this.props.eventFilter,
      format: exportFormat,
      add_record_ids: exportFormat === 'json',
      value: eventFilter_value ? eventFilter_value.split(',') : null,
      author: this.props.eventFilter.author ? this.props.eventFilter.author.split(',') : null,
      sort: this.state.sort
    }

    if (this.props.cruiseID) {
      return await get_events_by_cruise(query, this.props.cruiseID)
    } else if (this.props.loweringID) {
      return await get_events_by_lowering(query, this.props.loweringID)
    }
    return await get_events(query)
  }

  async fetchEventAuxData() {
    let eventFilter_value = this.props.eventFilter.value ? this.props.eventFilter.value : this.props.hideASNAP ? '!ASNAP' : null

    const query = {
      ...this.props.eventFilter,
      value: eventFilter_value ? eventFilter_value.split(',') : null,
      author: this.props.eventFilter.author ? this.props.eventFilter.author.split(',') : null,
      sort: this.state.sort
    }

    if (this.props.cruiseID) {
      return await get_event_aux_data_by_cruise(query, this.props.cruiseID)
    } else if (this.props.loweringID) {
      return await get_event_aux_data_by_lowering(query, this.props.loweringID)
    }
    return await get_event_aux_data(query)
  }

  async fetchEventsWithAuxData(exportFormat) {
    let eventFilter_value = this.props.eventFilter.value ? this.props.eventFilter.value : this.props.hideASNAP ? '!ASNAP' : null

    const query = {
      ...this.props.eventFilter,
      format: exportFormat,
      add_record_ids: exportFormat === 'json',
      value: eventFilter_value ? eventFilter_value.split(',') : null,
      author: this.props.eventFilter.author ? this.props.eventFilter.author.split(',') : null,
      sort: this.state.sort
    }

    if (this.props.cruiseID) {
      return await get_event_exports_by_cruise(query, this.props.cruiseID)
    } else if (this.props.loweringID) {
      return await get_event_exports_by_lowering(query, this.props.loweringID)
    }
    return await get_event_exports(query)
  }

  exportEventsWithAuxData(format = 'json') {
    this.fetchEventsWithAuxData(format)
      .then((results) => {
        const prefix = this.state.prefix ? this.state.prefix : moment.utc(results[0].ts).format(dateFormat + '_' + timeFormat)
        fileDownload(format == 'json' ? JSON.stringify(results) : results, `${prefix}_sealog_export.${format}`)
      })
      .catch((error) => {
        console.debug(error)
      })
  }

  exportEvents(format = 'json') {
    this.fetchEvents(format)
      .then((results) => {
        const prefix = this.state.prefix ? this.state.prefix : moment.utc(results[0].ts).format(dateFormat + '_' + timeFormat)
        fileDownload(format == 'json' ? JSON.stringify(results) : results, `${prefix}_sealog_eventExport.${format}`)
      })
      .catch((error) => {
        console.debug(error)
      })
  }

  exportAuxData() {
    this.fetchEventAuxData()
      .then((results) => {
        const prefix = this.state.prefix ? this.state.prefix : moment.utc(results[0].ts).format(dateFormat + '_' + timeFormat)
        fileDownload(JSON.stringify(results), `${prefix}_sealog_auxDataExport.json`)
      })
      .catch((error) => {
        console.debug(error)
      })
  }

  render() {
    const exportTooltip = <Tooltip id='exportTooltip'>Export these events</Tooltip>
    const className = this.props.className ? this.props.className : 'p-0'

    return (
      <Dropdown className='no-arrow' as={'span'} id={this.state.id}>
        <Dropdown.Toggle className={className} variant='link' disabled={this.props.disabled}>
          <OverlayTrigger placement='top' overlay={exportTooltip}>
            <FontAwesomeIcon icon='download' fixedWidth />
          </OverlayTrigger>
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Header className='text-warning' key='toJSONHeader'>
            JSON format
          </Dropdown.Header>
          <Dropdown.Item key='toJSONAll' onClick={() => this.exportEventsWithAuxData('json')}>
            Events w/aux data
          </Dropdown.Item>
          <Dropdown.Item key='toJSONEvents' onClick={() => this.exportEvents('json')}>
            Events Only
          </Dropdown.Item>
          <Dropdown.Item key='toJSONAuxData' onClick={() => this.exportAuxData()}>
            Aux Data Only
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Header className='text-warning' key='toCSVHeader'>
            CSV format
          </Dropdown.Header>
          <Dropdown.Item key='toCSVAll' onClick={() => this.exportEventsWithAuxData('csv')}>
            Events w/aux data
          </Dropdown.Item>
          <Dropdown.Item key='toCSVEvents' onClick={() => this.exportEvents('csv')}>
            Events Only
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    )
  }
}

ExportDropdown.propTypes = {
  id: PropTypes.string,
  prefix: PropTypes.string,
  disabled: PropTypes.bool.isRequired,
  hideASNAP: PropTypes.bool.isRequired,
  eventFilter: PropTypes.object.isRequired,
  cruiseID: PropTypes.string,
  loweringID: PropTypes.string,
  sort: PropTypes.string,
  className: PropTypes.string
}

export default connect(null, null)(ExportDropdown)
