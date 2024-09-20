import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { connect } from 'react-redux'
import { Row, Button, Col, Container, Card, Table, OverlayTrigger, Tooltip, Form, FormControl } from 'react-bootstrap'
import PropTypes from 'prop-types'
import EventTemplateForm from './event_template_form'
import NonSystemEventTemplatesWipeModal from './non_system_event_templates_wipe_modal'
import DeleteEventTemplateModal from './delete_event_template_modal'
import ImportEventTemplatesModal from './import_event_templates_modal'
import EventTemplateOptionsModal from './event_template_options_modal'
import CustomPagination from './custom_pagination'
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

    this.handlePageSelect = this.handlePageSelect.bind(this)
    this.handleSystemPageSelect = this.handleSystemPageSelect.bind(this)
    this.handleSearchChange = this.handleSearchChange.bind(this)
    this.handleSystemSearchChange = this.handleSystemSearchChange.bind(this)

    this.handleEventTemplateImportClose = this.handleEventTemplateImportClose.bind(this)
  }

  componentDidMount() {
    this.props.fetchEventTemplates()
  }

  handlePageSelect(eventKey) {
    this.setState({ activePage: eventKey })
  }

  handleSystemPageSelect(eventKey) {
    this.setState({ activeSystemPage: eventKey })
  }

  handleEventTemplateDelete(id) {
    this.props.showModal('deleteEventTemplate', {
      id: id,
      handleDelete: this.props.deleteEventTemplate
    })
  }

  handleEventTemplateSelect(id) {
    this.props.leaveEventTemplateForm()
    this.props.initEventTemplate(id)
  }

  handleEventTemplateCreate() {
    this.props.leaveEventTemplateForm()
  }

  handleEventTemplateImport() {
    this.props.showModal('importEventTemplates')
  }

  handleEventTemplateImportClose() {
    this.props.fetchEventTemplates()
  }

  handleNonSystemEventTemplatesWipe() {
    this.props.showModal('nonSystemEventTemplatesWipe', {
      handleDelete: this.props.deleteAllNonSystemEventTemplates
    })
  }

  handleEventTemplateTest(event_template) {
    this.props.showModal('eventOptions', {
      eventTemplate: event_template,
      event: null,
      handleUpdateEvent: null,
      handleDeleteEvent: null
    })
  }

  handleSearchChange(event_template_search) {
    let fieldVal = event_template_search.target.value
    if (fieldVal !== '') {
      const regex = RegExp(fieldVal, 'i')
      this.setState({
        filteredTemplates: this.props.event_templates.filter((event_template) => {
          if (
            event_template.system_template === false &&
            (event_template.event_name.match(regex) ||
              event_template.event_value.match(regex) ||
              event_template.template_categories.join(', ').match(regex))
          ) {
            return event_template
          }
        }),
        activePage: 1
      })
    } else {
      this.setState({ filteredTemplates: null })
    }
    this.handlePageSelect(1)
  }

  handleSystemSearchChange(event_template_search) {
    let fieldVal = event_template_search.target.value
    if (fieldVal !== '') {
      const regex = RegExp(fieldVal, 'i')
      this.setState({
        filteredSystemTemplates: this.props.event_templates.filter((event_template) => {
          if (
            event_template.system_template === true &&
            (event_template.event_name.match(regex) ||
              event_template.event_value.match(regex) ||
              event_template.template_categories.join(', ').match(regex))
          ) {
            return event_template
          }
        }),
        activeSystemPage: 1
      })
    } else {
      this.setState({ filteredSystemTemplates: null })
    }
    this.handlePageSelect(1)
  }

  exportTemplatesToJSON() {
    fileDownload(
      JSON.stringify(
        this.props.event_templates.filter((template) => template.system_template === false),
        null,
        2
      ),
      'sealog_eventTemplateExport.json'
    )
  }

  exportSystemTemplatesToJSON() {
    fileDownload(
      JSON.stringify(
        this.props.event_templates.filter((template) => template.system_template === true),
        null,
        2
      ),
      'sealog_systemEventTemplateExport.json'
    )
  }

  renderAddEventTemplateButton() {
    if (this.props.roles && this.props.roles.some((item) => ['admin', 'cruise_manager', 'template_manager'].includes(item))) {
      return (
        <Button variant='primary' size='sm' disabled={!this.props.event_templateid} onClick={() => this.handleEventTemplateCreate()}>
          Add Event Template
        </Button>
      )
    }
  }

  renderImportEventTemplatesButton() {
    if (this.props.roles.includes('admin')) {
      return (
        <Button className='mr-1' variant='primary' size='sm' onClick={() => this.handleEventTemplateImport()}>
          Import From File
        </Button>
      )
    }
  }

  renderEventTemplates() {
    const editTooltip = <Tooltip id='editTooltip'>Edit this template.</Tooltip>
    const deleteTooltip = <Tooltip id='deleteTooltip'>Delete this template.</Tooltip>
    const testTooltip = <Tooltip id='testTooltip'>Test this template.</Tooltip>

    let templates = Array.isArray(this.state.filteredTemplates)
      ? this.state.filteredTemplates
      : this.props.event_templates.filter((event_template) => event_template.system_template === false)
    templates = templates.slice((this.state.activePage - 1) * maxTemplatesPerPage, this.state.activePage * maxTemplatesPerPage)

    return templates.map((template) => {
      const edit_icon = this.props.roles.some((item) => ['admin', 'cruise_manager', 'template_manager'].includes(item)) ? (
        <OverlayTrigger placement='top' overlay={editTooltip}>
          <FontAwesomeIcon
            className='text-warning pl-1'
            onClick={() => this.handleEventTemplateSelect(template.id)}
            icon='pencil-alt'
            fixedWidth
          />
        </OverlayTrigger>
      ) : null
      const test_icon = (
        <OverlayTrigger placement='top' overlay={testTooltip}>
          <FontAwesomeIcon className='text-success pl-1' onClick={() => this.handleEventTemplateTest(template)} icon='vial' fixedWidth />
        </OverlayTrigger>
      )
      const delete_icon = this.props.roles.some((item) => ['admin', 'cruise_manager', 'template_manager'].includes(item)) ? (
        <OverlayTrigger placement='top' overlay={deleteTooltip}>
          <FontAwesomeIcon
            className='text-danger pl-1'
            onClick={() => this.handleEventTemplateDelete(template.id)}
            icon='trash'
            fixedWidth
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
            {edit_icon}
            {test_icon}
            {delete_icon}
          </td>
        </tr>
      )
    })
  }

  renderSystemEventTemplates() {
    const editTooltip = <Tooltip id='editTooltip'>Edit this template.</Tooltip>
    const deleteTooltip = <Tooltip id='deleteTooltip'>Delete this template.</Tooltip>
    const testTooltip = <Tooltip id='testTooltip'>Test this template.</Tooltip>

    let system_templates = Array.isArray(this.state.filteredSystemTemplates)
      ? this.state.filteredSystemTemplates
      : this.props.event_templates.filter((template) => template.system_template === true)
    system_templates = system_templates.slice(
      (this.state.activeSystemPage - 1) * maxSystemTemplatesPerPage,
      this.state.activeSystemPage * maxSystemTemplatesPerPage
    )

    if (system_templates.length) {
      return system_templates.map((template) => {
        const edit_icon = this.props.roles.includes('admin') ? (
          <OverlayTrigger placement='top' overlay={editTooltip}>
            <FontAwesomeIcon
              className='text-warning pl-1'
              onClick={() => this.handleEventTemplateSelect(template.id)}
              icon='pencil-alt'
              fixedWidth
            />
          </OverlayTrigger>
        ) : null
        const test_icon = (
          <OverlayTrigger placement='top' overlay={testTooltip}>
            <FontAwesomeIcon className='text-success pl-1' onClick={() => this.handleEventTemplateTest(template)} icon='vial' fixedWidth />
          </OverlayTrigger>
        )
        const delete_icon = this.props.roles.includes('admin') ? (
          <OverlayTrigger placement='top' overlay={deleteTooltip}>
            <FontAwesomeIcon
              className='text-danger pl-1'
              onClick={() => this.handleEventTemplateDelete(template.id)}
              icon='trash'
              fixedWidth
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
              {edit_icon}
              {test_icon}
              {delete_icon}
            </td>
          </tr>
        )
      })
    }

    return (
      <tr key='noEventTemplatesFound'>
        <td colSpan='3'> No event templates found!</td>
      </tr>
    )
  }

  renderEventTemplatesTable() {
    if (this.props.event_templates && this.props.event_templates.filter((template) => template.system_template === false).length) {
      return (
        <Table responsive bordered striped size='sm'>
          <thead>
            <tr>
              <th>Button Name</th>
              <th>Event Value</th>
              <th className='text-center' style={{ width: '90px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>{this.renderEventTemplates()}</tbody>
        </Table>
      )
    }
    return <Card.Body>No Event Templates found!</Card.Body>
  }

  renderSystemEventTemplatesTable() {
    if (this.props.event_templates && this.props.event_templates.filter((template) => template.system_template === true).length) {
      return (
        <Table responsive bordered striped size='sm'>
          <thead>
            <tr>
              <th>Button Name</th>
              <th>Event Value</th>
              <th className='text-center' style={{ width: '90px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>{this.renderSystemEventTemplates()}</tbody>
        </Table>
      )
    }

    return <Card.Body>No System Event Templates found!</Card.Body>
  }

  renderEventTemplatesHeader() {
    const exportTooltip = <Tooltip id='exportTooltip'>Export Event Templates</Tooltip>
    const deleteAllNonSystemTooltip = <Tooltip id='deleteAllNonSystemTooltip'>Delete ALL non-system Event Templates</Tooltip>
    const disableBtn =
      this.props.event_templates.filter((event_template) => event_template.system_template === false).length > 0 ? false : true

    return (
      <div>
        Event Templates
        <div className='float-right'>
          <Form inline>
            <FormControl size='sm' type='text' placeholder='Search' className='mr-sm-2' onChange={this.handleSearchChange} />
            <OverlayTrigger placement='top' overlay={deleteAllNonSystemTooltip}>
              <FontAwesomeIcon
                className='text-danger pl-1'
                onClick={() => this.handleNonSystemEventTemplatesWipe()}
                disabled={disableBtn}
                icon='trash'
                fixedWidth
              />
            </OverlayTrigger>
            <OverlayTrigger placement='top' overlay={exportTooltip}>
              <FontAwesomeIcon
                className='text-primary pl-1'
                onClick={() => this.exportTemplatesToJSON()}
                disabled={disableBtn}
                icon='download'
                fixedWidth
              />
            </OverlayTrigger>
          </Form>
        </div>
      </div>
    )
  }

  renderSystemEventTemplatesHeader() {
    const exportTooltip = <Tooltip id='exportTooltip'>Export System Event Templates</Tooltip>
    const disableBtn =
      this.props.event_templates.filter((event_template) => event_template.system_template === false).length > 0 ? false : true

    return (
      <div>
        System Templates
        <span className='float-right'>
          <Form inline>
            <FormControl size='sm' type='text' placeholder='Search' className='mr-sm-2' onChange={this.handleSystemSearchChange} />
            <OverlayTrigger placement='top' overlay={exportTooltip}>
              <FontAwesomeIcon
                className='text-primary pl-1'
                onClick={() => this.exportSystemTemplatesToJSON()}
                disabled={disableBtn}
                icon='download'
                fixedWidth
              />
            </OverlayTrigger>
          </Form>
        </span>
      </div>
    )
  }

  render() {
    if (!this.props.roles) {
      return <div>Loading...</div>
    }

    if (this.props.roles.some((item) => ['admin', 'cruise_manager', 'template_manager'].includes(item))) {
      return (
        <Container className='mt-2'>
          <DeleteEventTemplateModal />
          <NonSystemEventTemplatesWipeModal />
          <EventTemplateOptionsModal />
          <ImportEventTemplatesModal handleExit={this.handleEventTemplateImportClose} />
          <Row>
            <Col className='px-1' sm={12} md={8} lg={{ span: 6, offset: 1 }} xl={{ span: 5, offset: 2 }}>
              <Card className='border-secondary'>
                <Card.Header>{this.renderSystemEventTemplatesHeader()}</Card.Header>
                {this.renderSystemEventTemplatesTable()}
                <CustomPagination
                  page={this.state.activeSystemPage}
                  count={
                    this.state.filteredSystemTemplates
                      ? this.state.filteredSystemTemplates.length
                      : this.props.event_templates.filter((template) => template.system_template === true).length
                  }
                  pageSelectFunc={this.handleSystemPageSelect}
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
              <div className='float-right my-2'>
                {this.renderImportEventTemplatesButton()}
                {this.renderAddEventTemplateButton()}
              </div>
            </Col>
            <Col className='px-1' sm={12} md={4} lg={4} xl={3}>
              <EventTemplateForm handleFormSubmit={this.props.fetchEventTemplates} />
            </Col>
          </Row>
        </Container>
      )
    } else {
      return <div>What are YOU doing here?</div>
    }
  }
}

EventTemplates.propTypes = {
  deleteAllNonSystemEventTemplates: PropTypes.func.isRequired,
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
