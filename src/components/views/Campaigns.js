import React, { Component } from 'react'
import PropTypes from 'prop-types';

import JoinGivethCommunity from '../JoinGivethCommunity'

import Masonry, {ResponsiveMasonry} from "react-responsive-masonry"
import currentUserModel from '../../models/currentUserModel'

import CampaignCard from '../CampaignCard'

/**
  The campaigns view
**/

class Campaigns extends Component {
  
  // removeCampaign(e, id){
  //   e.stopPropagation()

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

  render() {
    const { currentUser, wallet, campaigns, history } = this.props
    
    return (
      <div id="campaigns-view" className="card-view">
        <JoinGivethCommunity 
          currentUser={currentUser} 
          wallet={wallet}
          history={history}/>

        <div className="container-fluid page-layout reduced-padding">

          { campaigns.data && campaigns.data.length > 0 && 
            <div>
              <center>
                <p>These campaigns work hard to solve causes. Help them realise their goals by giving Ether!</p>
              </center>   
                       
              <ResponsiveMasonry columnsCountBreakPoints={{350: 1, 750: 2, 900: 3, 1024: 4, 1470: 5}}>
                <Masonry gutter="10px">
                  { campaigns.data.map((campaign, index) =>            
                    <CampaignCard 
                      key={index} 
                      campaign={campaign} 
                      currentUser={currentUser}
                      wallet={wallet}
                      history={history}/>                  
                  )}
                </Masonry>
              </ResponsiveMasonry>  
            </div>                
          }
 

          { campaigns.data && campaigns.data.length === 0 &&
            <div>            
              <center>
                <p>There are no campaigns yet!</p>
                <img className="empty-state-img" src={process.env.PUBLIC_URL + "/img/campaign.svg"} width="200px" height="200px" alt="no-campaigns-icon" />
              </center>
            </div>            
          }            

        </div>
      </div>
    )
  } 
}

export default Campaigns

Campaigns.propTypes = {
  currentUser: currentUserModel,
  history: PropTypes.object.isRequired
}