import React, { Component } from 'react'
import { compose } from 'redux'
import { reduxForm, Field } from 'redux-form'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Col, Container, Form, Image, Row } from 'react-bootstrap'
import { renderTextField } from '../form_elements'
import ReCAPTCHA from 'react-google-recaptcha'
import PropTypes from 'prop-types'
import * as mapDispatchToProps from '../../actions'
import { ROOT_PATH, LOGIN_SCREEN_TXT, LOGIN_IMAGE, RECAPTCHA_SITE_KEY } from '../../client_settings'

class Login extends Component {
  constructor(props) {
    super(props)

    this.state = {
      stdUsers: true
    }

    this.recaptchaRef = React.createRef()

    this.handleIFrameAuth = this.handleIFrameAuth.bind(this)
  }

  componentDidMount() {
    window.addEventListener('message', this.handleIFrameAuth)
  }

  componentWillUnmount() {
    this.props.leaveLoginForm()
  }

  handleIFrameAuth(event) {
    if (event.data.event == 'login-with-token') {
      try {
        if ('loginToken' in event.data) {
          this.handleAutologin(event.data)
        }
      } catch (error) {
        console.debug(error)
      }
    }
  }

  async handleAutologin({ loginToken }) {
    let reCaptcha = RECAPTCHA_SITE_KEY ? await this.recaptchaRef.current.executeAsync() : null
    await this.props.autoLogin({ loginToken, reCaptcha })
  }

  async handleFormSubmit({ username, password }) {
    let reCaptcha = RECAPTCHA_SITE_KEY ? await this.recaptchaRef.current.executeAsync() : null
    const credential = username.toLowerCase()
    const payload = credential.includes('@') ? { email: credential, password, reCaptcha } : { username: credential, password, reCaptcha }
    await this.props.login(payload)
  }

  async switch2Guest() {
    let reCaptcha = RECAPTCHA_SITE_KEY ? await this.recaptchaRef.current.executeAsync() : null
    await this.props.switch2Guest(reCaptcha)
  }

  renderMessage(errorMsg, msg) {
    if (errorMsg) {
      return (
        <Alert variant='danger'>
          <strong>Oops!</strong> {errorMsg}
        </Alert>
      )
    } else if (msg) {
      return <Alert variant='success'>{msg}</Alert>
    }
  }

  render() {
    const { handleSubmit, submitting, valid } = this.props

    const recaptcha = RECAPTCHA_SITE_KEY ? (
      <span>
        <ReCAPTCHA ref={this.recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} size='invisible' />
        <br />
      </span>
    ) : null

    const loginButton = (
      <Button variant='primary' type='submit' disabled={submitting || !valid}>
        Login
      </Button>
    )
    const loginAsGuestButton = (
      <Button variant='success' onClick={() => this.switch2Guest()}>
        Login as Guest
      </Button>
    )

    const loginImage = LOGIN_IMAGE ? (
      <div>
        <Image style={{ width: '250px' }} fluid src={`${ROOT_PATH}images/${LOGIN_IMAGE}`} />
      </div>
    ) : null

    const loginScreenTxt = <p style={{ width: '18rem', minWidth: '18rem', whiteSpace: 'pre-wrap' }}>{LOGIN_SCREEN_TXT}</p>

    const loginFormCard = (
      <Card className='me-0' style={{ width: '15rem', minWidth: '15rem' }}>
        <Card.Body>
          <Form onSubmit={handleSubmit(this.handleFormSubmit.bind(this))}>
            <h5>Please log in</h5>
            <Form.Group className='mb-2'>
              <Field name='username' component={renderTextField} placeholder='Username or Email' />
            </Form.Group>
            <Form.Group className='mb-2'>
              <Field name='password' component={renderTextField} type='password' placeholder='Password' />
            </Form.Group>
            {recaptcha}
            {this.renderMessage(this.props.errorMessage, this.props.message)}
            <div className='d-grid gap-2'>
              {loginButton}
              {loginAsGuestButton}
            </div>
          </Form>
          <hr />
          <div className='text-center'>
            <Link className='text-muted text-link' to={'/forgotPassword'}>
              Forgot Password?
            </Link>
            <div className='pt-3 d-grid gap-2'>
              Don&apos;t have an account?
              <Link className='btn btn-sm btn-outline-primary ms-2' to={'/register'}>
                Register
              </Link>
            </div>
          </div>
        </Card.Body>
      </Card>
    )

    return (
      <Container>
        <Row className='pt-5 justify-content-center'>
          <Col className='mb-2' xs={12} sm={6}>
            <div className='d-sm-flex d-none justify-content-end'>{loginFormCard}</div>
            <div className='d-flex d-sm-none justify-content-center'>{loginFormCard}</div>
          </Col>
          <Col xs={12} sm={6}>
            {loginImage}
            <div className='d-sm-flex d-none justify-content-begin'>{loginScreenTxt}</div>
            <div className='d-flex d-sm-none justify-content-center'>{loginScreenTxt}</div>
          </Col>
        </Row>
      </Container>
    )
  }
}

Login.propTypes = {
  autoLogin: PropTypes.func.isRequired,
  errorMessage: PropTypes.string.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  leaveLoginForm: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired,
  message: PropTypes.string,
  submitting: PropTypes.bool.isRequired,
  switch2Guest: PropTypes.func.isRequired,
  valid: PropTypes.bool.isRequired
}

const validate = (formProps) => {
  const errors = {}
  if (!formProps.username) {
    errors.username = 'Required'
  }

  if (!formProps.password) {
    errors.password = 'Required'
  }

  return errors
}

const mapStateToProps = (state) => {
  return {
    errorMessage: state.auth.error,
    successMessage: state.auth.message
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  reduxForm({
    form: 'login',
    validate: validate
  })
)(Login)
