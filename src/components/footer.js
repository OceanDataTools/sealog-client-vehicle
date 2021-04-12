import React, {Component} from 'react';
import { connect } from 'react-redux';
import { Client } from '@hapi/nes/lib/client';
import { Link } from 'react-router-dom';
import prettyBytes from 'pretty-bytes';
import { WS_ROOT_URL, DISABLE_EVENT_LOGGING } from '../client_config';

import * as mapDispatchToProps from '../actions';

class Footer extends Component {

  constructor (props) {
    super(props);

    this.state = {
      // intervalID: null
    };

    this.handleASNAPNotification = this.handleASNAPNotification.bind(this);
    this.client = new Client(`${WS_ROOT_URL}`);
    this.connectToWS = this.connectToWS.bind(this);

  }

  componentDidMount() {
    this.handleASNAPNotification();

    if ( !DISABLE_EVENT_LOGGING && this.props.authenticated ) {
      this.connectToWS();
    }
  }

  componentWillUnmount() {
    if ( !DISABLE_EVENT_LOGGING && this.props.authenticated ) {
      this.client.disconnect();
    }
  }

  async connectToWS() {

    try {
      await this.client.connect();
      // {
      //   auth: {
      //     headers: {
      //       authorization: cookies.get('token')
      //     }
      //   }
      // })

      const updateHandler = () => {
        this.handleASNAPNotification();
      };

      this.client.subscribe('/ws/status/updateCustomVars', updateHandler);

    } catch(error) {
      console.log(error);
      throw(error);
    }
  }


  handleASNAPNotification() {
    if(this.props.authenticated) {
      this.props.fetchCustomVars();
    }
  }

  render () {

    let freeSpaceStatus = null;
    let asnapStatus = null;

    if ( DISABLE_EVENT_LOGGING ) {
      freeSpaceStatus = null;
    }
    else if(this.props.authenticated && this.props.freeSpaceInBytes) {
      if(parseInt(this.props.freeSpaceInBytes) < 10737418240) {
        freeSpaceStatus =  (
          <span className="ml-2">
            Free Space: <span  className="text-danger">{prettyBytes(parseInt(this.props.freeSpaceInBytes))}</span>
          </span>
        );        
      }
      else if(parseInt(this.props.freeSpaceInBytes) < 21474836480) {
        freeSpaceStatus =  (
          <span className="ml-2">
            Free Space: <span  className="text-warning">{prettyBytes(parseInt(this.props.freeSpaceInBytes))}</span>
          </span>
        );        
      }
      else {
        freeSpaceStatus =  (
          <span className="ml-2">
            Free Space: <span  className="text-success">{prettyBytes(parseInt(this.props.freeSpaceInBytes))}</span>
          </span>
        );        
      }
    }

    if ( DISABLE_EVENT_LOGGING ) {
      asnapStatus = null;
    }
    else if(this.props.authenticated && this.props.asnapStatus === "Off") {
      asnapStatus =  (
        <span>
          ASNAP: <span className="text-danger">Off</span>
        </span>
      );
    } else if(this.props.authenticated && this.props.asnapStatus === "On") {
      asnapStatus =  (
        <span>
          ASNAP: <span className="text-success">On</span>
        </span>
      );
    } else if(this.props.authenticated) {
      asnapStatus =  (
        <span>
          ASNAP: <span className="text-warning">Unknown</span>
        </span>
      );
    }

    return (
      <div className="mt-2 justify-content-center">
        {asnapStatus}
        {freeSpaceStatus}
        <span className="float-right">
          <Link to="/github" target="_blank">Sealog</Link> is licensed under the <Link to="/license" target="_blank">MIT</Link> public license
        </span>
      </div>
    );
  }
}

function mapStateToProps(state){

  let asnapStatus = (state.custom_var)? state.custom_var.custom_vars.find(custom_var => custom_var.custom_var_name === "asnapStatus") : null;
  let freeSpaceInBytes = (state.custom_var)? state.custom_var.custom_vars.find(custom_var => custom_var.custom_var_name === "freeSpaceInBytes") : null;

  return {
    asnapStatus: (asnapStatus)? asnapStatus.custom_var_value : null,
    freeSpaceInBytes: (freeSpaceInBytes)? freeSpaceInBytes.custom_var_value : null,
    authenticated: state.auth.authenticated,

  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Footer);
