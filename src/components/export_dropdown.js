import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap'
import PropTypes from 'prop-types'
import moment from 'moment'
import {
  get_event_aux_data,
  get_event_aux_data_by_lowering,
  get_event_exports,
  get_event_exports_by_lowering,
  get_events,
  get_events_by_lowering
} from '../api'

let fileDownload = require('js-file-download')

const dateFormat = 'YYYYMMDD'
const timeFormat = 'HHmm'

class ExportDropdown extends Component {
  buildQuery(exportFormat = null) {
    const eventFilterValue = this.props.eventFilter.value ? this.props.eventFilter.value : this.props.hideASNAP ? '!ASNAP' : null
    const query = {
      ...this.props.eventFilter,
      value: eventFilterValue ? eventFilterValue.split(',') : null,
      author: this.props.eventFilter.author ? this.props.eventFilter.author.split(',') : null,
      sort: this.props.sort
    }
    if (exportFormat) {
      query.format = exportFormat
      query.add_record_ids = exportFormat === 'json'
    }
    return query
  }

  async fetchEvents(exportFormat) {
    const query = this.buildQuery(exportFormat)
    if (this.props.loweringID) return await get_events_by_lowering(query, this.props.loweringID)
    return await get_events(query)
  }

  async fetchEventAuxData() {
    const query = this.buildQuery()
    if (this.props.loweringID) return await get_event_aux_data_by_lowering(query, this.props.loweringID)
    return await get_event_aux_data(query)
  }

  async fetchEventsWithAuxData(exportFormat) {
    const query = this.buildQuery(exportFormat)
    if (this.props.loweringID) return await get_event_exports_by_lowering(query, this.props.loweringID)
    return await get_event_exports(query)
  }

  exportEventsWithAuxData(format = 'json') {
    this.fetchEventsWithAuxData(format)
      .then((results) => {
        const prefix = this.props.prefix ? this.props.prefix : moment.utc(results[0].ts).format(dateFormat + '_' + timeFormat)
        fileDownload(format == 'json' ? JSON.stringify(results) : results, `${prefix}_sealog_export.${format}`)
      })
      .catch((error) => {
        console.debug(error)
      })
  }

  exportEvents(format = 'json') {
    this.fetchEvents(format)
      .then((results) => {
        const prefix = this.props.prefix ? this.props.prefix : moment.utc(results[0].ts).format(dateFormat + '_' + timeFormat)
        fileDownload(format == 'json' ? JSON.stringify(results) : results, `${prefix}_sealog_eventExport.${format}`)
      })
      .catch((error) => {
        console.debug(error)
      })
  }

  exportAuxData() {
    this.fetchEventAuxData()
      .then((results) => {
        const prefix = this.props.prefix ? this.props.prefix : moment.utc(results[0].ts).format(dateFormat + '_' + timeFormat)
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
      <Dropdown as={'span'} id={this.props.id || 'dropdown-download'}>
        <Dropdown.Toggle
          className={className}
          style={{ position: 'relative', bottom: '2px' }}
          variant='link'
          disabled={this.props.disabled}
        >
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
  loweringID: PropTypes.string,
  sort: PropTypes.string,
  className: PropTypes.string
}

export default ExportDropdown
