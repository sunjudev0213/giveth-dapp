import React, { Component } from 'react'
import PropTypes from 'prop-types'

import BackupWallet from "../BackupWallet"
import { isAuthenticated } from "../../lib/middleware"
import currentUserModel from '../../models/currentUserModel'

/**
 Shows the user's wallet
 **/

class UserWallet extends Component {
  componentWillMount(){
    isAuthenticated(this.props.currentUser, this.props.history, this.props.wallet)
  }


  render() {
    return (
      <div id="profile-view" className="container-fluid page-layout">
        <center>
          <img className="empty-state-img" src={process.env.PUBLIC_URL + "/img/wallet.svg"} width="200px" height="200px" alt="wallet-icon"/>

          <h1>Your wallet</h1>

          {this.props.currentUser && 
            <div>
              <p>{this.props.currentUser.address}</p>
              <p> balance: &#926;{this.props.wallet.getBalance()}</p>
              <BackupWallet wallet={this.props.wallet}/>
            </div>
          }
        </center>
      </div>
    )
  }
}

export default UserWallet

UserWallet.propTypes = {
  wallet: PropTypes.shape({
    unlocked: PropTypes.bool,
    keystores: PropTypes.array
  }),  
  currentUser: currentUserModel,
  history: PropTypes.object.isRequired,
}