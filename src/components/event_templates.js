import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { connect } from 'react-redux'
import { Row, Button, Col, Card, Table, OverlayTrigger, Tooltip, Form, FormControl } from 'react-bootstrap'
import PropTypes from 'prop-types'
import EventTemplateForm from './event_template_form'
import DeleteModal from './delete_modal'
import ImportFromFileModal from './import_from_file_modal'
import EventTemplateOptionsModal from './event_template_options_modal'
import CustomPagination from './custom_pagination'
import { create_event_template, get_event_templates } from '../api'
import * as mapDispatchToProps from '../actions'

let fileDownload = require('js-file-download')

const maxSystemTemplatesPerPage = 8
const maxTemplatesPerPage = 8

class EventTemplates extends Component {
  constructor(props) {
    super(props)

    this.state = {
      activePage: 1,
      activeSystemPage: 1,
      filteredTemplates: null,
      filteredSystemTemplates: null
    }

    this.templateSearch = React.createRef()
    this.systemTemplateSearch = React.createRef()

    this.filterTemplates = this.filterTemplates.bind(this)
    this.handleEventTemplatesWipe = this.handleEventTemplatesWipe.bind(this)
    this.handleEventTemplateImportClose = this.handleEventTemplateImportClose.bind(this)
    this.handlePageSelect = this.handlePageSelect.bind(this)
  }

  componentDidMount() {
    this.props.fetchEventTemplates()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.event_templates !== this.props.event_templates && this.systemTemplateSearch.current) {
      this.filterTemplates(this.systemTemplateSearch.current.value, true)
      this.filterTemplates(this.templateSearch.current.value, false)
    }
  }

  handlePageSelect(eventKey, system = false) {
    this.setState(system ? { activeSystemPage: eventKey } : { activePage: eventKey })
  }

  handleEventTemplateDelete(id) {
    this.props.showModal('deleteModal', {
      id: id,
      handleDelete: async (id) => {
        this.props.deleteEventTemplate(id)
        this.props.fetchEventTemplates()
      },
      message: 'this event template'
    })
  }

  handleEventTemplateSelect(id) {
    this.props.leaveEventTemplateForm()
    this.props.initEventTemplate(id)
  }

  handleEventTemplateCreate() {
    this.props.leaveEventTemplateForm()
  }

  handleEventTemplateImportModal() {
    this.props.showModal('importFromFileModal')
  }

  handleEventTemplateImportClose() {
    this.props.fetchEventTemplates()
  }

  handleEventTemplatesWipe() {
    this.props.showModal('deleteModal', {
      handleDelete: this.props.deleteAllEventTemplates,
      message: 'all non-system event templates'
    })
  }

  handleEventTemplateDuplicate(template) {
    const copy = { ...template }
    delete copy.id
    this.props.createEventTemplate({ ...copy, event_name: `Copy of ${template.event_name}` })
  }

  handleEventTemplateTest(event_template) {
    this.props.showModal('eventOptions', {
      eventTemplate: event_template,
      event: null,
      handleUpdateEvent: null,
      handleDeleteEvent: null
    })
  }

  filterTemplates(fieldVal, system) {
    if (fieldVal !== '') {
      const regex = RegExp(fieldVal, 'i')
      const filteredTemplates = this.props.event_templates.filter((event_template) => {
        if (
          event_template.system_template === system &&
          (event_template.event_name.match(regex) ||
            event_template.event_value.match(regex) ||
            event_template.template_categories.join(', ').match(regex))
        ) {
          return event_template
        }
      })

      this.setState(system ? { filteredSystemTemplates: filteredTemplates, activeSystemPage: 1 } : { filteredTemplates, activePage: 1 })
    } else {
      this.setState(system ? { filteredSystemTemplates: null } : { filteredTemplates: null })
    }
    this.handlePageSelect(1, system)
  }

  handleSearchChange(input, system = false) {
    let fieldVal = input.target.value
    this.filterTemplates(fieldVal, system)
  }

  exportTemplatesToJSON(system = false) {
    let templates = system ? this.state.filteredSystemTemplates : this.state.filteredTemplates
    if (!templates) {
      templates = this.props.event_templates.filter((template) => template.system_template === system)
    }

    if (templates.length) {
      fileDownload(JSON.stringify(templates, null, 2), `sealog_${system ? 'systemE' : 'e'}ventTemplateExport.json`)
    }
  }

  async _insertEventTemplate({
    id,
    event_name,
    event_value,
    event_free_text_required = false,
    event_options = [],
    system_template = false,
    template_categories = []
  }) {
    let result = {
      skipped: false,
      imported: false,
      error: null
    }

    const item = await get_event_templates({}, id)

    if (item) {
      result.skipped = true
      result.error = { message: 'duplicate template', id: id || 'unknown' }
      return result
    }

    const response = await create_event_template({
      id,
      event_name,
      event_value,
      event_free_text_required,
      event_options,
      system_template,
      template_categories: template_categories.map((category) => category.trim().toLowerCase())
    })

    if (response.success) {
      result.imported = true
      return result
    }

    // if (response.error.response.data.statusCode == 400 &&
    //   response.error.response.data.message == 'duplicate event ID')
    // {
    //   result.skipped = true
    //   return result
    // }

    result.error = { ...response.error.response.data, id: id || 'unknown' }
    return result
  }

  renderAddEventTemplateButton() {
    if (this.props.roles && this.props.roles.some((item) => ['admin', 'cruise_manager', 'template_manager'].includes(item))) {
      return (
        <Button
          variant='outline-primary'
          size='sm'
          disabled={!this.props.event_templateid}
          onClick={() => this.handleEventTemplateCreate()}
        >
          Add Event Template
        </Button>
      )
    }
  }

  renderImportEventTemplatesButton() {
    if (this.props.roles.includes('admin')) {
      return (
        <Button className='me-1' variant='outline-primary' size='sm' onClick={() => this.handleEventTemplateImportModal()}>
          Import From File
        </Button>
      )
    }
  }

  renderEventTemplates(system = false) {
    const editTooltip = <Tooltip id='editTooltip'>Edit this template.</Tooltip>
    const deleteTooltip = <Tooltip id='deleteTooltip'>Delete this template.</Tooltip>
    const duplicateTooltip = <Tooltip id='duplicateTooltip'>Duplicate this template.</Tooltip>
    const testTooltip = <Tooltip id='testTooltip'>Test this template.</Tooltip>

    let templatesPerPage = system ? maxSystemTemplatesPerPage : maxTemplatesPerPage
    let activePage = system ? this.state.activeSystemPage : this.state.activePage
    let templates = system ? this.state.filteredSystemTemplates : this.state.filteredTemplates
    let edit_roles = system ? ['admin'] : ['admin', 'cruise_manager', 'template_manager']

    let templateList = Array.isArray(templates)
      ? templates
      : this.props.event_templates.filter((event_template) => event_template.system_template === system)

    templateList = templateList.slice((activePage - 1) * templatesPerPage, activePage * templatesPerPage)

    if (!templateList.length) {
      return (
        <tr key={system ? 'noSystemEventTemplatesFound' : 'noEventTemplatesFound'}>
          <td colSpan='3'> No event templates found!</td>
        </tr>
      )
    }

    return templateList.map((template) => {
      const edit_icon = this.props.roles.some((item) => edit_roles.includes(item)) ? (
        <OverlayTrigger placement='top' overlay={editTooltip}>
          <FontAwesomeIcon
            className='text-warning'
            onClick={() => this.handleEventTemplateSelect(template.id)}
            icon='pencil-alt'
            fixedWidth
            role='button'
          />
        </OverlayTrigger>
      ) : null
      const test_icon = (
        <OverlayTrigger placement='top' overlay={testTooltip}>
          <FontAwesomeIcon
            className='text-success'
            onClick={() => this.handleEventTemplateTest(template)}
            icon='vial'
            fixedWidth
            role='button'
          />
        </OverlayTrigger>
      )
      const duplicate_icon = this.props.roles.some((item) => edit_roles.includes(item)) ? (
        <OverlayTrigger placement='top' overlay={duplicateTooltip}>
          <FontAwesomeIcon
            className='text-info'
            onClick={() => this.handleEventTemplateDuplicate(template)}
            icon='copy'
            fixedWidth
            role='button'
          />
        </OverlayTrigger>
      ) : null
      const delete_icon = this.props.roles.some((item) => edit_roles.includes(item)) ? (
        <OverlayTrigger placement='top' overlay={deleteTooltip}>
          <FontAwesomeIcon
            className='text-danger'
            onClick={() => this.handleEventTemplateDelete(template.id)}
            icon='trash'
            fixedWidth
            role='button'
          />
        </OverlayTrigger>
      ) : null

      const style = template.disabled ? { textDecoration: 'line-through' } : {}
      const className = this.props.event_templateid === template.id ? 'text-warning' : ''

      return (
        <tr key={template.id}>
          <td style={style} className={className}>
            {template.event_name}
          </td>
          <td style={style} className={className}>
            {template.event_value}
          </td>
          <td className='text-center'>
            {edit_icon} {test_icon} {duplicate_icon} {delete_icon}
          </td>
        </tr>
      )
    })
  }

  renderEventTemplatesTable(system = false) {
    return (
      <Table className='mb-0' bordered striped size='sm'>
        <thead>
          <tr>
            <th>Button Name</th>
            <th>Event Value</th>
            <th className='text-center' style={{ width: '110px' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>{this.renderEventTemplates(system)}</tbody>
      </Table>
    )
  }

  renderEventTemplatesHeader(system = false) {
    const exportTooltip = <Tooltip id='exportTooltip'>Export {system ? 'System ' : ''}Event Templates</Tooltip>
    const deleteAllTooltip = <Tooltip id='deleteAllNonSystemTooltip'>Delete ALL {system ? 'system' : 'non-system'} Event Templates</Tooltip>
    const disableBtn =
      this.props.event_templates.filter((event_template) => event_template.system_template === system).length > 0 ? false : true

    return (
      <div>
        {system ? 'System ' : ''} Event Templates
        <OverlayTrigger placement='top' overlay={exportTooltip}>
          <FontAwesomeIcon
            className='float-end ms-2 pt-2 text-primary'
            onClick={() => this.exportTemplatesToJSON(system)}
            disabled={disableBtn}
            icon='download'
            fixedWidth
            role='button'
          />
        </OverlayTrigger>
        {!system ? (
          <OverlayTrigger placement='top' overlay={deleteAllTooltip}>
            <FontAwesomeIcon
              className='float-end pt-2 text-danger'
              onClick={this.handleEventTemplatesWipe}
              disabled={disableBtn}
              icon='trash'
              fixedWidth
              role='button'
            />
          </OverlayTrigger>
        ) : null}
        <Form className='float-end me-2'>
          <FormControl
            ref={system ? this.systemTemplateSearch : this.templateSearch}
            size='sm'
            type='text'
            placeholder='Search'
            className='me-sm-2'
            onChange={(input) => this.handleSearchChange(input, system)}
          />
        </Form>
      </div>
    )
  }

  render() {
    if (!this.props.roles) {
      return <div>Loading...</div>
    }

    if (this.props.roles.some((item) => ['admin', 'cruise_manager', 'template_manager'].includes(item))) {
      return (
        <React.Fragment>
          <DeleteModal />
          <EventTemplateOptionsModal />
          <ImportFromFileModal
            handleExit={this.handleEventTemplateImportClose}
            title='Import Event Templates'
            insertItem={this._insertEventTemplate}
          />
          <Row className='py-2 px-1 d-flex justify-content-center'>
            <Col className='px-1' sm={9} md={8} lg={6} xl={5}>
              <Card className='border-secondary'>
                <Card.Header>{this.renderEventTemplatesHeader(true)}</Card.Header>
                {this.renderEventTemplatesTable(true)}
                <CustomPagination
                  page={this.state.activeSystemPage}
                  count={
                    this.state.filteredSystemTemplates
                      ? this.state.filteredSystemTemplates.length
                      : this.props.event_templates.filter((template) => template.system_template === true).length
                  }
                  pageSelectFunc={(eventKey) => this.handlePageSelect(eventKey, true)}
                  maxPerPage={maxSystemTemplatesPerPage}
                />
              </Card>
              <Card className='border-secondary mt-2'>
                <Card.Header>{this.renderEventTemplatesHeader()}</Card.Header>
                {this.renderEventTemplatesTable()}
                <CustomPagination
                  page={this.state.activePage}
                  count={
                    this.state.filteredTemplates
                      ? this.state.filteredTemplates.length
                      : this.props.event_templates.filter((template) => template.system_template === false).length
                  }
                  pageSelectFunc={this.handlePageSelect}
                  maxPerPage={maxTemplatesPerPage}
                />
              </Card>
              <div className='float-end my-2'>
                {this.renderImportEventTemplatesButton()}
                {this.renderAddEventTemplateButton()}
              </div>
            </Col>
            <Col className='px-1' sm={12} md={4} lg={6} xl={6}>
              <EventTemplateForm handleFormSubmit={this.props.fetchEventTemplates} />
            </Col>
          </Row>
        </React.Fragment>
      )
    } else {
      return <div>What are YOU doing here?</div>
    }
  }
}

EventTemplates.propTypes = {
  createEventTemplate: PropTypes.func.isRequired,
  deleteAllEventTemplates: PropTypes.func.isRequired,
  deleteEventTemplate: PropTypes.func.isRequired,
  event_templateid: PropTypes.string,
  event_templates: PropTypes.array.isRequired,
  fetchEventTemplates: PropTypes.func.isRequired,
  initEventTemplate: PropTypes.func.isRequired,
  leaveEventTemplateForm: PropTypes.func.isRequired,
  roles: PropTypes.array,
  showModal: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    event_templates: state.event_template.event_templates,
    event_templateid: state.event_template.event_template.id,
    roles: state.user.profile.roles
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(EventTemplates)
