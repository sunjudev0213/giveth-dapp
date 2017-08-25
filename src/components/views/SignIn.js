import React, { Component } from 'react'
import { Form, Input } from 'formsy-react-components'
import localforage from "localforage";

import NewWallet from "../NewWallet";
import LoadWallet from "../LoadWallet";
import GivethWallet from "../../lib/GivethWallet";
import { socket } from "../../lib/feathersClient";
import Loader from "../Loader";

/**
 SignIn Page
 **/

class SignIn extends Component {
  constructor() {
    super();

    this.state = {
      isLoading: true,
      error: undefined,
      formIsValid: false,
      newWallet: false,
      keystore: undefined,
    };

    this.submit = this.submit.bind(this);
    this.removeKeystore = this.removeKeystore.bind(this);
    this.newWallet = this.newWallet.bind(this);
    this.walletLoaded = this.walletLoaded.bind(this);
  }

  componentDidMount() {
    localforage.getItem('keystore')
      .then((keystore) => {
        this.setState({
          isLoading: false,
        });

        if (keystore && keystore.length > 0) {
          this.setState({
            keystore,
            address: GivethWallet.fixAddress(keystore[ 0 ].address),
          });
        }

      }).catch(() => {
        this.setState({
          isLoading: false,
        });
    });
  }

  componentWillUpdate() {
    if (!this.state.newWallet && this.state.keystore) {
      setTimeout(() => {
        if (this.refs.password) {
          this.refs.password.element.focus()
        }
      }, 500);
    }
  }

  submit({ password }) {
    GivethWallet.loadWallet(this.state.keystore, this.props.provider, password)
      .then(wallet => this.walletLoaded(wallet))
      .catch((error) => {
        console.error(error);

        this.setState({
          error: "Error unlocking wallet. Possibly an invalid password.",
        });
      });
  }

  walletLoaded(wallet) {
    socket.emit('authenticate', { signature: wallet.signMessage().signature }, () => {
      console.log('authenticated')
      this.props.handleWalletChange(wallet);
      this.props.history.goBack();
    });
  }

  removeKeystore() {
    this.setState({
      address: undefined,
      keystore: undefined,
    });
    this.props.handleWalletChange(undefined);
  }

  newWallet() {
    this.setState({
      newWallet: true,
    })
  }

  toggleFormValid(state) {
    this.setState({ formIsValid: state })
  }

  render() {
    const { newWallet, keystore, address, error, isLoading, formIsValid } = this.state;

    if (isLoading) {
      return <Loader className="fixed"/>
    }

    return (
      <div id="signin-view" className="container-fluid page-layout">
        <div className="row">
          <div className="col-md-8 m-auto">
            <div>
              {newWallet &&
              <NewWallet walletCreated={this.props.handleWalletChange} provider={this.props.provider}
                         onBackup={() => this.props.history.push('/profile')}/>
              }

              {!newWallet && keystore &&
              <div>
                <h1>Welcome {address}!</h1>
                {error &&
                <div className="alert alert-danger">{error}</div>
                }
                <Form onSubmit={this.submit} onValid={()=>this.toggleFormValid(true)} onInvalid={()=>this.toggleFormValid(false)} layout='vertical'>
                  <div className="form-group">
                    <Input
                      name="password"
                      id="password-input"
                      label="Wallet Password"
                      type="password"
                      ref="password"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <button className="btn btn-link pl-sm-0" onClick={this.removeKeystore}>Not {address}?</button>
                  </div>

                  <button className="btn btn-success" formNoValidate={true} type="submit"
                          disabled={!formIsValid}>Unlock Wallet
                  </button>
                </Form>
              </div>
              }

              {!newWallet && !keystore &&
              <div>
                <h1>Sign In!</h1>
                <LoadWallet walletLoaded={this.walletLoaded} provider={this.props.provider}/>
                <button className="btn btn-link pl-sm-0" onClick={this.newWallet}>New User?</button>
              </div>
              }
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default SignIn;