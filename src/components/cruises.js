import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { connect } from 'react-redux'
import { Row, Button, Col, Card, Container, Form, FormControl, Table, OverlayTrigger, Tooltip } from 'react-bootstrap'
import moment from 'moment'
import PropTypes from 'prop-types'
import CruiseForm from './cruise_form'
import DeleteCruiseModal from './delete_cruise_modal'
import DeleteFileModal from './delete_file_modal'
import ExecuteModal from './execute_modal'
import ImportCruisesModal from './import_cruises_modal'
import CopyCruiseToClipboard from './copy_cruise_to_clipboard'
import CruisePermissionsModal from './cruise_permissions_modal'
import CustomPagination from './custom_pagination'
import { USE_ACCESS_CONTROL } from '../client_settings'
import { _Cruises_, _Cruise_, _cruise_, _lowerings_ } from '../vocab'
import * as mapDispatchToProps from '../actions'

let fileDownload = require('js-file-download')

const maxCruisesPerPage = 6

class Cruises extends Component {
  constructor(props) {
    super(props)

    this.state = {
      activePage: 1,
      filteredCruises: [],
      previouslySelectedCruise: null
    }

    this.handlePageSelect = this.handlePageSelect.bind(this)
    this.handleCruiseImportClose = this.handleCruiseImportClose.bind(this)
    this.handleSearchChange = this.handleSearchChange.bind(this)
  }

  componentDidMount() {
    this.setState({ previouslySelectedCruise: this.props.cruise_id })
    this.props.fetchCruises()
    this.props.clearSelectedCruise()
  }

  componentDidUpdate(prevProps) {
    if (this.props.cruises !== prevProps.cruises) {
      if (!this.props.roles.includes('admin')) {
        const currentCruise = this.props.cruises
          ? this.props.cruises.find((cruise) => {
              const now = moment.utc()
              return now.isBetween(moment.utc(cruise.start_ts), moment.utc(cruise.stop_ts))
            })
          : null

        // There is an active cruise, auto select it
        if (currentCruise && currentCruise.id !== this.props.cruise_id) {
          this.props.initCruise(currentCruise.id)
        }

        // Update the filtered list of cruise to only include the active cruise
        this.setState({
          filteredCruises: currentCruise ? [currentCruise] : []
        })
      } else {
        this.setState({
          filteredCruises: this.props.cruises
        })
      }
    }
  }

  componentWillUnmount() {
    this.props.clearSelectedCruise()
    if (this.state.previouslySelectedCruise) {
      this.props.initCruise(this.state.previouslySelectedCruise)
    }
  }

  handlePageSelect(eventKey) {
    this.setState({ activePage: eventKey })
  }

  handleCruiseDeleteModal(id) {
    this.props.showModal('deleteCruise', {
      id: id,
      handleDelete: this.props.deleteCruise
    })
  }

  handleCruiseExportModal(cruise) {
    this.props.showModal('executeCommand', {
      title: `Export ${_Cruise_}: ${cruise['cruise_id']}`,
      message: `Export data related to this cruise and all associated ${_lowerings_} to files.`,
      handleConfirm: () => this.props.exportCruise(cruise['id'])
    })
  }

  handleCruisePermissionsModal(cruise) {
    this.props.showModal('cruisePermissions', { cruise_id: cruise.id })
  }

  handleCruiseUpdate(id) {
    this.props.initCruise(id)
    window.scrollTo(0, 0)
  }

  handleCruiseShow(id) {
    this.props.showCruise(id)
  }

  handleCruiseHide(id) {
    this.props.hideCruise(id)
  }

  handleCruiseCreate() {
    this.props.leaveCruiseForm()
  }

  handleCruiseImportModal() {
    this.props.showModal('importCruises', {
      handleHide: this.handleCruiseImportClose
    })
  }

  handleCruiseImportClose() {
    this.props.fetchCruises()
  }

  handleSearchChange(event) {
    let fieldVal = event.target.value
    if (fieldVal !== '') {
      this.setState({
        filteredCruises: this.props.cruises.filter((cruise) => {
          const regex = RegExp(fieldVal, 'i')
          if (
            cruise.cruise_id.match(regex) ||
            cruise.cruise_location.match(regex) ||
            cruise.cruise_tags.includes(fieldVal) ||
            cruise.cruise_additional_meta.cruise_vessel.match(regex) ||
            cruise.cruise_additional_meta.cruise_pi.match(regex)
          ) {
            return cruise
          } else if (
            cruise.cruise_additional_meta.cruise_departure_location &&
            cruise.cruise_additional_meta.cruise_departure_location.match(regex)
          ) {
            return cruise
          } else if (
            cruise.cruise_additional_meta.cruise_arrival_location &&
            cruise.cruise_additional_meta.cruise_arrival_location.match(regex)
          ) {
            return cruise
          } else if (
            cruise.cruise_additional_meta.cruise_partipants &&
            cruise.cruise_additional_meta.cruise_partipants.includes(fieldVal)
          ) {
            return cruise
          }
        })
      })
    } else {
      this.setState({ filteredCruises: [] })
    }
    this.handlePageSelect(1)
  }

  exportCruisesToJSON() {
    fileDownload(JSON.stringify(this.props.cruises, null, '\t'), 'sealog_cruisesExport.json')
  }

  renderAddCruiseButton() {
    if (!this.props.showform && this.props.roles && this.props.roles.includes('admin')) {
      return (
        <Button variant='primary' size='sm' onClick={() => this.handleCruiseCreate()} disabled={!this.props.cruise_id}>
          Add {_Cruise_}
        </Button>
      )
    }
  }

  renderImportCruisesButton() {
    if (this.props.roles.includes('admin')) {
      return (
        <Button className='mr-1' variant='primary' size='sm' onClick={() => this.handleCruiseImportModal()}>
          Import From File
        </Button>
      )
    }
  }

  renderCruises() {
    const editTooltip = <Tooltip id='editTooltip'>Edit this {_cruise_}.</Tooltip>
    const deleteTooltip = <Tooltip id='deleteTooltip'>Delete this {_cruise_}.</Tooltip>
    const exportTooltip = <Tooltip id='exportTooltip'>Export this {_cruise_}.</Tooltip>
    const showTooltip = <Tooltip id='showTooltip'>{_Cruise_} is hidden, click to show.</Tooltip>
    const hideTooltip = <Tooltip id='hideTooltip'>{_Cruise_} is visible, click to hide.</Tooltip>
    const permissionTooltip = <Tooltip id='permissionTooltip'>User permissions.</Tooltip>

    return this.state.filteredCruises.map((cruise, index) => {
      if (index >= (this.state.activePage - 1) * maxCruisesPerPage && index < this.state.activePage * maxCruisesPerPage) {
        let editLink = (
          <OverlayTrigger placement='top' overlay={editTooltip}>
            <FontAwesomeIcon
              className='text-warning pl-1'
              onClick={() => this.handleCruiseUpdate(cruise.id)}
              icon='pencil-alt'
              fixedWidth
            />
          </OverlayTrigger>
        )

        let permLink =
          USE_ACCESS_CONTROL && this.props.roles.includes('admin') ? (
            <OverlayTrigger placement='top' overlay={permissionTooltip}>
              <FontAwesomeIcon
                className='text-info pl-1'
                onClick={() => this.handleCruisePermissionsModal(cruise)}
                icon='user-lock'
                fixedWidth
              />
            </OverlayTrigger>
          ) : null

        let deleteLink = this.props.roles.includes('admin') ? (
          <OverlayTrigger placement='top' overlay={deleteTooltip}>
            <FontAwesomeIcon className='text-danger pl-1' onClick={() => this.handleCruiseDeleteModal(cruise.id)} icon='trash' fixedWidth />
          </OverlayTrigger>
        ) : null

        let exportLink = this.props.roles.includes('admin') ? (
          <OverlayTrigger placement='top' overlay={exportTooltip}>
            <FontAwesomeIcon className='text-info pl-1' onClick={() => this.handleCruiseExportModal(cruise)} icon='download' fixedWidth />
          </OverlayTrigger>
        ) : null

        let hiddenLink = this.props.roles.includes('admin') ? (
          <OverlayTrigger placement='top' overlay={cruise.cruise_hidden ? showTooltip : hideTooltip}>
            <FontAwesomeIcon
              className={cruise.cruise_hidden ? 'pl-1' : 'text-success pl-1'}
              onClick={() => (cruise.cruise_hidden ? this.handleCruiseShow(cruise.id) : this.handleCruiseHide(cruise.id))}
              icon={cruise.cruise_hidden ? 'eye-slash' : 'eye'}
              fixedWidth
            />
          </OverlayTrigger>
        ) : null

        let cruiseName = cruise.cruise_additional_meta.cruise_name ? (
          <span>
            Name: {cruise.cruise_additional_meta.cruise_name}
            <br />
          </span>
        ) : null
        let cruiseLocation = cruise.cruise_location ? (
          <span>
            Location: {cruise.cruise_location}
            <br />
          </span>
        ) : null
        let cruiseVessel = cruise.cruise_additional_meta.cruise_vessel ? (
          <span>
            Vessel: {cruise.cruise_additional_meta.cruise_vessel}
            <br />
          </span>
        ) : null
        let cruisePi = cruise.cruise_additional_meta.cruise_pi ? (
          <span>
            PI: {cruise.cruise_additional_meta.cruise_pi}
            <br />
          </span>
        ) : null

        return (
          <tr key={cruise.id}>
            <td className={this.props.cruise_id === cruise.id ? 'text-warning' : ''}>{cruise.cruise_id}</td>
            <td className={`cruise-details ${this.props.cruise_id === cruise.id ? 'text-warning' : ''}`}>
              {cruiseName}
              {cruiseLocation}
              {cruisePi}
              {cruiseVessel}
              Dates: {moment.utc(cruise.start_ts).format('L')}
              <FontAwesomeIcon icon='arrow-right' fixedWidth />
              {moment.utc(cruise.stop_ts).format('L')}
            </td>
            <td className='text-center'>
              {editLink}
              {permLink}
              {exportLink}
              {hiddenLink}
              {deleteLink}
              <CopyCruiseToClipboard cruise={cruise} />
            </td>
          </tr>
        )
      }
    })
  }

  renderCruiseTable() {
    if (this.state.filteredCruises.length > 0) {
      return (
        <Table responsive bordered striped size='sm'>
          <thead>
            <tr>
              <th>{_Cruise_}</th>
              <th>Details</th>
              <th className='text-center' style={{ width: '90px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>{this.renderCruises()}</tbody>
        </Table>
      )
    } else if (!this.props.roles.includes('admin')) {
      return <Card.Body>Sorry, you can only edit active {_Cruises_}!</Card.Body>
    } else {
      return <Card.Body>No {_Cruises_} found!</Card.Body>
    }
  }

  renderCruiseHeader() {
    const exportTooltip = <Tooltip id='exportTooltip'>Export {_Cruises_}</Tooltip>

    return (
      <div>
        {_Cruises_}
        <span className='float-right'>
          <Form inline>
            {this.props.roles.includes('admin') ? (
              <FormControl size='sm' type='text' placeholder='Search' className='mr-sm-2' onChange={this.handleSearchChange} />
            ) : null}
            <OverlayTrigger placement='top' overlay={exportTooltip}>
              <FontAwesomeIcon className='text-primary' onClick={() => this.exportCruisesToJSON()} icon='download' fixedWidth />
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

    if (this.props.roles.some((item) => ['admin', 'cruise_manager'].includes(item))) {
      return (
        <Container className='mt-2'>
          <DeleteCruiseModal />
          <DeleteFileModal />
          <ExecuteModal />
          <CruisePermissionsModal onClose={this.props.fetchCruises} />
          <ImportCruisesModal handleExit={this.handleCruiseImportClose} />
          <Row>
            <Col className='px-1' sm={12} md={7} lg={6} xl={{ span: 5, offset: 1 }}>
              <Card className='border-secondary'>
                <Card.Header>{this.renderCruiseHeader()}</Card.Header>
                {this.renderCruiseTable()}
              </Card>
              <CustomPagination
                className='mt-2'
                page={this.state.activePage}
                count={this.state.filteredCruises.length}
                pageSelectFunc={this.handlePageSelect}
                maxPerPage={maxCruisesPerPage}
              />
              <div className='my-2 float-right'>
                {this.renderImportCruisesButton()}
                {this.renderAddCruiseButton()}
              </div>
            </Col>
            <Col className='px-1' sm={12} md={5} lg={6} xl={5}>
              <CruiseForm handleFormSubmit={this.props.fetchCruises} />
            </Col>
          </Row>
        </Container>
      )
    } else {
      return <div>What are YOU doing here?</div>
    }
  }
}

Cruises.propTypes = {
  clearSelectedCruise: PropTypes.func.isRequired,
  cruise_id: PropTypes.string,
  cruises: PropTypes.array,
  deleteCruise: PropTypes.func.isRequired,
  exportCruise: PropTypes.func.isRequired,
  fetchCruises: PropTypes.func.isRequired,
  hideCruise: PropTypes.func.isRequired,
  initCruise: PropTypes.func.isRequired,
  leaveCruiseForm: PropTypes.func.isRequired,
  roles: PropTypes.array,
  showCruise: PropTypes.func.isRequired,
  showform: PropTypes.func,
  showModal: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    cruises: state.cruise.cruises,
    cruise_id: state.cruise.cruise.id,
    roles: state.user.profile.roles || []
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Cruises)
