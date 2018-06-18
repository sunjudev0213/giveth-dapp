import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';

import { SkyLightStateless } from 'react-skylight';

import UnlockWalletForm from './UnlockWalletForm';
import GivethWallet from '../lib/blockchain/GivethWallet';

/* global window */
/**
 * Modal with a form to unlock a GivethWallet
 */
class UnlockWallet extends Component {
  constructor(props) {
    super(props);

    this.state = {
      unlocking: false,
    };

    this.submit = this.submit.bind(this);
  }

  submit(password) {
    this.setState(
      {
        unlocking: true,
      },
      () => {
        const unlock = () => {
          this.props.wallet
            .unlock(password)
            .then(() => {
              this.setState(
                {
                  unlocking: false,
                },
                () => {
                  this.props.onClose();

                  // if requested, take action after successfully unlocking the wallet
                  if (this.props.actionAfter) this.props.actionAfter();
                },
              );
            })
            .catch(() => {
              this.setState({
                error: 'Error unlocking wallet. Possibly an invalid password.',
                unlocking: false,
              });
            });
        };

        // web3 blocks all rendering, so we need to request an animation frame
        window.requestAnimationFrame(unlock);
      },
    );
  }

  render() {
    const { onClose, onCloseClicked } = this.props;
    const { unlocking, error } = this.state;

    return (
      <SkyLightStateless
        isVisible
        hideOnOverlayClicked
        onCloseClicked={onCloseClicked}
        afterClose={onClose}
      >
        <center>
          <img
            className="empty-state-img reduce-margin"
            src={`${process.env.PUBLIC_URL}/img/unlock wallet.svg`}
            width="130px"
            height="130px"
            alt="unlock wallet icon"
          />
        </center>

        <h2>Unlock your wallet to continue</h2>
        <p className="small">
          Note: For security reasons, your wallet auto-locks whenever the Giveth dapp reloads.
        </p>

        <UnlockWalletForm
          submit={this.submit}
          label="password"
          error={error}
          unlocking={unlocking}
          buttonText="Unlock"
        />
      </SkyLightStateless>
    );
  }
}

UnlockWallet.propTypes = {
  wallet: PropTypes.instanceOf(GivethWallet).isRequired,
  onClose: PropTypes.func.isRequired,
  onCloseClicked: PropTypes.func.isRequired,
  actionAfter: PropTypes.func,
};

UnlockWallet.defaultProps = {
  actionAfter: undefined,
};

export default withRouter(UnlockWallet);
