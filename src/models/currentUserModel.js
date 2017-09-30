import PropTypes from 'prop-types'

const currentUserModel = PropTypes.shape({
  avatar: PropTypes.string,
  name: PropTypes.string,
  address: PropTypes.string,
  commitTime: PropTypes.string,
  donorId: PropTypes.number,
  email: PropTypes.string,
  linkedin: PropTypes.string
})

export default currentUserModel