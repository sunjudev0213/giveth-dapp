import React from 'react';
import PropTypes from 'prop-types';

const GoBackButton = ({ history, styleName }) => (
  <div
    onClick={history.goBack}
    onKeyPress={history.goBack}
    role="button"
    tabIndex="0"
    className={`go-back-button ${styleName}`}
  >
    <i className="fa fa-long-arrow-left" />
    back
  </div>
);

export default GoBackButton;

GoBackButton.propTypes = {
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  styleName: PropTypes.string,
};

GoBackButton.defaultProps = {
  styleName: '',
};
