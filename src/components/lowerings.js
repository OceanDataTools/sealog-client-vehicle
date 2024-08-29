import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { connect } from 'react-redux'
import { Row, Button, Col, Card, Container, Form, FormControl, Table, OverlayTrigger, Tooltip } from 'react-bootstrap'
import moment from 'moment'
import PropTypes from 'prop-types'
import LoweringForm from './lowering_form'
import DeleteFileModal from './delete_file_modal'
import DeleteLoweringModal from './delete_lowering_modal'
import ImportLoweringsModal from './import_lowerings_modal'
import CopyLoweringToClipboard from './copy_lowering_to_clipboard'
import LoweringStatsModal from './lowering_stats_modal'
import LoweringPermissionsModal from './lowering_permissions_modal'
import CustomPagination from './custom_pagination'
import { USE_ACCESS_CONTROL } from '../client_settings'
import { get_cruises } from '../api'
import { _Lowerings_, _Lowering_, _lowering_ } from '../vocab'
import * as mapDispatchToProps from '../actions'

let fileDownload = require('js-file-download')

const maxLoweringsPerPage = 8

class Lowerings extends Component {
  constructor(props) {
    super(props)

    this.state = {
      activePage: 1,
      filteredLowerings: [],
      activeCruise: null,
      previouslySelectedLowering: null
    }

    this.filterLoweringsFromProps = this.filterLoweringsFromProps.bind(this)
    this.handlePageSelect = this.handlePageSelect.bind(this)
    this.handleLoweringImportClose = this.handleLoweringImportClose.bind(this)
    this.handleSearchChange = this.handleSearchChange.bind(this)
  }

  componentDidMount() {
    this.setState({ previouslySelectedLowering: this.props.lowering_id })
    this.props.fetchLowerings()
    this.setActiveCruise()
    this.filterLoweringsFromProps()
    this.props.clearSelectedLowering()
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.lowerings !== prevProps.lowerings) {
      this.setState({ filteredLowerings: this.filterLoweringsFromProps() })
    }

    if (this.props.roles !== prevProps.roles) {
      this.setActiveCruise()
    }

    if (this.state.activeCruise !== prevState.activeCruise) {
      this.setState({ filteredLowerings: this.filterLoweringsFromProps() })
    }
  }

  componentWillUnmount() {
    this.props.clearSelectedLowering()
    if (this.state.previouslySelectedLowering) {
      this.props.initLowering(this.state.previouslySelectedLowering)
    }
  }

  async setActiveCruise() {
    if (this.props.roles && !this.props.roles.includes('admin')) {
      const query = { startTS: moment.utc().toISOString() }
      query.stopTS = query.startTS

      const [activeCruise] = (await get_cruises(query)) || null

      this.setState({ activeCruise })
    }
  }

  filterLoweringsFromProps() {
    return this.state.activeCruise
      ? this.props.lowerings.filter((lowering) => {
          return moment
            .utc(lowering.start_ts)
            .isBetween(moment.utc(this.state.activeCruise.start_ts), moment.utc(this.state.activeCruise.stop_ts))
        })
      : this.props.lowerings
  }

  handlePageSelect(eventKey) {
    this.setState({ activePage: eventKey })
  }

  handleLoweringDeleteModal(id) {
    this.props.showModal('deleteLowering', {
      id: id,
      handleDelete: this.props.deleteLowering
    })
  }

  handleLoweringPermissions(lowering_id) {
    this.props.showModal('loweringPermissions', { lowering_id: lowering_id })
  }

  handleLoweringUpdate(id) {
    this.props.initLowering(id)
    window.scrollTo(0, 0)
  }

  handleLoweringShow(id) {
    this.props.showLowering(id)
  }

  handleLoweringHide(id) {
    this.props.hideLowering(id)
  }

  handleLoweringCreate() {
    this.props.leaveLoweringForm()
  }

  handleLoweringImportModal() {
    this.props.showModal('importLowerings', {
      handleHide: this.handleLoweringImportClose
    })
  }

  handleLoweringImportClose() {
    this.props.fetchLowerings()
  }

  handleSearchChange(event) {
    let fieldVal = event.target.value
    if (fieldVal !== '') {
      this.setState({
        filteredLowerings: this.props.lowerings.filter((lowering) => {
          if (
            this.state.activeCruise &&
            !moment
              .utc(lowering.start_ts)
              .isBetween(moment.utc(this.state.activeCruise.start_ts), moment.utc(this.state.activeCruise.stop_ts))
          ) {
            return false
          }
          const regex = RegExp(fieldVal, 'i')
          if (lowering.lowering_id.match(regex) || lowering.lowering_location.match(regex)) {
            return lowering
          } else if (lowering.lowering_tags.includes(fieldVal)) {
            return lowering
          }
        })
      })
    } else {
      this.setState({ filteredLowerings: this.filterLoweringsFromProps() })
    }
    this.handlePageSelect(1)
  }

  exportLoweringsToJSON() {
    fileDownload(JSON.stringify(this.props.lowerings, null, 2), 'sealog_loweringExport.json')
  }

  renderAddLoweringButton() {
    if (!this.props.showform && this.props.roles && this.props.roles.includes('admin')) {
      return (
        <Button variant='primary' size='sm' onClick={() => this.handleLoweringCreate()} disabled={!this.props.lowering_id}>
          Add {_Lowering_}
        </Button>
      )
    }
  }

  renderImportLoweringsButton() {
    if (this.props.roles.includes('admin')) {
      return (
        <Button className='mr-1' variant='primary' size='sm' onClick={() => this.handleLoweringImportModal()}>
          Import From File
        </Button>
      )
    }
  }

  renderLowerings() {
    const editTooltip = <Tooltip id='editTooltip'>Edit this {_lowering_}.</Tooltip>
    const deleteTooltip = <Tooltip id='deleteTooltip'>Delete this {_lowering_}.</Tooltip>
    const showTooltip = <Tooltip id='showTooltip'>{_Lowering_} is hidden, click to show.</Tooltip>
    const hideTooltip = <Tooltip id='hideTooltip'>{_Lowering_} is visible, click to hide.</Tooltip>
    const permissionTooltip = <Tooltip id='permissionTooltip'>User permissions.</Tooltip>

    return this.state.filteredLowerings.map((lowering, index) => {
      if (index >= (this.state.activePage - 1) * maxLoweringsPerPage && index < this.state.activePage * maxLoweringsPerPage) {
        let editLink = (
          <OverlayTrigger placement='top' overlay={editTooltip}>
            <FontAwesomeIcon
              className='text-warning pl-1'
              onClick={() => this.handleLoweringUpdate(lowering.id)}
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
                onClick={() => this.handleLoweringPermissions(lowering.id)}
                icon='user-lock'
                fixedWidth
              />
            </OverlayTrigger>
          ) : null

        let deleteLink = this.props.roles.includes('admin') ? (
          <OverlayTrigger placement='top' overlay={deleteTooltip}>
            <FontAwesomeIcon
              className='text-danger pl-1'
              onClick={() => this.handleLoweringDeleteModal(lowering.id)}
              icon='trash'
              fixedWidth
            />
          </OverlayTrigger>
        ) : null

        let hiddenLink = (
          <OverlayTrigger placement='top' overlay={lowering.lowering_hidden ? showTooltip : hideTooltip}>
            <FontAwesomeIcon
              className={lowering.lowering_hidden ? 'pl-1' : 'text-success pl-1'}
              onClick={() => (lowering.lowering_hidden ? this.handleLoweringShow(lowering.id) : this.handleLoweringHide(lowering.id))}
              icon={lowering.lowering_hidden ? 'eye-slash' : 'eye'}
              fixedWidth
            />
          </OverlayTrigger>
        )

        let loweringLocation = lowering.lowering_location ? (
          <span>
            Location: {lowering.lowering_location}
            <br />
          </span>
        ) : null

        let loweringStartTime = moment.utc(lowering.start_ts)
        let loweringStarted = (
          <span>
            Started: {loweringStartTime.format('YYYY-MM-DD HH:mm')}
            <br />
          </span>
        )

        let loweringEndTime = moment.utc(lowering.stop_ts)
        let loweringDuration = loweringEndTime.diff(loweringStartTime)
        let loweringDurationStr = (
          <span>
            Duration: {moment.duration(loweringDuration).format('d [days] h [hours] m [minutes]')}
            <br />
          </span>
        )

        return (
          <tr key={lowering.id}>
            <td className={this.props.lowering_id === lowering.id ? 'text-warning' : ''}>{lowering.lowering_id}</td>
            <td className={`lowering-details ${this.props.lowering_id === lowering.id ? 'text-warning' : ''}`}>
              {loweringLocation}
              {loweringStarted}
              {loweringDurationStr}
            </td>
            <td className='text-center'>
              {editLink}
              {permLink}
              {hiddenLink}
              {deleteLink}
              <CopyLoweringToClipboard lowering={lowering} />
            </td>
          </tr>
        )
      }
    })
  }

  renderLoweringTable() {
    if (this.props.lowerings && this.props.lowerings.length > 0) {
      return (
        <Table responsive bordered striped size='sm'>
          <thead>
            <tr>
              <th>{_Lowering_}</th>
              <th>Details</th>
              <th className='text-center' style={{ width: '90px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>{this.renderLowerings()}</tbody>
        </Table>
      )
    } else {
      return <Card.Body>No {_Lowerings_} Found!</Card.Body>
    }
  }

  renderLoweringHeader() {
    const exportTooltip = <Tooltip id='exportTooltip'>Export {_Lowerings_}</Tooltip>

    return (
      <div>
        {_Lowerings_}
        <span className='float-right'>
          <Form inline>
            <FormControl size='sm' type='text' placeholder='Search' className='mr-sm-2' onChange={this.handleSearchChange} />
            <OverlayTrigger placement='top' overlay={exportTooltip}>
              <FontAwesomeIcon className='text-primary' onClick={() => this.exportLoweringsToJSON()} icon='download' fixedWidth />
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

    if (this.props.roles.includes('admin') || this.props.roles.includes('cruise_manager')) {
      return (
        <Container className='mt-2'>
          <DeleteFileModal />
          <DeleteLoweringModal />
          <ImportLoweringsModal handleExit={this.handleLoweringImportClose} handleFormSubmit={this.props.fetchLowerings} />
          <LoweringStatsModal />
          <LoweringPermissionsModal />
          <Row>
            <Col className='px-1' sm={12} md={7} lg={6} xl={{ span: 5, offset: 1 }}>
              <Card className='border-secondary'>
                <Card.Header>{this.renderLoweringHeader()}</Card.Header>
                {this.renderLoweringTable()}
              </Card>
              <CustomPagination
                className='mt-2'
                page={this.state.activePage}
                count={this.state.filteredLowerings ? this.state.filteredLowerings.length : this.props.lowerings.length}
                pageSelectFunc={this.handlePageSelect}
                maxPerPage={maxLoweringsPerPage}
              />
              <div className='float-right my-2'>
                {this.renderImportLoweringsButton()}
                {this.renderAddLoweringButton()}
              </div>
            </Col>
            <Col className='px-1' sm={12} md={5} lg={6} xl={5}>
              <LoweringForm handleFormSubmit={this.props.fetchLowerings} />
            </Col>
          </Row>
        </Container>
      )
    } else {
      return <div>What are YOU doing here?</div>
    }
  }
}

Lowerings.propTypes = {
  clearSelectedLowering: PropTypes.func.isRequired,
  lowering_id: PropTypes.string,
  lowerings: PropTypes.array,
  deleteLowering: PropTypes.func.isRequired,
  fetchLowerings: PropTypes.func.isRequired,
  hideLowering: PropTypes.func.isRequired,
  initLowering: PropTypes.func.isRequired,
  leaveLoweringForm: PropTypes.func.isRequired,
  roles: PropTypes.array,
  showLowering: PropTypes.func.isRequired,
  showform: PropTypes.func,
  showModal: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    lowerings: state.lowering.lowerings,
    lowering_id: state.lowering.lowering.id,
    roles: state.user.profile.roles || []
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Lowerings)
