import React, { Fragment, useContext } from 'react';
import PropTypes from 'prop-types';

import GA from 'lib/GoogleAnalytics';
import { actionWithLoggedIn, checkBalance } from 'lib/middleware';
import Campaign from '../models/Campaign';
import { Context as Web3Context } from '../contextProviders/Web3Provider';
import { Context as UserContext } from '../contextProviders/UserProvider';
import confirmationDialog from '../lib/confirmationDialog';

const CancelCampaignButton = ({ campaign, className }) => {
  const {
    state: { currentUser },
  } = useContext(UserContext);
  const {
    state: { isForeignNetwork, balance },
    actions: { displayForeignNetRequiredWarning },
  } = useContext(Web3Context);

  const cancelCampaign = () => {
    actionWithLoggedIn(currentUser).then(() =>
      checkBalance(balance).then(() => {
        const confirmCancelCampaign = () => {
          const afterCreate = url => {
            const msg = (
              <p>
                Campaign cancellation pending...
                <br />
                <a href={url} target="_blank" rel="noopener noreferrer">
                  View transaction
                </a>
              </p>
            );
            React.toast.info(msg);
            GA.trackEvent({
              category: 'Campaign',
              action: 'canceled',
              label: campaign.id,
            });
          };

          const afterMined = url => {
            const msg = (
              <p>
                The Campaign has been cancelled!
                <br />
                <a href={url} target="_blank" rel="noopener noreferrer">
                  View transaction
                </a>
              </p>
            );
            React.toast.success(msg);
          };
          campaign.cancel(currentUser.address, afterCreate, afterMined);
        };
        confirmationDialog('campaign', campaign.title, confirmCancelCampaign);
      }),
    );
  };

  const userAddress = currentUser.address;
  const { ownerAddress, reviewerAddress } = campaign;
  const userIsOwner =
    userAddress && (userAddress === ownerAddress || userAddress === reviewerAddress);

  return (
    <Fragment>
      {userIsOwner && campaign.isActive && (
        <button
          type="button"
          className={`btn btn-danger btn-sm ${className}`}
          onClick={() => (isForeignNetwork ? cancelCampaign() : displayForeignNetRequiredWarning())}
        >
          <i className="fa fa-ban mr-2" />
          &nbsp;Cancel
        </button>
      )}
    </Fragment>
  );
};

CancelCampaignButton.propTypes = {
  campaign: PropTypes.instanceOf(Campaign).isRequired,
  className: PropTypes.string,
};

CancelCampaignButton.defaultProps = {
  className: '',
};

export default React.memo(CancelCampaignButton);
