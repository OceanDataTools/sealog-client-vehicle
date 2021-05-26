import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Path from 'path';
import { Modal, Image } from 'react-bootstrap';
import { connectModal } from 'redux-modal';
import { handleMissingImage } from '../utils';

class ImagePreviewModal extends Component {

  constructor (props) {
    super(props);

    this.handleClose = this.handleClose.bind(this);
  }

  static propTypes = {
    name: PropTypes.string,
    filepath: PropTypes.string,
    handleHide: PropTypes.func.isRequired,
  };

  handleClose() {
    this.props.handleHide();
  }

  render() {

    const { show, handleHide, name } = this.props

    if (name) {
      return (
        <Modal size="lg" show={show} onHide={handleHide}>
          <Modal.Header closeButton>
            <Modal.Title as="h5">Image Preview - {Path.basename(this.props.filepath)}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div className="text-center">
              <Image fluid src={this.props.filepath} onError={handleMissingImage} />
            </div>
          </Modal.Body>
        </Modal>
      );
    }
    else {
      return null;
    }
  }
}

export default connectModal({ name: 'imagePreview' })(ImagePreviewModal)
