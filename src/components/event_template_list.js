import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Alert, Button, Tab, Tabs } from 'react-bootstrap'
import PropTypes from 'prop-types'
import EventTemplateOptionsModal from './event_template_options_modal'
import { Client } from '@hapi/nes/lib/client'
import { authorizationHeader } from '../api'
import { WS_ROOT_URL, CATEGORY_SORT_ORDER } from '../client_settings'
import * as mapDispatchToProps from '../actions'

const sortCategories = (category_list) => {
  if (CATEGORY_SORT_ORDER == null || CATEGORY_SORT_ORDER.length === 0) {
    return category_list
  }

  const order_map = new Map()
  CATEGORY_SORT_ORDER.forEach((item, index) => order_map.set(item.toLowerCase(), index))

  return category_list.sort((a, b) => {
    // Check if the item exists in the orderList
    const indexA = order_map.has(a) ? order_map.get(a) : Infinity
    const indexB = order_map.has(b) ? order_map.get(b) : Infinity

    // If both items are in the orderList, sort by their indices
    if (indexA !== Infinity && indexB !== Infinity) {
      return indexA - indexB
    }

    // If only one item is in the orderList, place it before the item not in the list
    if (indexA === Infinity && indexB !== Infinity) {
      return 1
    }
    if (indexB === Infinity && indexA !== Infinity) {
      return -1
    }

    // If neither item is in the orderList, preserve their original order
    return 0
  })
}

class EventTemplateList extends Component {
  constructor(props) {
    super(props)

    this.state = {
      active_template_category: null,
      fetching: true
    }

    this.client = new Client(`${WS_ROOT_URL}`)
    this.connectToWS = this.connectToWS.bind(this)
    this.fetchEventTemplates = this.fetchEventTemplates.bind(this)
    this.renderEventTemplates = this.renderEventTemplates.bind(this)
  }

  componentDidMount() {
    if (this.props.authenticated) {
      this.fetchEventTemplates()
      this.connectToWS()
    }
  }

  componentWillUnmount() {
    this.client.disconnect()
  }

  async connectToWS() {
    try {
      await this.client.connect({
        auth: authorizationHeader
      })

      const deleteHandler = () => {
        this.props.fetchEventTemplates()
      }

      const updateHandler = () => {
        this.props.fetchEventTemplates()
      }

      this.client.subscribe('/ws/status/newEventTemplates', updateHandler)
      this.client.subscribe('/ws/status/updateEventTemplates', updateHandler)
      this.client.subscribe('/ws/status/deleteEventTemplates', deleteHandler)
    } catch (error) {
      console.error('Problem connecting to websocket subscriptions')
      console.debug(error)
    }
  }

  async handleEventSubmit(event_template, e = null) {
    const needs_modal =
      (e && e.shiftKey) ||
      event_template.event_options.reduce((needs, option) => {
        return option.event_option_type !== 'static text' ? true : needs
      }, false)

    if (event_template.event_free_text_required || needs_modal) {
      const event = await this.props.createEvent({
        event_value: event_template.event_value
        // publish: false
      })
      this.props.showModal('eventOptions', {
        eventTemplate: event_template,
        event: event,
        handleUpdateEvent: this.props.updateEvent,
        handleDeleteEvent: this.props.deleteEvent
      })
    } else {
      const event_options = event_template.event_options.reduce((eventOptions, option) => {
        eventOptions.push({
          event_option_name: option.event_option_name,
          event_option_value: option.event_option_default_value
        })
        return eventOptions
      }, [])

      await this.props.createEvent({
        event_value: event_template.event_value,
        event_free_text: '',
        event_options
      })
    }
  }

  async fetchEventTemplates() {
    this.setState({ fetching: true })
    await this.props.fetchEventTemplates()
    this.setState({ fetching: false })
  }

  updateEventTemplateCategory(category) {
    this.setState({ active_template_category: category })
  }

  renderEventTemplates() {
    const template_categories = [
      ...new Set(
        this.props.event_templates.reduce((flat, event_template) => {
          return flat.concat(event_template.template_categories)
        }, [])
      )
    ].sort()

    const sorted_categories = sortCategories(template_categories)

    if (this.props.event_templates) {
      if (sorted_categories.length > 0) {
        return (
          <Tabs
            className='category-tab'
            variant='pills'
            transition={false}
            activeKey={this.state.active_template_category ? this.state.active_template_category : sorted_categories[0]}
            id='event-template-tabs'
            onSelect={(category) => this.updateEventTemplateCategory(category)}
          >
            {sorted_categories.map((template_category) => {
              return (
                <Tab eventKey={template_category} title={template_category} key={template_category}>
                  {this.props.event_templates
                    .filter(
                      (event_template) =>
                        (typeof event_template.disabled === 'undefined' || !event_template.disabled) &&
                        event_template.template_categories.includes(template_category)
                    )
                    .map((event_template) => {
                      return (
                        <Button
                          className='mt-1 mr-1 py-3 btn-template'
                          variant='primary'
                          to='#'
                          key={`template_${event_template.id}`}
                          onClick={(e) => this.handleEventSubmit(event_template, e)}
                        >
                          {event_template.event_name}
                        </Button>
                      )
                    })}
                </Tab>
              )
            })}
            <Tab eventKey='all' title='All'>
              {this.props.event_templates
                .filter((event_template) => typeof event_template.disabled === 'undefined' || !event_template.disabled)
                .map((event_template) => {
                  return (
                    <Button
                      className='mt-1 mr-1 py-3 btn-template'
                      variant='primary'
                      to='#'
                      key={`template_${event_template.id}`}
                      onClick={(e) => this.handleEventSubmit(event_template, e)}
                    >
                      {event_template.event_name}
                    </Button>
                  )
                })}
            </Tab>
          </Tabs>
        )
      } else {
        return this.props.event_templates
          .filter((event_template) => typeof event_template.disabled === 'undefined' || !event_template.disabled)
          .map((event_template) => {
            return (
              <Button
                className='mt-1 mr-1 py-3 btn-template'
                variant='primary'
                to='#'
                key={`template_${event_template.id}`}
                onClick={(e) => this.handleEventSubmit(event_template, e)}
              >
                {event_template.event_name}
              </Button>
            )
          })
      }
    }
  }

  render() {
    if (this.state.fetching) {
      return <Alert>Loading...</Alert>
    }

    if (this.props.event_templates.length) {
      return (
        <div style={this.props.style}>
          <EventTemplateOptionsModal handleUpdateEvent={this.props.updateEvent} handleDeleteEvent={this.props.deleteEvent} />
          {this.renderEventTemplates()}
        </div>
      )
    }

    return <Alert variant='danger'>No Event Templates found</Alert>
  }
}

EventTemplateList.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  createEvent: PropTypes.func.isRequired,
  deleteEvent: PropTypes.func.isRequired,
  event_templates: PropTypes.array.isRequired,
  fetchEventTemplates: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  style: PropTypes.string,
  updateEvent: PropTypes.func.isRequired
}

const mapStateToProps = (state) => {
  return {
    authenticated: state.auth.authenticated,
    event_templates: state.event_template.event_templates
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(EventTemplateList)
