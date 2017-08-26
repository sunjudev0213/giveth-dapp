import React, { Component } from 'react'
import { Form, Input } from 'formsy-react-components'
import localforage from "localforage";

import NewWallet from "../NewWallet";
import LoadWallet from "../LoadWallet";
import GivethWallet from "../../lib/GivethWallet";
import { socket, feathersClient } from '../../lib/feathersClient'
import Loader from "../Loader";
import Avatar from 'react-avatar'

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
        if (keystore && keystore.length > 0) {
          this.setState({
            keystore,
            address: GivethWallet.fixAddress(keystore[ 0 ].address),
          }, 
          // try to find the user's profile based on the address
          () => this.fetchUserProfile());          
                  
        } else {
        this.setState({ isLoading: false });
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
  
  fetchUserProfile(address) {
    socket.emit('users::find', {address: this.state.address}, (error, resp) => {    
      console.log(error, resp)
      if(resp) {
        this.setState(Object.assign({}, resp.data[0], {
          isLoading: false,
        })) 
      } else {
        this.setState( { 
          isLoading: false,
        })  
      }
    })
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
      console.log('authenticated');
      this.props.handleWalletChange(wallet);

      const address = wallet.getAddresses()[ 0 ];

      // TODO this check should maybe be done in LoadWallet as that is when a keystore file is actually uploaded
      // However I'm putting this here for now as a users may have created a wallet in an earlier stage of the
      // mpv and thus it is stored in their localStorage, and the ui crashes if this user creates a milestone, etc
      feathersClient.service('/users').get(address)
        .then(() => this.props.history.goBack())
        .catch(err => {
          if (err.code === 404) {
            feathersClient.service('/users').create({ address })
              .then(user => {
                console.log('created user ', user);
                this.props.history.push('/profile');
              })
          } else {
            this.props.history.goBack();
          }
        })

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
    const { newWallet, keystore, avatar, name, address, error, isLoading, formIsValid } = this.state;

    if (isLoading) {
      return <Loader className="fixed"/>
    }

    return (
      <div id="signin-view" className="container-fluid page-layout">
        <div className="row">
          <div className="col-md-8 m-auto">
            <div>
              {newWallet &&
                <div className="card">
                  <NewWallet 
                    walletCreated={this.props.handleWalletChange} 
                    provider={this.props.provider}
                    onBackup={() => this.props.history.push('/profile')}/>
                </div>
              }

              {!newWallet && keystore &&
                <div className="card">
                  <center>
                    {avatar &&
                      <Avatar size={100} src={avatar} round={true}/>                  
                    }
                    <h1>Welcome <br/><strong>{name || address}!</strong></h1>
                    { name &&
                      <p className="small">Your address: {address}</p>
                    }

                    {error &&
                      <div className="alert alert-danger">{error}</div>
                    }
                    <Form className="sign-in-form" onSubmit={this.submit} onValid={()=>this.toggleFormValid(true)} onInvalid={()=>this.toggleFormValid(false)} layout='vertical'>
                      <div className="form-group">
                        <Input
                          name="password"
                          id="password-input"
                          label="Sign in by entering your wallet password"
                          type="password"
                          ref="password"
                          required
                        />
                      </div>

                      <button className="btn btn-success btn-lg" formNoValidate={true} type="submit"
                              disabled={!formIsValid}>Unlock your wallet
                      </button>

                      <div className="form-group">
                        <p className="small"><a onClick={this.removeKeystore}>Not {name} / {address}?</a></p>
                      </div>

                    </Form>
                  </center>
                </div>
              }

              {!newWallet && !keystore &&
                <div className="card">
                  <center>
                    <h1>Sign In!</h1>
                    <LoadWallet walletLoaded={this.walletLoaded} provider={this.props.provider}/>

                    <p className="small">
                      <a onClick={this.newWallet}>New User?</a>
                    </p>
                  </center>
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