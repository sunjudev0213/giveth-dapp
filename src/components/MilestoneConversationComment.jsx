import React, { Fragment, useContext, useRef } from 'react';
import PropTypes from 'prop-types';
import Milestone from 'models/Milestone';
import { feathersClient } from '../lib/feathersClient';
import ErrorPopup from './ErrorPopup';
import { actionWithLoggedIn, authenticateUser, checkProfile } from '../lib/middleware';
import ConversationModal from './ConversationModal';
import { Context as UserContext } from '../contextProviders/UserProvider';
import BridgedMilestone from '../models/BridgedMilestone';
import LPPCappedMilestone from '../models/LPPCappedMilestone';
import LPMilestone from '../models/LPMilestone';

const MilestoneConversationComment = ({ milestone }) => {
  const conversationModal = useRef(null);
  const {
    state: { currentUser },
  } = useContext(UserContext);

  function checkUser() {
    return authenticateUser(currentUser, false).then(() => checkProfile(currentUser));
  }

  function createMessage(message) {
    feathersClient
      .service('conversations')
      .create({
        milestoneId: milestone.id,
        message,
        messageContext: 'comment',
      })
      .catch(err => {
        if (err.name === 'NotAuthenticated') {
          console.log('NotAuthenticated');
        } else {
          ErrorPopup('Something went wrong with creating new milestone message ', err);
        }
      });
  }

  const writeMessage = async () => {
    actionWithLoggedIn(currentUser).then(() =>
      conversationModal.current
        .openModal({
          title: 'Comment on Milestone',
          description: (
            <Fragment>
              <p>Use this Comment section to:</p>
              <ul>
                <li>Provide a public record of questions and answers</li>
                <li>Write an update, changes, compliments or concerns</li>
                <li>
                  Write other information that helps donors and project participants understand the
                  the current status of the Milestone
                </li>
              </ul>
            </Fragment>
          ),
          textPlaceholder: '',
          required: false,
          cta: 'Add',
          enableAttachProof: false,
          type: 'Comment',
        })
        .then(({ message }) => {
          const msg = message.trim();
          if (msg) {
            createMessage(msg);
            conversationModal.current.setState({ message: '' });
          }
        })
        .catch(_ => {}),
    );
  };

  const editMessage = () => {
    checkUser().then(() => {
      if (currentUser.authenticated) {
        writeMessage();
      }
    });
  };

  const canUserEdit = () => {
    return (
      currentUser.address &&
      [
        milestone.campaign.ownerAddress,
        milestone.recipientAddress,
        milestone.reviewerAddress,
        milestone.ownerAddress,
      ].includes(currentUser.address)
    );
  };

  return (
    <div id="milestone-comment">
      {canUserEdit() && (
        <Fragment>
          <button
            type="button"
            className="btn btn-success btn-sm w-100 mt-2"
            onClick={() => editMessage()}
          >
            Write Comment
          </button>
          <ConversationModal ref={conversationModal} milestone={milestone} />
        </Fragment>
      )}
    </div>
  );
};

MilestoneConversationComment.propTypes = {
  milestone: PropTypes.oneOfType(
    [Milestone, BridgedMilestone, LPPCappedMilestone, LPMilestone].map(PropTypes.instanceOf),
  ).isRequired,
};

export default MilestoneConversationComment;
