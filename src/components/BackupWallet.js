import React, {Component} from 'react';

/**

 backup a GivethWallet

 **/

class BackupWallet extends Component {
  render() {
    return (
      <a className="btn btn-success"
         href={"data:text/json;charset=utf-8," + encodeURIComponent(this.props.wallet.keystore.serialize())}
         download={'givethKeystore-' + Date.now() + '.json'}>
        Download Backup File
      </a>
    );
  }
}

export default BackupWallet;
