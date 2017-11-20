import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { utils } from 'web3';
import LPPCampaign from 'lpp-campaign';
import _ from 'underscore';
import { Link } from 'react-router-dom';

import { feathersClient } from '../../lib/feathersClient';
import { isAuthenticated, redirectAfterWalletUnlock, takeActionAfterWalletUnlock, checkWalletBalance } from '../../lib/middleware';
import Loader from '../Loader';
import currentUserModel from '../../models/currentUserModel';
import { displayTransactionError, getTruncatedText } from '../../lib/helpers';
import getNetwork from '../../lib/blockchain/getNetwork';
import getWeb3 from '../../lib/blockchain/getWeb3';

/**
  The my campaings view
* */

class MyCampaigns extends Component {
  constructor() {
    super();

    this.state = {
      isLoading: true,
      campaigns: [],
    };
  }

  componentDidMount() {
    isAuthenticated(this.props.currentUser, this.props.history, this.props.wallet).then(() =>
      feathersClient.service('campaigns').find({
        query: {
          $or: [
            { ownerAddress: this.props.currentUser.address },
            { reviewerAddress: this.props.currentUser.address },
          ],
        },
      })
        .then(resp =>
          this.setState({
            campaigns: _.sortBy(resp.data, (c) => {
              if (c.status === 'pending') return 1;
              if (c.status === 'Active') return 2;
              if (c.status === 'Canceled') return 3;
              return 4;
            }),
            hasError: false,
            isLoading: false,
          }))
        .catch(() =>
          this.setState({
            isLoading: false,
            hasError: true,
          })));
  }


  // removeCampaign(id){
  //   React.swal({
  //     title: "Delete Campaign?",
  //     text: "You will not be able to recover this Campaign!",
  //     icon: "warning",
  //     showCancelButton: true,
  //     confirmButtonColor: "#DD6B55",
  //     confirmButtonText: "Yes, delete it!",
  //     closeOnConfirm: true,
  //   }, () => {
  //     const campaigns = feathersClient.service('/campaigns');
  //     campaigns.remove(id).then(campaign => {
  //       React.toast.success("Your Campaign has been deleted.")
  //     })
  //   });
  // }

  editCampaign(id) {
    takeActionAfterWalletUnlock(this.props.wallet, () => {
      checkWalletBalance(this.props.wallet, this.props.history).then(() => {
        React.swal({
          title: 'Edit Campaign?',
          text: 'Are you sure you want to edit this Campaign?',
          icon: 'warning',
          dangerMode: true,
          buttons: ['Cancel', 'Yes, edit'],
        }).then((isConfirmed) => {
          if (isConfirmed) redirectAfterWalletUnlock(`/campaigns/${id}/edit`, this.props.wallet, this.props.history);
        });
      });
    });
  }

  cancelCampaign(campaign) {
    takeActionAfterWalletUnlock(this.props.wallet, () => {
      checkWalletBalance(this.props.wallet, this.props.history).then(() => {
        React.swal({
          title: 'Cancel Campaign?',
          text: 'Are you sure you want to cancel this Campaign?',
          icon: 'warning',
          dangerMode: true,
          buttons: ['Dismiss', 'Yes, cancel'],
        }).then((isConfirmed) => {
          if (isConfirmed) {
            const cancel = (etherScanUrl, txHash) => {
              feathersClient.service('/campaigns').patch(campaign._id, {
                status: 'Canceled',
                mined: false,
                txHash,
              }).then(() => {
                React.toast.info(<p>Campaign cancelation pending...<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>);
              }).catch((e) => {
                console.log('Error updating feathers cache ->', e);
              });
            };

            let txHash;
            let etherScanUrl;
            Promise.all([getNetwork(), getWeb3()])
              .then(([network, web3]) => {
                const lppCampaign = new LPPCampaign(web3, campaign.pluginAddress);
                etherScanUrl = network.etherscan;

                return lppCampaign.cancelCampaign({ from: this.props.currentUser.address })
                  .once('transactionHash', (hash) => {
                    txHash = hash;
                    cancel(etherScanUrl, txHash);
                  });
              })
              .then(() => {
                React.toast.success(<p>The campaign has been cancelled!<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>);
              }).catch((e) => {
                console.error(e);

                displayTransactionError(txHash, etherScanUrl);
              });
          }
        });
      });
    });
  }

  hasPendingTx(campaign) {
    return campaign.status === 'pending' || (Object.keys(campaign).includes('mined') && !campaign.mined);
  }


  render() {
    const { campaigns, isLoading } = this.state;
    const { currentUser } = this.props;

    return (
      <div id="campaigns-view">
        <div className="container-fluid page-layout dashboard-table-view">
          <div className="row">
            <div className="col-md-10 m-auto">

              { (isLoading || (campaigns && campaigns.length > 0)) &&
                <h1>Your campaigns</h1>
              }

              { isLoading &&
                <Loader className="fixed" />
              }

              { !isLoading &&
                <div className="table-container">
                  { campaigns && campaigns.length > 0 &&

                    <table className="table table-responsive table-striped table-hover">
                      <thead>
                        <tr>
                          <th className="td-name">Name</th>
                          <th className="td-donations-number">Donations</th>
                          <th className="td-donations-amount">Amount</th>
                          <th className="td-status">Status</th>
                          <th className="td-actions" />
                        </tr>
                      </thead>
                      <tbody>
                        { campaigns.map((c, index) =>
                          (<tr key={index} className={c.status === 'pending' ? 'pending' : ''}>
                            <td className="td-name">
                              <Link to={`/campaigns/${c._id}`}>{getTruncatedText(c.title, 45)}</Link>
                              { c.reviewerAddress === currentUser.address &&
                                <span className="badge badge-info">
                                  <i className="fa fa-eye" />
                                  &nbsp;I'm reviewer
                                </span>
                              }

                            </td>
                            <td className="td-donations-number">{c.donationCount || 0}</td>
                            <td className="td-donations-amount">Ξ{(c.totalDonated) ? utils.fromWei(c.totalDonated) : 0}</td>
                            <td className="td-status">
                              {this.hasPendingTx(c) &&
                                <span><i className="fa fa-circle-o-notch fa-spin" />&nbsp;</span> }
                              {c.status}
                            </td>
                            <td className="td-actions">
                              { c.ownerAddress === currentUser.address && c.status === 'Active' &&
                                <a className="btn btn-link" onClick={() => this.editCampaign(c._id)}>
                                  <i className="fa fa-edit" />&nbsp;Edit
                                </a>
                              }

                              { (c.reviewerAddress === currentUser.address || c.ownerAddress === currentUser.address) && c.status === 'Active' &&
                                <a className="btn btn-danger btn-sm" onClick={() => this.cancelCampaign(c)}>
                                  <i className="fa fa-ban" />&nbsp;Cancel
                                </a>
                              }
                            </td>
                           </tr>))}
                      </tbody>
                    </table>
                  }

                  { campaigns && campaigns.length === 0 &&
                    <div>
                      <center>
                        <h3>You didn't create any campaigns yet!</h3>
                        <img className="empty-state-img" src={`${process.env.PUBLIC_URL}/img/campaign.svg`} width="200px" height="200px" alt="no-campaigns-icon" />
                      </center>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default MyCampaigns;

MyCampaigns.propTypes = {
  currentUser: currentUserModel,
  history: PropTypes.object.isRequired,
};
