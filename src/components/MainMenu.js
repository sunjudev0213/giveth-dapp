import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { Link, NavLink } from 'react-router-dom'

/**
  The main top menu
**/

class MainMenu extends Component {
  render() {
    return (
      <nav id="main-menu" className="navbar navbar-expand-lg fixed-top">
        <button className="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon">&#9776;</span>
        </button>
        <Link className="navbar-brand" to="/">Giveth</Link>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav mr-auto">
            <li className="nav-item">
              <NavLink className="nav-link" to="/dacs" activeClassName="active">DACs</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/campaigns" activeClassName="active">Campaigns</NavLink>
            </li>

            {this.props.authenticated &&
              <li className="nav-item dropdown">
                <NavLink className="nav-link dropdown-toggle" id="navbarDropdownDashboard" to="/dashboard" activeClassName="active" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Dashboard</NavLink>
                <div className="dropdown-menu" aria-labelledby="navbarDropdownDashboard">
                  <a className="dropdown-item" href="#">My donations</a>
                  <a className="dropdown-item" href="#">Delegations</a>
                  <a className="dropdown-item" href="#">DACs</a>
                  <a className="dropdown-item" href="#">Campaigns</a>
                </div>
              </li>
            }

            {this.props.authenticated &&
              <li className="nav-item">
                <NavLink className="nav-link" to="/profile" activeClassName="active">Profile</NavLink>
              </li>
            }
            {this.props.authenticated &&
              <li className="nav-item">
                <NavLink className="nav-link" to="/wallet" activeClassName="active">Wallet</NavLink>
              </li>
            }

          </ul>

          {/*
          <form id="search-form" className="form-inline my-2 my-lg-0">
            <input className="form-control mr-sm-2" type="text" placeholder="E.g. save the whales"/>
            <button className="btn btn-outline-success my-2 my-sm-0" type="submit">Find</button>
          </form>
        */}

          <ul className="navbar-nav">
            { !this.props.authenticated &&
              <NavLink className="nav-link" to="/signin" activeClassName="active">Sign In</NavLink>
            }
            { !this.props.authenticated &&
              <NavLink className="nav-link" to="/signup" activeClassName="active">Sign Up</NavLink>              
            }
          </ul>

        </div>
      </nav>
    )
  }
}

export default MainMenu

MainMenu.propTypes = {
  authenticated: PropTypes.string,
}
