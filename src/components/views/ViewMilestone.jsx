import React, { Fragment, useContext, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import { Form } from 'formsy-react-components';
import moment from 'moment';
import Avatar from 'react-avatar';
import { Link } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';

import Campaign from 'models/Campaign';
import Milestone from 'models/Milestone';
import LPMilestone from 'models/LPMilestone';

import BackgroundImageHeader from 'components/BackgroundImageHeader';
import DonateButton from 'components/DonateButton';
import Loader from 'components/Loader';
import MilestoneItem from 'components/MilestoneItem';
import DonationList from 'components/DonationList';
import MilestoneConversations from 'components/MilestoneConversations';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Col, Row } from 'antd';
import {
  convertEthHelper,
  getReadableStatus,
  getUserAvatar,
  getUserName,
  history,
} from '../../lib/helpers';
import MilestoneService from '../../services/MilestoneService';
import DACService from '../../services/DACService';
import { Context as WhiteListContext } from '../../contextProviders/WhiteListProvider';
import NotFound from './NotFound';
import DescriptionRender from '../DescriptionRender';
import ErrorBoundary from '../ErrorBoundary';
import EditMilestoneButton from '../EditMilestoneButton';
import GoBackSection from '../GoBackSection';
import ViewMilestoneAlerts from '../ViewMilestoneAlerts';
import CancelMilestoneButton from '../CancelMilestoneButton';
import DeleteProposedMilestoneButton from '../DeleteProposedMilestoneButton';
import CommunityButton from '../CommunityButton';
import { Context as ConversionRateContext } from '../../contextProviders/ConversionRateProvider';
import { Context as Web3Context } from '../../contextProviders/Web3Provider';
import { Context as UserContext } from '../../contextProviders/UserProvider';
import ErrorHandler from '../../lib/ErrorHandler';
import ProjectSubscription from '../ProjectSubscription';
import TotalGasPaid from './TotalGasPaid';

/**
 Loads and shows a single milestone

 @route params:
 milestoneId (string): id of a milestone
 * */

const helmetContext = {};

const ViewMilestone = props => {
  const {
    actions: { convertMultipleRates },
  } = useContext(ConversionRateContext);
  const {
    state: { balance },
  } = useContext(Web3Context);
  const {
    state: { currentUser },
  } = useContext(UserContext);
  const {
    state: { nativeCurrencyWhitelist, activeTokenWhitelist, minimumPayoutUsdValue },
  } = useContext(WhiteListContext);

  const [isLoading, setLoading] = useState(true);
  const [isLoadingDonations, setLoadingDonations] = useState(true);
  const [donations, setDonations] = useState([]);
  const [recipient, setRecipient] = useState({});
  const [campaign, setCampaign] = useState({});
  const [milestone, setMilestone] = useState({});
  const [dacTitle, setDacTitle] = useState('');
  const [newDonations, setNewDonations] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [isAmountEnoughForWithdraw, setIsAmountEnoughForWithdraw] = useState(true);
  const [currency, setCurrency] = useState(null);
  const [currentBalanceValue, setCurrentBalanceValue] = useState(0);
  const [currentBalanceUsdValue, setCurrentBalanceUsdValue] = useState(0);

  const editMilestoneButtonRef = useRef();
  const cancelMilestoneButtonRef = useRef();
  const deleteMilestoneButtonRef = useRef();
  const donationsObserver = useRef();

  const donationsPerBatch = 50;

  const getDacTitle = async dacId => {
    if (dacId === 0) return;
    DACService.getByDelegateId(dacId)
      .then(dac => setDacTitle(dac.title))
      .catch(() => {});
  };

  function loadMoreDonations(loadFromScratch = false, donationsBatch = donationsPerBatch) {
    setLoadingDonations(true);
    MilestoneService.getDonations(
      milestone.id,
      donationsBatch,
      loadFromScratch ? 0 : donations.length,
      (_donations, _donationsTotal) => {
        setDonations(loadFromScratch ? _donations : donations.concat(_donations));
        setLoadingDonations(false);
      },
      err => {
        setLoadingDonations(false);
        ErrorHandler(err, 'Some error on fetching milestone donations, please try later');
      },
    );
  }

  useEffect(() => {
    const { milestoneId, milestoneSlug } = props.match.params;

    const subscription = MilestoneService.subscribeOne(
      milestoneId,
      _milestone => {
        if (milestoneId) {
          history.push(`/milestone/${_milestone.slug}`);
        }
        setMilestone(_milestone);
        setRecipient(
          _milestone.pendingRecipientAddress ? _milestone.pendingRecipient : _milestone.recipient,
        );
        // Stop unnecessary updates on subscribe
        if (!campaign.id) {
          setCampaign(new Campaign(_milestone.campaign));
          getDacTitle(_milestone.dacId);
          setLoading(false);
        }
      },
      () => {
        setNotFound(true);
      },
      milestoneSlug,
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (milestone.id) {
      loadMoreDonations(true);

      // subscribe to donation count
      donationsObserver.current = MilestoneService.subscribeNewDonations(
        milestone.id,
        _newDonations => {
          setNewDonations(_newDonations);
          if (_newDonations > 0) {
            loadMoreDonations(true);
          }
        },
        () => setNewDonations(0),
      );
    }

    return () => {
      if (donationsObserver.current) {
        donationsObserver.current.unsubscribe();
        donationsObserver.current = null;
      }
    };
  }, [milestone]);

  const calculateMilestoneCurrentBalanceValue = async () => {
    if (
      currentUser.address &&
      !currency &&
      milestone.donationCounters &&
      milestone.donationCounters.length
    ) {
      setCurrency(currentUser.currency);
      try {
        const rateArray = milestone.donationCounters.map(dc => {
          return {
            value: dc.currentBalance,
            currency: dc.symbol,
          };
        });
        const userCurrencyValueResult = await convertMultipleRates(
          null,
          currentUser.currency,
          rateArray,
        );
        setCurrentBalanceValue(userCurrencyValueResult.total);
        setCurrentBalanceUsdValue(userCurrencyValueResult.usdValues);
      } catch (e) {
        console.log('convertMultipleRates error', e);
      }
    }
  };

  useEffect(() => {
    calculateMilestoneCurrentBalanceValue();
  });

  useEffect(() => {
    if (!currentBalanceUsdValue) {
      return;
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const currencyUsdValue of currentBalanceUsdValue) {
      // if usdValue is zero we should not set setIsAmountEnoughForWithdraw(false) because we check
      // minimumPayoutUsdValue comparison when usdValue for a currency is not zero
      if (currencyUsdValue.usdValue && currencyUsdValue.usdValue < minimumPayoutUsdValue) {
        setIsAmountEnoughForWithdraw(false);
        return;
      }
    }
    setIsAmountEnoughForWithdraw(true);
  }, [currentBalanceUsdValue]);

  const isActiveMilestone = () => {
    const { fullyFunded, status } = milestone;
    return status === Milestone.IN_PROGRESS && !fullyFunded;
  };

  const renderDescription = () => DescriptionRender(milestone.description);

  const renderTitleHelper = () => {
    if (milestone.isCapped) {
      if (!milestone.fullyFunded) {
        return (
          <p>
            Amount requested: {convertEthHelper(milestone.maxAmount, milestone.token.decimals)}{' '}
            {milestone.token.symbol}
          </p>
        );
      }
      return <p>This Milestone has reached its funding goal!</p>;
    }

    // Milestone is uncap
    if (milestone.acceptsSingleToken) {
      return <p>This milestone accepts only {milestone.token.symbol}</p>;
    }

    const symbols = activeTokenWhitelist.map(t => t.symbol);
    switch (symbols.length) {
      case 0:
        return <p>No token is defined to contribute.</p>;
      case 1:
        return <p>This milestone accepts only ${symbols}</p>;

      default: {
        const symbolsStr = `${symbols.slice(0, -1).join(', ')} or ${symbols[symbols.length - 1]}`;
        return <p>This milestone accepts {symbolsStr}</p>;
      }
    }
  };

  if (notFound) {
    return <NotFound projectType="Milestone" />;
  }

  const donationsTitle = `Donations${donations.length ? ` (${donations.length})` : ''}`;

  const goBackSectionLinks = [
    { title: 'About', inPageId: 'description' },
    { title: 'Details', inPageId: 'details' },
    { title: 'Status Updates', inPageId: 'status-updates' },
    {
      title: donationsTitle,
      inPageId: 'donations',
    },
  ];
  if (milestone.items && milestone.items.length) {
    goBackSectionLinks.push({ title: 'Proofs', inPageId: 'proofs' });
  }

  const DetailLabel = ({ id, title, explanation }) => (
    <div>
      <span className="label">
        {title}
        <i
          className="fa fa-question-circle-o btn btn-sm btn-explain"
          data-tip="React-tooltip"
          data-for={id}
        />
      </span>
      <ReactTooltip id={id} place="top" type="dark" effect="solid">
        {explanation}
      </ReactTooltip>
    </div>
  );

  DetailLabel.propTypes = {
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    explanation: PropTypes.string.isRequired,
  };

  const donateButtonProps = {
    model: {
      type: Milestone.type,
      acceptsSingleToken: milestone.acceptsSingleToken,
      title: milestone.title,
      id: milestone.id,
      adminId: milestone.projectId,
      dacId: milestone.dacId,
      campaignId: campaign._id,
      token: milestone.acceptsSingleToken ? milestone.token : undefined,
      isCapped: milestone.isCapped,
      ownerAddress: milestone.ownerAddress,
    },
    currentUser,
    history,
    type: Milestone.type,
    maxDonationAmount: milestone.isCapped
      ? milestone.maxAmount.minus(milestone.totalDonatedSingleToken)
      : undefined,
  };

  const detailsCardElmnt = document.getElementById('detailsCard');
  const detailsCardHeight = detailsCardElmnt && detailsCardElmnt.offsetHeight;

  return (
    <HelmetProvider context={helmetContext}>
      <ErrorBoundary>
        <div id="view-milestone-view">
          {isLoading && <Loader className="fixed" />}

          {!isLoading && (
            <div>
              <Helmet>
                <title>{milestone.title}</title>
              </Helmet>

              <BackgroundImageHeader
                image={milestone.image}
                height={300}
                adminId={milestone.projectId}
                projectType="Milestone"
                editProject={
                  milestone.canUserEdit(currentUser) &&
                  (() => editMilestoneButtonRef.current.click())
                }
                cancelProject={
                  milestone.canUserCancel(currentUser) &&
                  (() => cancelMilestoneButtonRef.current.click())
                }
                deleteProject={
                  milestone.canUserDelete(currentUser) &&
                  (() => deleteMilestoneButtonRef.current.click())
                }
              >
                <h6>Milestone</h6>
                <h1>{milestone.title}</h1>

                {!milestone.status === Milestone.IN_PROGRESS && (
                  <p>This Milestone is not active anymore</p>
                )}

                {renderTitleHelper()}

                <p>Campaign: {campaign.title} </p>

                {isActiveMilestone() && (
                  <div className="mt-4">
                    <DonateButton
                      {...donateButtonProps}
                      size="large"
                      autoPopup
                      className="header-donate"
                    />
                  </div>
                )}
              </BackgroundImageHeader>

              <GoBackSection
                projectTitle={milestone.title}
                backUrl={`/campaign/${campaign.slug}`}
                backButtonTitle={`Campaign: ${campaign.title}`}
                inPageLinks={goBackSectionLinks}
              />

              <div className=" col-md-8 m-auto">
                <h5 className="title">Subscribe to updates </h5>
                <ProjectSubscription projectTypeId={milestone._id} projectType="milestone" />
              </div>

              {/* This buttons should not be displayed, just are clicked by using references */}
              <span className="d-none">
                <EditMilestoneButton
                  ref={editMilestoneButtonRef}
                  milestone={milestone}
                  balance={balance}
                  currentUser={currentUser}
                />
                <CancelMilestoneButton
                  ref={cancelMilestoneButtonRef}
                  balance={balance}
                  milestone={milestone}
                  currentUser={currentUser}
                />

                <DeleteProposedMilestoneButton
                  ref={deleteMilestoneButtonRef}
                  milestone={milestone}
                  currentUser={currentUser}
                />
              </span>

              <div className="container-fluid mt-4">
                <div className="row">
                  <div className="col-md-8 m-auto">
                    <ViewMilestoneAlerts
                      milestone={milestone}
                      campaign={campaign}
                      isAmountEnoughForWithdraw={isAmountEnoughForWithdraw}
                    />

                    <div id="description">
                      <div className="about-section-header">
                        <h5 className="title">About</h5>
                        <div className="text-center">
                          <Link to={`/profile/${milestone.ownerAddress}`}>
                            <Avatar
                              className="text-center"
                              size={50}
                              src={getUserAvatar(milestone.owner)}
                              round
                            />
                            <p className="small">{getUserName(milestone.owner)}</p>
                          </Link>
                        </div>
                      </div>

                      <div className="card content-card">
                        <div className="card-body content">{renderDescription()}</div>

                        {milestone.communityUrl && (
                          <div className="pl-3 pb-4">
                            <CommunityButton className="btn btn-secondary" url={campaign.milestone}>
                              Join our Community
                            </CommunityButton>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="row">
                      <div id="details" className="col-md-6">
                        <h4>Details</h4>
                        <div id="detailsCard">
                          <div className="card details-card">
                            <div className="form-group">
                              <DetailLabel
                                id="reviewer"
                                title="Reviewer"
                                explanation="This person will review the actual completion of the Milestone"
                              />
                              {milestone.hasReviewer && (
                                <Fragment>
                                  <table className="table-responsive">
                                    <tbody>
                                      <tr>
                                        <td className="td-user">
                                          <Link to={`/profile/${milestone.reviewerAddress}`}>
                                            <Avatar
                                              size={30}
                                              src={getUserAvatar(milestone.reviewer)}
                                              round
                                            />
                                            {getUserName(milestone.reviewer)}
                                          </Link>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </Fragment>
                              )}
                              {!milestone.hasReviewer && (
                                <p className="form-text alert alert-warning missing-reviewer-alert">
                                  <i className="fa fa-exclamation-triangle" />
                                  This Milestone does not have a reviewer. Any donations to this
                                  Milestone can be withdrawn at any time and no checks are in place
                                  to ensure this Milestone is completed.
                                </p>
                              )}
                            </div>

                            <div className="form-group">
                              <DetailLabel
                                id="recipient"
                                title="Recipient"
                                explanation={`
                          Where the ${
                            milestone.isCapped ? milestone.token.symbol : 'tokens'
                          } will go
                          ${
                            milestone.hasReviewer
                              ? ' after successful completion of the Milestone'
                              : ''
                          }`}
                              />
                              {milestone.hasRecipient && (
                                <Fragment>
                                  {milestone.pendingRecipientAddress && (
                                    <small className="form-text">
                                      <span>
                                        <i className="fa fa-circle-o-notch fa-spin" />
                                        &nbsp;
                                      </span>
                                      This recipient is pending
                                    </small>
                                  )}

                                  <table className="table-responsive">
                                    <tbody>
                                      <tr>
                                        <td className="td-user">
                                          {milestone instanceof LPMilestone ? (
                                            <Link to={`/campaigns/${milestone.recipient._id}`}>
                                              Campaign: {milestone.recipient.title}
                                            </Link>
                                          ) : (
                                            <Link
                                              to={`/profile/${milestone.pendingRecipientAddress ||
                                                milestone.recipientAddress}`}
                                            >
                                              <Avatar
                                                size={30}
                                                src={getUserAvatar(recipient)}
                                                round
                                              />
                                              {getUserName(recipient)}
                                            </Link>
                                          )}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </Fragment>
                              )}
                              {!milestone.hasRecipient && (
                                <p className="form-text">
                                  This Milestone does not have a recipient. If you are interested in
                                  completing the work for this Milestone, contact the Milestone
                                  manager and let them know!
                                </p>
                              )}
                            </div>

                            {milestone.dacId !== 0 && milestone.dacId !== undefined && (
                              <div className="form-group">
                                <DetailLabel
                                  id="dac-delegation"
                                  title="Delegating 3% to DAC"
                                  explanation="The DAC that this milestone is contributing to on every donation"
                                />
                                {dacTitle}
                              </div>
                            )}
                            {milestone.date && (
                              <div className="form-group">
                                <DetailLabel
                                  id="milestone-date"
                                  title="Date of Milestone"
                                  explanation={
                                    milestone.isCapped
                                      ? `This date defines the ${milestone.token.symbol}-fiat conversion rate`
                                      : 'The date this Milestone was created'
                                  }
                                />
                                {moment.utc(milestone.createdAt).format('Do MMM YYYY')}
                              </div>
                            )}

                            {milestone.isCapped && (
                              <div className="form-group">
                                <DetailLabel
                                  id="max-amount"
                                  title="Max amount to raise"
                                  explanation={`The maximum amount of ${milestone.token.symbol} that can be donated to this Milestone. Based on the requested amount in fiat.`}
                                />
                                {convertEthHelper(milestone.maxAmount, milestone.token.decimals)}{' '}
                                {milestone.token.symbol}
                                {milestone.items.length === 0 &&
                                  milestone.selectedFiatType &&
                                  milestone.selectedFiatType !== milestone.token.symbol &&
                                  milestone.fiatAmount && (
                                    <span>
                                      {' '}
                                      ({milestone.fiatAmount.toFixed()} {milestone.selectedFiatType}
                                      )
                                    </span>
                                  )}
                              </div>
                            )}

                            <div className="form-group">
                              <DetailLabel
                                id="amount-donated"
                                title="Amount donated"
                                explanation={
                                  milestone.acceptsSingleToken
                                    ? `
                              The amount of ${milestone.token.symbol} currently donated to this
                              Milestone`
                                    : 'The total amount(s) donated to this Milestone'
                                }
                              />
                              {milestone.donationCounters.length &&
                                milestone.donationCounters.map(dc => (
                                  <p className="donation-counter" key={dc.symbol}>
                                    {convertEthHelper(dc.totalDonated, dc.decimals)} {dc.symbol}
                                  </p>
                                ))}
                            </div>

                            {!milestone.isCapped && milestone.donationCounters.length > 0 && (
                              <div className="form-group">
                                <DetailLabel
                                  id="current-balance"
                                  title="Current balance"
                                  explanation="The current balance(s) of this Milestone"
                                />
                                {milestone.donationCounters.map(dc => (
                                  <p className="donation-counter" key={dc.symbol}>
                                    {convertEthHelper(dc.currentBalance, dc.decimals)} {dc.symbol}
                                  </p>
                                ))}
                              </div>
                            )}

                            {!milestone.isCapped &&
                              milestone.donationCounters.length > 0 &&
                              currency && (
                                <div className="form-group">
                                  <DetailLabel
                                    id="current-balance-value"
                                    title="Current balance value"
                                    explanation="The current balance(s) of this Milestone in your native currency"
                                  />
                                  {currentBalanceValue.toFixed(
                                    (nativeCurrencyWhitelist.find(t => t.symbol === currency) || {})
                                      .decimals || 2,
                                  )}{' '}
                                  {currency}
                                </div>
                              )}

                            <div className="form-group">
                              <DetailLabel
                                id="campaign"
                                title="Campaign"
                                explanation="The Campaign this Milestone belongs to"
                              />
                              {campaign.title}
                            </div>

                            <div className="form-group">
                              <span className="label">Status</span>
                              <br />
                              {getReadableStatus(milestone.status)}
                            </div>
                          </div>

                          <div className="pt-3">
                            <TotalGasPaid
                              gasPaidUsdValue={milestone.gasPaidUsdValue}
                              entity="MILESTONE:"
                            />
                          </div>
                        </div>
                      </div>

                      <div id="status-updates" className="col-md-6">
                        <h4>Status updates</h4>
                        <MilestoneConversations
                          milestone={milestone}
                          currentUser={currentUser}
                          balance={balance}
                          isAmountEnoughForWithdraw={isAmountEnoughForWithdraw}
                          maxHeight={`${detailsCardHeight}px`}
                        />
                      </div>
                    </div>

                    {milestone.items && milestone.items.length > 0 && (
                      <div id="proofs" className="spacer-top-50">
                        <div className="section-header">
                          <h5>Milestone proof</h5>
                        </div>
                        <div>
                          <p>These receipts show how the money of this Milestone was spent.</p>
                        </div>

                        {/* MilesteneItem needs to be wrapped in a form or it won't mount */}
                        <Form>
                          <div className="table-container">
                            <table className="table table-striped table-hover">
                              <thead>
                                <tr>
                                  <th className="td-item-date">Date</th>
                                  <th className="td-item-description">Description</th>
                                  <th className="td-item-amount-fiat">Amount Fiat</th>
                                  <th className="td-item-amount-ether">
                                    Amount {milestone.token.symbol}
                                  </th>
                                  <th className="td-item-file-upload">Attached proof</th>
                                </tr>
                              </thead>
                              <tbody>
                                {milestone.items.map((item, i) => (
                                  <MilestoneItem
                                    key={item._id}
                                    name={`milestoneItem-${i}`}
                                    item={item}
                                    token={milestone.token}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Form>
                      </div>
                    )}

                    <div id="donations" className="spacer-top-50">
                      {milestone.status !== Milestone.PROPOSED && (
                        <React.Fragment>
                          <Row justify="space-between">
                            <Col span={12} className="align-items-center d-flex">
                              <h5 className="mb-0">{donationsTitle}</h5>
                              {newDonations > 0 && (
                                <span
                                  className="badge badge-primary ml-4"
                                  style={{ fontSize: '12px', padding: '6px' }}
                                >
                                  {newDonations} NEW
                                </span>
                              )}
                            </Col>
                            <Col span={12}>
                              {isActiveMilestone() && (
                                <Row gutter={[16, 16]} justify="end">
                                  <Col xs={24} sm={12} lg={8}>
                                    <DonateButton {...donateButtonProps} />
                                  </Col>
                                </Row>
                              )}
                            </Col>
                          </Row>
                          <DonationList
                            donations={donations}
                            isLoading={isLoadingDonations}
                            total={donations.length}
                            loadMore={loadMoreDonations}
                            newDonations={newDonations}
                            useAmountRemaining
                            status={milestone.status}
                          />
                        </React.Fragment>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

ViewMilestone.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      milestoneId: PropTypes.string,
      milestoneSlug: PropTypes.string,
    }),
  }).isRequired,
};

export default React.memo(ViewMilestone);
