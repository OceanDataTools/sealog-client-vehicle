import React from 'react'
import { Alert, Col, Form, OverlayTrigger, Tooltip } from 'react-bootstrap'
import Datetime from 'react-datetime'
import moment from 'moment'

export const dateFormat = 'YYYY-MM-DD'
export const timeFormat = 'HH:mm:ss'

export const renderStaticTextField = ({ input, label, xs = 12, sm = 12, md = 12, lg = 12 }) => {
  const labelComponent = label ? <Form.Label>{label}</Form.Label> : null

  return (
    <Form.Group as={Col} xs={xs} sm={sm} md={md} lg={lg}>
      {labelComponent}
      <Form.Control type='text' {...input} disabled />
    </Form.Group>
  )
}

export const renderTextField = ({
  input,
  label,
  placeholder,
  required,
  meta: { touched, error, warning },
  type = 'text',
  disabled = false,
  xs = 12,
  sm = 12,
  md = 12,
  lg = 12
}) => {
  const requiredField = required ? <span className='text-danger'> *</span> : ''
  const labelComponent = label ? (
    <Form.Label>
      {label}
      {requiredField}
    </Form.Label>
  ) : null
  input.value = typeof input.value === 'object' ? input.value.join(', ') : input.value

  return (
    <Form.Group as={Col} xs={xs} sm={sm} md={md} lg={lg}>
      {labelComponent}
      <Form.Control type={type} {...input} placeholder={placeholder} isInvalid={touched && (warning || error)} disabled={disabled} />
      <Form.Control.Feedback className={warning ? 'text-warning' : ''} type='invalid'>
        {error}
        {warning}
      </Form.Control.Feedback>
    </Form.Group>
  )
}

export const renderTextArea = ({
  input,
  label,
  placeholder,
  required,
  meta: { touched, error },
  rows = 4,
  disabled = false,
  xs = 12,
  sm = 12,
  md = 12,
  lg = 12
}) => {
  let requiredField = required ? <span className='text-danger'> *</span> : ''
  input.value = typeof input.value === 'object' ? input.value.join(', ') : input.value

  return (
    <Form.Group as={Col} xs={xs} sm={sm} md={md} lg={lg}>
      <Form.Label>
        {label}
        {requiredField}
      </Form.Label>
      <Form.Control as='textarea' {...input} placeholder={placeholder} isInvalid={touched && error} disabled={disabled} rows={rows} />
      <Form.Control.Feedback type='invalid'>{error}</Form.Control.Feedback>
    </Form.Group>
  )
}

export const renderSelectField = ({
  input,
  label,
  placeholder,
  required,
  options,
  meta: { touched, error },
  disabled = false,
  xs = 12,
  sm = 12,
  md = 12,
  lg = 12
}) => {
  let requiredField = required ? <span className='text-danger'> *</span> : ''
  let defaultOption = <option key={`${input.name}.empty`} value=''></option>
  let optionList = options.map((option, index) => {
    return <option key={`${input.name}.${index}`} value={`${option}`}>{`${option}`}</option>
  })

  return (
    <Form.Group as={Col} xs={xs} sm={sm} md={md} lg={lg}>
      <Form.Label>
        {label}
        {requiredField}
      </Form.Label>
      <Form.Control as='select' {...input} placeholder={placeholder} isInvalid={touched && error} disabled={disabled}>
        {defaultOption}
        {optionList}
      </Form.Control>
      <Form.Control.Feedback type='invalid'>{error}</Form.Control.Feedback>
    </Form.Group>
  )
}

export const renderDatePicker = ({
  input,
  label,
  required,
  meta: { error },
  dateFormat = 'YYYY-MM-DD',
  disabled = false,
  xs = 12,
  sm = 12,
  md = 12,
  lg = 12
}) => {
  let requiredField = required ? <span className='text-danger'> *</span> : ''

  return (
    <Form.Group as={Col} xs={xs} sm={sm} md={md} lg={lg}>
      <Form.Label>
        {label}
        {requiredField}
      </Form.Label>
      <Datetime
        className='rdtPicker-sealog'
        {...input}
        utc={true}
        value={input.value ? moment.utc(input.value).format(dateFormat) : null}
        dateFormat={dateFormat}
        timeFormat={false}
        selected={input.value ? moment.utc(input.value, dateFormat) : null}
        inputProps={{ disabled }}
        renderInput={(props) => {
          return <input {...props} value={input.value ? props.value : ''} />
        }}
      />
      {error ? (
        <div className={'w-100 mt-1 text-danger'} style={{ fontSize: '.7rem' }}>
          {error}
        </div>
      ) : (
        ''
      )}
    </Form.Group>
  )
}

export const renderDateTimePicker = ({
  input,
  label,
  required,
  meta: { error },
  dateFormat = 'YYYY-MM-DD',
  timeFormat = 'HH:mm:ss',
  disabled = false,
  xs = 12,
  sm = 12,
  md = 12,
  lg = 12
}) => {
  let requiredField = required ? <span className='text-danger'> *</span> : ''

  return (
    <Form.Group as={Col} xs={xs} sm={sm} md={md} lg={lg}>
      <Form.Label>
        {label}
        {requiredField}
      </Form.Label>
      <Datetime
        className='rdtPicker-sealog'
        {...input}
        utc={true}
        value={input.value ? moment.utc(input.value).format(dateFormat + ' ' + timeFormat) : null}
        dateFormat={dateFormat}
        timeFormat={timeFormat}
        selected={input.value ? moment.utc(input.value) : null}
        inputProps={{ disabled }}
        renderInput={(props) => {
          return <input {...props} value={input.value ? props.value : ''} />
        }}
      />
      {error ? (
        <div className={'w-100 mt-1 text-danger'} style={{ fontSize: '.7rem' }}>
          {error}
        </div>
      ) : (
        ''
      )}
    </Form.Group>
  )
}

export const renderCheckboxGroup = ({
  label,
  options,
  input,
  required,
  meta: { dirty, error },
  disabled = false,
  inline = false,
  indication = false
}) => {
  const requiredField = required ? <span className='text-danger'> *</span> : ''
  const checkboxList = options.map((option, index) => {
    const tooltip = option.description ? <Tooltip id={`${option.value}_Tooltip`}>{option.description}</Tooltip> : null

    const checkbox = (
      <Form.Check
        label={
          indication && input.value.includes(option.value) ? (
            <span className='text-warning'>{option.value}</span>
          ) : (
            option.label || option.value
          )
        }
        name={`${option.label}[${index}]`}
        key={`${label}.${index}`}
        id={`${label}.${index}`}
        value={option.value}
        checked={input.value.indexOf(option.value) !== -1}
        disabled={disabled}
        inline={inline}
        onChange={(event) => {
          const newValue = [...input.value]
          if (event.target.checked) {
            newValue.push(option.value)
          } else {
            newValue.splice(newValue.indexOf(option.value), 1)
          }
          return input.onChange(newValue)
        }}
      />
    )

    return tooltip ? (
      <span key={`${label}.${index}`}>
        <OverlayTrigger placement='right' overlay={tooltip}>
          {checkbox}
        </OverlayTrigger>
      </span>
    ) : (
      <span key={`${label}.${index}`}>{checkbox}</span>
    )
  })

  return (
    <Form.Group as={Col}>
      <Form.Label>
        <span>
          {label}
          {requiredField}
        </span>{' '}
        {dirty && error && (
          <span className='text-danger' style={{ fontSize: '.7rem' }}>
            {error}
            <br />
          </span>
        )}
      </Form.Label>
      <br />
      {checkboxList}
    </Form.Group>
  )
}

export const renderCheckbox = ({ input, label, meta: { dirty, error }, disabled = false, xs = 12, sm = 12, md = 12, lg = 12 }) => {
  return (
    <Form.Group as={Col} xs={xs} sm={sm} md={md} lg={lg}>
      <Form.Check
        {...input}
        label={label}
        id={`${label}`}
        checked={input.value ? true : false}
        onChange={(e) => input.onChange(e.target.checked)}
        isInvalid={dirty && error}
        disabled={disabled}
        inline
      ></Form.Check>
      <Form.Control.Feedback type='invalid'>{error}</Form.Control.Feedback>
    </Form.Group>
  )
}

export const renderRadioGroup = ({
  label,
  options,
  input,
  required,
  meta: { dirty, error },
  disabled = false,
  inline = false,
  indication = false
}) => {
  const requiredField = required ? <span className='text-danger'> *</span> : ''
  const radioList = options.map((option, index) => {
    const tooltip = option.description ? <Tooltip id={`${option.value}_Tooltip`}>{option.description}</Tooltip> : null
    const radio = (
      <Form.Check
        label={indication && input.value === option.value ? <span className='text-warning'>{option.value}</span> : option.value}
        name={`${label}`}
        key={`${label}.${index}`}
        id={`${label}.${index}`}
        value={option.value}
        checked={input.value === option.value}
        disabled={disabled}
        type='radio'
        inline={inline}
        onChange={() => {
          return input.onChange(option.value)
        }}
      />
    )

    return tooltip ? (
      <span key={`${label}.${index}`}>
        <OverlayTrigger placement='right' overlay={tooltip}>
          {radio}
        </OverlayTrigger>
      </span>
    ) : (
      <span key={`${label}.${index}`}>{radio}</span>
    )
  })

  return (
    <Form.Group as={Col}>
      <Form.Label>
        <span>
          {label}
          {requiredField}
        </span>{' '}
        {dirty && error && (
          <span className='text-danger' style={{ fontSize: '.7rem' }}>
            {error}
            <br />
          </span>
        )}
      </Form.Label>
      <br />
      {radioList}
    </Form.Group>
  )
}

export const renderSwitch = ({ input, label, meta: { dirty, error }, disabled = false }) => {
  return (
    <Form.Group className='ml-2'>
      <Form.Switch
        {...input}
        id={input.name}
        checked={input.value ? true : false}
        onChange={(e) => input.onChange(e.target.checked)}
        isInvalid={dirty && error}
        label={label}
        disabled={disabled}
      ></Form.Switch>
      <Form.Control.Feedback type='invalid'>{error}</Form.Control.Feedback>
    </Form.Group>
  )
}

export const renderHidden = ({ input }) => {
  return <input type='hidden' {...input} id={input.name} />
}

export const renderAlert = (message) => {
  if (message) {
    return (
      <Alert variant='danger'>
        <strong>Oops!</strong> {message}
      </Alert>
    )
  }
}

export const renderMessage = (message) => {
  if (message) {
    return (
      <Alert variant='success'>
        <strong>Success!</strong> {message}
      </Alert>
    )
  }
}
