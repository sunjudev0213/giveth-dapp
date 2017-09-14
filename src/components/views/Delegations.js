import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { feathersClient } from '../../lib/feathersClient'
import { paramsForServer } from 'feathers-hooks-common'
import Loader from '../Loader'
import { isAuthenticated } from '../../lib/middleware'

/**
  The my delegations view
**/

class Delegations extends Component {
  constructor() {
    super()

    this.state = {
      isLoading: true,
      hasError: false,
      causes: [],
      delegations: []
    }    
  }

  componentDidMount() {
    isAuthenticated(this.props.currentUser, this.props.history).then(() => {
      this.causesObserver = feathersClient.service('causes').watch({ strategy: 'always' }).find({query: { ownerAddress: this.props.currentUser }}).subscribe(
        resp => {
          console.log(resp)
          this.setState({
            causes: resp.data,
            hasError: false,
            isLoading: false
          })

          this.getAndWatchDonations()
        },

        err =>
          this.setState({
            isLoading: false,
            hasError: true
          })
      )  
    })    
  }

  getAndWatchDonations() {
    const causesIds = this.state.causes.map(c => c['_id'])

    const query = paramsForServer({
      query: { 
        type_id: { $in: causesIds },
        status: 'waiting'      
      },
      schema: 'includeDonorDetails'
    });

    this.donationsObserver = feathersClient.service('donations').watch({ listStrategy: 'always' }).find(query).subscribe(
      resp => {
        console.log(resp)
        this.setState({
          delegations: resp.data,
          isLoading: false,
          hasError: false
        })},
      err =>
        this.setState({ isLoading: false, hasError: true })
    )             
  }

  componentWillUnmount() {
    if(this.donationsObserver) this.donationsObserver.unsubscribe()
    this.causesObserver.unsubscribe()
  } 



  render() {
    let { delegations, isLoading } = this.state

    return (
        <div id="edit-campaign-view">
          <div className="container-fluid page-layout">
            <div className="row">
              <div className="col-md-12">
                <h1>Your delegations</h1>

                { isLoading && 
                  <Loader className="fixed"/>
                }

                { !isLoading &&
                  <div>
                    { delegations && delegations.length > 0 && 

                      <table className="table table-responsive table-hover">
                        <thead>
                          <tr>
                            <th>Amount</th>
                            <th>To</th>
                            <th>Name</th>
                            <th>Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          { delegations.map((d, index) =>
                            <tr key={index}>
                              <td>{d.amount} ETH</td>
                              <td>{d.type}</td>
                              <td>
                                {d.type === 'dac' && d.dac &&
                                  <span>{d.dac.title}</span>
                                }

                                {d.type === 'campaign' && d.campaign &&
                                  <span>{d.campaign.title}</span>
                                }
                              </td>
                              <td>{d.donorAddress}</td>
                            </tr>
                          )}

                        </tbody>

                      </table>
                    }

                    { delegations && delegations.length === 0 &&
                      <center>There's nothing to delegate yet!</center>
                    }

                  </div>
                }
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Delegations

Delegations.propTypes = {
  currentUser: PropTypes.string,
  history: PropTypes.object.isRequired
}