import React, { Component } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { reduxForm, Field } from 'redux-form'
import { Button, Card, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'
import { renderAlert, renderCheckboxGroup, renderMessage, renderSwitch, renderTextField } from './form_elements'
import * as mapDispatchToProps from '../actions'
import { standardUserRoleOptions } from '../standard_user_role_options'
import { systemUserRoleOptions } from '../system_user_role_options'

class UserForm extends Component {
  componentDidMount() {}

  componentWillUnmount() {
    this.props.leaveUserForm()
  }

  handleFormSubmit(formProps) {
    if (this.props.user.id) {
      formProps.id = this.props.user.id
      delete formProps.email
      delete formProps.last_login
    } else {
      formProps.system_user = formProps.system_user || false
      formProps.disabled = formProps.disabled || false
    }

    delete formProps.confirmPassword

    if (formProps.id) {
      this.props.updateUser(formProps)
    } else {
      this.props.createUser(formProps)
    }

    this.props.handleFormSubmit()
  }

  renderAdminOptions() {
    if (this.props.roles.includes('admin')) {
      return (
        <React.Fragment>
          <Form.Row>{this.renderSystemUserOption()}</Form.Row>
          <Form.Row>{this.renderDisableUserOption()}</Form.Row>
        </React.Fragment>
      )
    }
  }

  renderSystemUserOption() {
    return <Field name='system_user' label='System User' component={renderSwitch} />
  }

  renderDisableUserOption() {
    if (this.props.profile.id !== this.props.user.id) {
      return <Field name='disabled' label='User Disabled' component={renderSwitch} />
    }
  }

  render() {
    const { handleSubmit, pristine, reset, submitting, valid } = this.props
    const formHeader = <div>{this.props.user.id ? 'Update' : 'Add'} User</div>

    if (this.props.roles && (this.props.roles.includes('admin') || this.props.roles.includes('cruise_manager'))) {
      let userRoleOptions = this.props.roles.includes('admin')
        ? systemUserRoleOptions.concat(standardUserRoleOptions)
        : standardUserRoleOptions

      return (
        <Card className='border-secondary'>
          <Card.Header>{formHeader}</Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit(this.handleFormSubmit.bind(this))}>
              <Form.Row>
                <Field name='username' component={renderTextField} label='Username' required={true} />
                <Field name='fullname' component={renderTextField} label='Full Name' required={true} />
                <Field name='email' component={renderTextField} label='Email' required={true} disabled={this.props.user.id ? true : false} />
                <Field name='password' component={renderTextField} type='password' label='Password' />
                <Field name='confirmPassword' component={renderTextField} type='password' label='Confirm Password' />
                <Field name='roles' component={renderCheckboxGroup} label='Roles' options={userRoleOptions} required={true} />
              </Form.Row>
              {this.renderAdminOptions()}
              {renderAlert(this.props.errorMessage)}
              {renderMessage(this.props.message)}
              <div className='float-right'>
                <Button className='mr-1' variant='secondary' size='sm' disabled={pristine || submitting} onClick={reset}>
                  Reset Values
                </Button>
                <Button variant='primary' size='sm' type='submit' disabled={submitting || !valid || pristine}>
                  {this.props.user.id ? 'Update' : 'Add'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )
    } else {
      return <div>What are YOU doing here?</div>
    }
  }
}

UserForm.propTypes = {
  createUser: PropTypes.func.isRequired,
  errorMessage: PropTypes.string.isRequired,
  handleFormSubmit: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  leaveUserForm: PropTypes.func.isRequired,
  message: PropTypes.string.isRequired,
  pristine: PropTypes.bool.isRequired,
  profile: PropTypes.object.isRequired,
  reset: PropTypes.func.isRequired,
  roles: PropTypes.array.isRequired,
  submitting: PropTypes.bool.isRequired,
  updateUser: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  valid: PropTypes.bool.isRequired
}

const validate = (formProps) => {
  const errors = {}

  if (!formProps.username) {
    errors.username = 'Required'
  } else if (formProps.username.length > 15) {
    errors.username = 'Must be 15 characters or less'
  } else if (formProps.username.match(/[A-Z]/)) {
    errors.username = 'Username must be all lowercase'
  } else if (formProps.username.match(/[ ]/)) {
    errors.username = 'Username can not include whitespace'
  }

  if (!formProps.fullname) {
    errors.fullname = 'Required'
  }

  if (!formProps.email) {
    errors.email = 'Required'
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(formProps.email)) {
    errors.email = 'Invalid email address'
  }

  if (formProps.password !== formProps.confirmPassword) {
    errors.password = 'Passwords must match'
  }

  if (!formProps.roles || formProps.roles.length === 0) {
    errors.roles = 'Must select at least one role'
  }

  return errors
}

const mapStateToProps = (state) => {
  let initialValues = { ...state.user.user }

  return {
    errorMessage: state.user.user_error,
    message: state.user.user_message,
    initialValues: initialValues,
    user: state.user.user,
    roles: state.user.profile.roles,
    profile: state.user.profile
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  reduxForm({
    form: 'editUser',
    enableReinitialize: true,
    validate: validate
  })
)(UserForm)
