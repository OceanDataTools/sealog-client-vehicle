import React, { Component } from 'react'
import { Pagination } from 'react-bootstrap'
import PropTypes from 'prop-types'

class CustomPagination extends Component {
  constructor(props) {
    super(props)

    this.state = {
      maxPerPage: this.props.maxPerPage ? this.props.maxPerPage : 10
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.maxPerPage !== this.props.maxPerPage) {
      this.setState({ maxPerPage: this.props.maxPerPage })
    }
  }

  render() {
    const count = this.props.count ? this.props.count : 0

    if (count > this.state.maxPerPage) {
      let last = Math.ceil(count / this.state.maxPerPage)
      let delta = 2
      let left = this.props.page - delta
      let right = this.props.page + delta + 1
      let range = []
      let rangeWithDots = []
      let l = null

      for (let i = 1; i <= last; i++) {
        if (i === 1 || i === last || (i >= left && i < right)) {
          range.push(i)
        }
      }

      for (let i of range) {
        if (l) {
          if (i - l === 2) {
            rangeWithDots.push(
              <Pagination.Item key={l + 1} active={this.props.page === l + 1} onClick={() => this.props.pageSelectFunc(l + 1)}>
                {l + 1}
              </Pagination.Item>
            )
          } else if (i - l !== 1) {
            rangeWithDots.push(<Pagination.Ellipsis key={`ellipsis_${i}`} />)
          }
        }
        rangeWithDots.push(
          <Pagination.Item key={i} active={this.props.page === i} onClick={() => this.props.pageSelectFunc(i)}>
            {i}
          </Pagination.Item>
        )
        l = i
      }

      return (
        <Pagination className={this.props.className || 'pt-2'}>
          <Pagination.First className={'rounded-left '} onClick={() => this.props.pageSelectFunc(1)} />
          <Pagination.Prev
            onClick={() => {
              if (this.props.page > 1) {
                this.props.pageSelectFunc(this.props.page - 1)
              }
            }}
          />
          {rangeWithDots}
          <Pagination.Next
            onClick={() => {
              if (this.props.page < last) {
                this.props.pageSelectFunc(this.props.page + 1)
              }
            }}
          />
          <Pagination.Last className={'rounded-right '} onClick={() => this.props.pageSelectFunc(last)} />
        </Pagination>
      )
    }
    return null
  }
}

CustomPagination.propTypes = {
  maxPerPage: PropTypes.number,
  pageSelectFunc: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  className: PropTypes.string
}

export default CustomPagination
