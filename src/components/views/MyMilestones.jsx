import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { utils } from 'web3';
import LPPMilestone from 'lpp-milestone';
import { Link } from 'react-router-dom';

import { feathersClient } from '../../lib/feathersClient';
import { isAuthenticated, redirectAfterWalletUnlock, takeActionAfterWalletUnlock, checkWalletBalance } from '../../lib/middleware';
import getNetwork from '../../lib/blockchain/getNetwork';
import getWeb3 from '../../lib/blockchain/getWeb3';
import Loader from '../Loader';
import User from '../../models/User';
import { displayTransactionError, getTruncatedText } from '../../lib/helpers';
import GivethWallet from '../../lib/blockchain/GivethWallet';

// TODO Remove the eslint exception and fix feathers to provide id's without underscore
/* eslint no-underscore-dangle: 0 */
/**
 * The my campaings view
 */
class MyMilestones extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      milestones: [],
    };

    this.editMilestone = this.editMilestone.bind(this);
    this.markComplete = this.markComplete.bind(this);
    this.cancelMilestone = this.cancelMilestone.bind(this);
    this.approveMilestone = this.approveMilestone.bind(this);
    this.rejectMilestone = this.rejectMilestone.bind(this);
    this.requestWithdrawal = this.requestWithdrawal.bind(this);
    this.collect = this.collect.bind(this);
  }

  componentDidMount() {
    const myAddress = this.props.currentUser.address;

    isAuthenticated(this.props.currentUser, this.props.history, this.props.wallet).then(() => {
      this.milestonesObserver = feathersClient.service('milestones').watch({ strategy: 'always' }).find({
        query: {
          $or: [
            { ownerAddress: myAddress },
            { reviewerAddress: myAddress },
            { recipientAddress: myAddress },
            { $and: [
              { campaignOwnerAddress: myAddress },
              { status: 'proposed' }
            ]}
          ],
        },
      }).subscribe(
        resp => this.setState({ milestones: resp.data, isLoading: false }),
        () => this.setState({ isLoading: false }),
      );
    });
  }

  componentWillUnmount() {
    if (this.milestonesObserver) this.milestonesObserver.unsubscribe();
  }

  editMilestone(id) {
    takeActionAfterWalletUnlock(this.props.wallet, () => {
      checkWalletBalance(this.props.wallet, this.props.history).then(() =>
        React.swal({
          title: 'Edit Milestone?',
          text: 'Are you sure you want to edit this Milestone?',
          icon: 'warning',
          dangerMode: true,
          buttons: ['Cancel', 'Yes, edit'],
        }).then((isConfirmed) => {
          if (isConfirmed) redirectAfterWalletUnlock(`/milestones/${id}/edit`, this.props.wallet, this.props.history);
        }));
    });
  }

  markComplete(milestone) {
    takeActionAfterWalletUnlock(this.props.wallet, () => {
      checkWalletBalance(this.props.wallet, this.props.history).then(() =>
        React.swal({
          title: 'Mark as complete?',
          text: 'Are you sure you want to mark this Milestone as complete?',
          icon: 'warning',
          dangerMode: true,
          buttons: ['Cancel', 'Yes, mark complete'],
        }).then((isConfirmed) => {
          if (isConfirmed) {
            feathersClient.service('/milestones').patch(milestone._id, {
              status: 'NeedsReview',
            }).then(() => {
              React.toast.info(<p>Your milestone has been marked as complete...</p>);
            }).catch((e) => {
              console.error('Error marking milestone complete ->', e); // eslint-disable-line no-console
              React.swal({
                title: 'Oh no!',
                content: '<p>Something went wrong with the transaction. Is your wallet unlocked?</p>',
                icon: 'error',
              });
            });
          }
        }));
    });
  }

  cancelMilestone(milestone) {
    takeActionAfterWalletUnlock(this.props.wallet, () => {
      checkWalletBalance(this.props.wallet, this.props.history).then(() =>
        React.swal({
          title: 'Cancel Milestone?',
          text: 'Are you sure you want to cancel this Milestone?',
          icon: 'warning',
          buttons: ['I changed my mind', 'Yes, cancel'],
          dangerMode: true,
        }).then((isConfirmed) => {
          if (isConfirmed) {
            const cancel = (etherScanUrl, txHash) => {
              feathersClient.service('/milestones').patch(milestone._id, {
                status: 'Canceled',
                mined: false,
                txHash,
              }).then(() => {
                React.toast.info(<p>Cancelling this milestone is pending...<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>);
              }).catch((e) => {
                console.error('Error updating feathers cache ->', e); // eslint-disable-line no-console
              });
            };

            let txHash;
            let etherScanUrl;
            Promise.all([getNetwork(), getWeb3()])
              .then(([network, web3]) => {
                const lppMilestone = new LPPMilestone(web3, milestone.pluginAddress);
                etherScanUrl = network.etherscan;

                return lppMilestone.cancelMilestone({ from: this.props.currentUser.address })
                  .once('transactionHash', (hash) => {
                    txHash = hash;
                    cancel(etherScanUrl, txHash);
                  });
              })
              .then(() => {
                React.toast.success(<p>The milestone has been cancelled!<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>);
              }).catch((e) => {
                console.error(e); // eslint-disable-line no-console

                displayTransactionError(txHash, etherScanUrl);
              });
          }
        }));
    });
  }

  acceptProposedMilestone(milestone) {
    takeActionAfterWalletUnlock(this.props.wallet, () => {
      checkWalletBalance(this.props.wallet, this.props.history).then(() =>
        React.swal({
          title: 'Accept Milestone?',
          text: 'Are you sure you want to accept this Milestone?',
          icon: 'warning',
          dangerMode: true,
          buttons: ['Cancel', 'Yes, accept'],
        }).then((isConfirmed) => {
          if (isConfirmed) {
            console.log('creating milestone for real')

            const createMilestone = (etherScanUrl, txHash) => {
              feathersClient.service('/milestones').patch(milestone._id, {
                status: 'pending',
                mined: false,
                txHash,
              }).then(() => {
                React.toast.info(<p>Accepting this milestone is pending...<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>);
              }).catch((e) => {
                console.log('Error updating feathers cache ->', e); // eslint-disable-line no-console
                React.toast.error('Oh no! Something went wrong with the transaction. Please try again.');                
              });
            };

            let txHash;
            let etherScanUrl;
            Promise.all([getNetwork(), getWeb3()])
              .then(([network, web3]) => {
                console.log('creating milestone tx')

                const { liquidPledging } = network;
                etherScanUrl = network.txHash;

                // web3, lp address, name, parentProject, recipient, maxAmount, reviewer
                LPPMilestone.new(web3, liquidPledging.$address, milestone.title, '', milestone.campaign.projectId, milestone.recipientAddress, milestone.maxAmount, milestone.reviewerAddress)
                  .on('transactionHash', (hash) => {
                    txHash = hash;
                    console.log('creating milestone in feathers')

                    createMilestone(etherScanUrl, txHash);
                  })
              })
              .catch(() => {
                displayTransactionError(txHash, etherScanUrl);
              });
          }
        }));
    });    
  }

 rejectProposedMilestone(milestone) {
    React.swal({
      title: 'Reject Milestone?',
      text: 'Are you sure you want to reject this Milestone?',
      icon: 'warning',
      dangerMode: true,
      buttons: ['Cancel', 'Yes, reject'],
    }).then((isConfirmed) => {
      if (isConfirmed) {
        console.log('rejecting milestone')

        feathersClient.service('/milestones').patch(milestone._id, {
          status: 'rejected',
        }).then(() => {
          React.toast.info(<p>The milestone has been rejected.</p>);
        }).catch((e) => {
          console.log('Error updating feathers cache ->', e); // eslint-disable-line no-console
          React.toast.error('Oh no! Something went wrong. Please try again.');                
        });
      }
    });
  }


  approveMilestone(milestone) {
    takeActionAfterWalletUnlock(this.props.wallet, () => {
      checkWalletBalance(this.props.wallet, this.props.history).then(() =>
        React.swal({
          title: 'Approve Milestone?',
          text: 'Are you sure you want to approve this Milestone?',
          icon: 'warning',
          dangerMode: true,
          buttons: ['Cancel', 'Yes, approve'],
        }).then((isConfirmed) => {
          if (isConfirmed) {
            const approve = (etherScanUrl, txHash) => {
              feathersClient.service('/milestones').patch(milestone._id, {
                status: 'Completed',
                mined: false,
                txHash,
              }).then(() => {
                React.toast.info(<p>Approving this milestone is pending...<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>);
              }).catch((e) => {
                console.log('Error updating feathers cache ->', e); // eslint-disable-line no-console
              });
            };

            let txHash;
            let etherScanUrl;
            Promise.all([getNetwork(), getWeb3()])
              .then(([network, web3]) => {
                const lppMilestone = new LPPMilestone(web3, milestone.pluginAddress);
                etherScanUrl = network.etherscan;

                // Only uses 14,xxx gas, but will throw out of gas error if given anything less
                // then 30000
                return lppMilestone.acceptMilestone({ from: this.props.currentUser.address })
                  .once('transactionHash', (hash) => {
                    txHash = hash;
                    approve(etherScanUrl, txHash);
                  });
              })
              .then(() => {
                React.toast.success(<p>The milestone has been approved!<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>);
              }).catch((e) => {
                console.error(e); // eslint-disable-line no-console

                displayTransactionError(txHash, etherScanUrl);
              });
          }
        }));
    });
  }

  rejectMilestone(milestone) {
    takeActionAfterWalletUnlock(this.props.wallet, () => {
      checkWalletBalance(this.props.wallet, this.props.history).then(() =>
        React.swal({
          title: 'Reject Milestone?',
          text: 'Are you sure you want to reject this Milestone?',
          icon: 'warning',
          dangerMode: true,
          buttons: ['Cancel', 'Yes, reject'],
        }).then((isConfirmed) => {
          if (isConfirmed) {
            feathersClient.service('/milestones').patch(milestone._id, {
              status: 'InProgress',
            }).then(() => {
              React.toast.info(<p>You have rejected this milestone...</p>);
            }).catch((e) => {
              console.error('Error rejecting completed milestone ->', e); // eslint-disable-line no-console
              React.swal({
                title: 'Oh no!',
                content: '<p>Something went wrong with the transaction. Is your wallet unlocked?</p>',
                icon: 'error',
              });
            });
          }
        }));
    });
  }

  requestWithdrawal(milestone) {
    takeActionAfterWalletUnlock(this.props.wallet, () => {
      checkWalletBalance(this.props.wallet, this.props.history).then(() =>
        React.swal({
          title: 'Request Withdrawal',
          text: "For security reasons, there's a 3 day delay from the moment you request withdrawal before you can actually withdraw the money.",
          icon: 'warning',
          dangerMode: true,
          buttons: ['Cancel', 'Yes, request withdrawal'],
        }).then((isConfirmed) => {
          if (isConfirmed) {
            if (isConfirmed) {
              const withdraw = (etherScanUrl, txHash) => {
                feathersClient.service('/milestones').patch(milestone._id, {
                  status: 'Paying',
                  mined: false,
                  txHash,
                }).then(() => {
                  React.toast.info(<p>Request withdrawal from milestone...<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>);
                }).catch((e) => {
                  console.log('Error updating feathers cache ->', e); // eslint-disable-line no-console
                });

                feathersClient.service('donations').patch(null, {
                  status: 'pending',
                  paymentStatus: 'Paying',
                  txHash,
                }, {
                  query: {
                    ownerType: 'milestone',
                    ownerId: milestone._id,
                  },
                }).catch((e) => {
                  console.log('Error updating feathers cache ->', e); // eslint-disable-line no-console
                });
              };

              const getPledges = () => feathersClient.service('donations').find({
                query: {
                  ownerType: 'milestone',
                  ownerId: milestone._id,
                },
              })
                .then(({ data }) => {
                  if (data.length === 0) throw new Error('No donations found to withdraw');

                  const pledges = [];
                  data.forEach((donation) => {
                    const pledge = pledges.find(n => n.id === donation.pledgeId);

                    if (pledge) {
                      pledge.amount = pledge.amount.add(utils.toBN(donation.amount));
                    } else {
                      pledges.push({
                        id: donation.pledgeId,
                        amount: utils.toBN(donation.amount),
                      });
                    }
                  });

                  return pledges.map(note => `0x${utils.padLeft(utils.toHex(note.amount).substring(2), 48)}${utils.padLeft(utils.toHex(note.id).substring(2), 16)}`);
                });

              let txHash;
              let etherScanUrl;
              Promise.all([getNetwork(), getWeb3(), getPledges()])
                .then(([network, web3, pledges]) => {
                  const lppMilestone = new LPPMilestone(web3, milestone.pluginAddress);
                  etherScanUrl = network.etherscan;

                  return lppMilestone.mWithdraw(pledges, { from: this.props.currentUser.address })
                    .once('transactionHash', (hash) => {
                      txHash = hash;
                      withdraw(etherScanUrl, txHash);
                    });
                })
                .then(() => {
                  React.toast.info(<p>The milestone withdraw has been initiated...<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>);
                }).catch((e) => {
                  console.error(e); // eslint-disable-line no-console

                  let msg;
                  if (txHash) {
                  // TODO need to update feathers to reset the donations to previous state as this
                  // tx failed.
                    msg = <p>Something went wrong with the transaction.<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>;
                  } else if (e.message === 'No donations found to withdraw') {
                    msg = <p>Nothing to withdraw. There are no donations to this milestone.</p>;
                  } else {
                    msg = (<p>Something went wrong with the transaction. Is your wallet unlocked?
                           </p>);
                  }

                  React.swal({
                    title: 'Oh no!',
                    content: React.swal.msg(msg),
                    icon: 'error',
                  });
                });
            }
          }
        }));
    });
  }

  collect(milestone) {
    takeActionAfterWalletUnlock(this.props.wallet, () => {
      checkWalletBalance(this.props.wallet, this.props.history).then(() =>
        React.swal({
          title: 'Collect Funds',
          text: 'The funds will be transferred to you wallet.',
          icon: 'warning',
          dangerMode: true,
          buttons: ['Cancel', 'Yes, collect'],
        }).then((isConfirmed) => {
          if (isConfirmed) {
            if (isConfirmed) {
              const collect = (etherScanUrl, txHash) => {
                feathersClient.service('/milestones').patch(milestone._id, {
                  status: 'Paid',
                  mined: false,
                  txHash,
                }).then(() => {
                  React.toast.info(<p>Collecting funds from milestone...<br /><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>);
                }).catch((e) => {
                  console.log('Error updating feathers cache ->', e); // eslint-disable-line no-console
                });
              };

              let txHash;
              let etherScanUrl;
              Promise.all([getNetwork(), getWeb3()])
                .then(([network, web3]) => {
                  const lppMilestone = new LPPMilestone(web3, milestone.pluginAddress);
                  etherScanUrl = network.etherscan;

                  return lppMilestone.collect({ from: this.props.currentUser.address })
                    .once('transactionHash', (hash) => {
                      txHash = hash;
                      collect(etherScanUrl, txHash);
                    });
                })
                .catch((e) => {
                  console.error(e); // eslint-disable-line no-console
                  displayTransactionError(txHash, etherScanUrl);
                });
            }
          }
        }));
    });
  }

  render() {
    const { milestones, isLoading } = this.state;
    const { currentUser } = this.props;

    return (
      <div id="milestones-view">
        <div className="container-fluid page-layout dashboard-table-view">
          <div className="row">
            <div className="col-md-10 m-auto">

              { (isLoading || (milestones && milestones.length > 0)) &&
                <h1>Your milestones</h1>
              }

              { isLoading &&
                <Loader className="fixed" />
              }

              { !isLoading &&
                <div className="table-container">
                  { milestones && milestones.length > 0 &&
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
                        { milestones.map(m => (
                          <tr key={m._id} className={m.status === 'pending' ? 'pending' : ''}>
                            <td className="td-name">
                              <Link to={`/campaigns/${m.campaign._id}`}>CAMPAIGN <em>{getTruncatedText(m.campaign.title, 40)}</em></Link>
                              <br />
                              <i className="fa fa-arrow-right" />
                              <Link to={`/campaigns/${m.campaign._id}/milestones/${m._id}`}>MILESTONE <em>{getTruncatedText(m.title, 35)}</em></Link>
                            </td>
                            <td className="td-donations-number">{m.donationCount || 0}</td>
                            <td
                              className="td-donations-amount"
                            >Ξ{(m.totalDonated) ? utils.fromWei(m.totalDonated) : 0}
                            </td>
                            <td className="td-status">
                              {(m.status === 'pending' || (Object.keys(m).includes('mined') && !m.mined)) &&
                                <span><i className="fa fa-circle-o-notch fa-spin" />&nbsp;</span> }
                              {m.status}
                            </td>
                            <td className="td-actions">
                              { m.ownerAddress === currentUser.address &&
                                <button
                                  className="btn btn-link"
                                  onClick={() => this.editMilestone(m._id)}
                                >
                                  <i className="fa fa-edit" />&nbsp;Edit
                                </button>
                              }

                              { (m.campaignOwnerAddress === currentUser.address) && m.status === 'proposed' &&
                                <span>
                                  <button
                                    className="btn btn-link"
                                    onClick={() => this.acceptProposedMilestone(m)}
                                  >
                                    <i className="fa fa-check-square-o" />&nbsp;Accept
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => this.rejectProposedMilestone(m)}
                                  >
                                    <i className="fa fa-times-circle-o" />&nbsp;Reject
                                  </button>    
                                </span>                            
                              }                              

                              { m.recipientAddress === currentUser.address && m.status === 'InProgress' && m.mined &&
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => this.markComplete(m)}
                                >
                                  <i className="fa fa-check-square-o" />&nbsp;Mark complete
                                </button>
                              }

                              { m.reviewerAddress === currentUser.address && ['InProgress', 'NeedReview'].includes(m.status) && m.mined &&
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => this.cancelMilestone(m)}
                                >
                                  <i className="fa fa-times" />&nbsp;Cancel
                                </button>
                              }

                              { m.reviewerAddress === currentUser.address && m.status === 'NeedsReview' && m.mined &&
                                <span>
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => this.approveMilestone(m)}
                                  >
                                    <i className="fa fa-thumbs-up" />&nbsp;Approve
                                  </button>

                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => this.rejectMilestone(m)}
                                  >
                                    <i className="fa fa-thumbs-down" />&nbsp;Reject
                                  </button>
                                </span>
                              }

                              { m.recipientAddress === currentUser.address && m.status === 'Completed' && m.mined && m.donationCount > 0 &&
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => this.requestWithdrawal(m)}
                                >
                                  <i className="fa fa-usd" />&nbsp;Request Withdrawal
                                </button>
                              }

                              { m.recipientAddress === currentUser.address && m.status === 'Paying' &&
                                <p>
                                  Withdraw authorization pending. You will be able to collect the
                                  funds when confirmed.
                                </p>
                              }

                              { m.recipientAddress === currentUser.address && m.status === 'CanWithdraw' && m.mined &&
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => this.collect(m)}
                                >
                                  <i className="fa fa-usd" />&nbsp;Collect
                                </button>
                              }
                            </td>
                          </tr>))}
                      </tbody>
                    </table>
                  }

                  { milestones && milestones.length === 0 &&
                    <div>
                      <center>
                        <h3>You didn&apos;t create any milestones yet!</h3>
                        <img className="empty-state-img" src={`${process.env.PUBLIC_URL}/img/delegation.svg`} width="200px" height="200px" alt="no-milestones-icon" />
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

MyMilestones.propTypes = {
  currentUser: PropTypes.instanceOf(User).isRequired,
  history: PropTypes.shape({}).isRequired,
  wallet: PropTypes.instanceOf(GivethWallet).isRequired,
};

export default MyMilestones;
