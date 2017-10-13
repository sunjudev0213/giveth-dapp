import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { utils } from 'web3';

import { feathersClient } from '../../lib/feathersClient'
import { isAuthenticated, redirectAfterWalletUnlock, checkWalletBalance } from '../../lib/middleware'
import Loader from '../Loader'

import currentUserModel from '../../models/currentUserModel'


/**
  The my dacs view
**/

class MyDACs extends Component {
  constructor() {
    super()

    this.state = {
      isLoading: true,
      dacs: []
    }    
  }

  componentDidMount() {
    isAuthenticated(this.props.currentUser, this.props.history).then(() =>
      feathersClient.service('dacs').find({query: { ownerAddress: this.props.currentUser.address }})
        .then((resp) => {

          console.log(resp)
          this.setState({
            dacs: resp.data.map((d) => {
              if (!d.status) {
                d.status = (d.delegateId) ? 'accepting donations' : 'pending';
              }
              return d
            }),
            hasError: false,
            isLoading: false
          })})
        .catch(() => 
          this.setState({ 
            isLoading: false, 
            hasError: true 
          }))
    )   
  }  

  // removeDAC(id){
  //   React.swal({
  //     title: "Delete DAC?",
  //     text: "You will not be able to recover this DAC!",
  //     icon: "warning",
  //     showCancelButton: true,
  //     confirmButtonColor: "#DD6B55",
  //     confirmButtonText: "Yes, delete it!",
  //     closeOnConfirm: true,
  //   }, () => {
  //     const dacs = feathersClient.service('/dacs');
  //     dacs.remove(id).then(dac => {
  //       React.toast.success("Your DAC has been deleted.")
  //     })
  //   });
  // }

  editDAC(id) {
    checkWalletBalance(this.props.wallet, this.props.history).then(()=>    
      React.swal({
        title: "Edit Community?",
        text: "Are you sure you want to edit the description of this community?",
        icon: "warning",
        dangerMode: true,
        buttons: ["Cancel", "Yes, edit"]
      }).then((isConfirmed) => {
        if(isConfirmed) redirectAfterWalletUnlock("/dacs/" + id + "/edit", this.props.wallet, this.props.history)
      })
    )
  }

  render() {
    let { dacs, isLoading } = this.state;

    return (
      <div id="dacs-view">
        <div className="container-fluid page-layout dashboard-table-view">
          <div className="row">
            <div className="col-md-10 m-auto">
              <h1>Your DACs</h1>

              { isLoading && 
                <Loader className="fixed"/>
              }

              { !isLoading &&
                <div>

                  { dacs && dacs.length > 0 && 
                    <table className="table table-responsive table-striped table-hover">
                      <thead>
                        <tr>
                          <th>Name</th>     
                          <th>Number of donations</th>                     
                          <th>Amount donated</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        { dacs.map((d, index) =>
                          <tr key={index} className={d.status === 'pending' ? 'pending' : ''}>
                            <td>{d.title}</td>
                            <td>{d.donationCount || 0}</td>
                            <td>{(d.totalDonated) ? utils.fromWei(d.totalDonated) : 0}</td>
                            <td>
                              {d.status === 'pending' &&
                                <span><i className="fa fa-circle-o-notch fa-spin"></i>&nbsp;</span> }
                              {d.status}
                            </td>
                            <td>
                              <a className="btn btn-link" onClick={()=>this.editDAC(d._id)}>
                                <i className="fa fa-edit"></i>
                              </a>
                            </td>
                          </tr>

                        )}
                      </tbody>
                    </table>              
                  }
                

                  { dacs && dacs.length === 0 &&
                    <center>You didn't create any DACs yet!</center>
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

export default MyDACs

MyDACs.propTypes = {
  currentUser: currentUserModel,
  history: PropTypes.object.isRequired
}