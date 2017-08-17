import React, { Component } from 'react'
import { socket, feathersClient } from '../../lib/feathersClient'
import Loader from '../Loader'
import { Link } from 'react-router-dom'
import Milestone from '../Milestone'
import loadAndWatchFeatherJSResource from '../../lib/loadAndWatchFeatherJSResource'

/**
  Loads and shows a single campaign

  @route params:
    id (string): id of a campaign
**/

class ViewCampaign extends Component {
  constructor() {
    super()

    this.state = {
      isLoading: true,
      hasError: false
    }
  }  

  componentDidMount() {
    this.setState({ id: this.props.match.params.id })

    Promise.all([
      new Promise((resolve, reject) => {
        socket.emit('campaigns::find', {_id: this.props.match.params.id}, (error, resp) => {      
          if(resp) {
            this.setState(resp.data[0], resolve())   
          } else {
            this.setState({ hasError: true }, reject())
          }
        })
      })
    ,
      new Promise((resolve, reject) => {
        new loadAndWatchFeatherJSResource('milestones', {campaignId: this.props.match.params.id}, (resp, err) => {
          if(resp){
            this.setState({ milestones: resp.data }, resolve())
          } else {
            reject()           
          }
        })         
      })
    ]).then(() => this.setState({ isLoading: false, hasError: false }))
      .catch((e) => {
        console.log('error loading', e)
        this.setState({ isLoading: false, hasError: true })        
      })      
  }

  removeMilestone(id){
    const milestones = feathersClient.service('/milestones');
    milestones.remove(id).then(milestone => console.log('Remove a milestone', milestone));
  }    

  render() {
    let { isLoading, id, title, description, image, milestones } = this.state

    return (
      <div id="view-campaign-view">
        <div className="container-fluid page-layout">
          <div className="row">
            <div className="col-md-8 m-auto">
              { isLoading && 
                <Loader className="fixed"/>
              }
              
              { !isLoading &&
                <div>
                  <p>Campaign</p>
                                    
                  <h1 className="campaign-title">{title}</h1>
                  <img className="campaign-header-image" src={image} alt=""/>
                  <div dangerouslySetInnerHTML={{__html: description}}></div>

                  <hr/>

                  <h3>Milestones
                  <Link className="btn btn-primary btn-sm pull-right" to={`/campaigns/${ id }/milestones/new`}>Add milestone</Link>
                  </h3>

                  {milestones.length > 0 && milestones.map((m, i) => 
                    <Milestone model={m} key={i} removeMilestone={()=>this.removeMilestone(m._id)}/>
                  )}
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    )
  } 
}

export default ViewCampaign