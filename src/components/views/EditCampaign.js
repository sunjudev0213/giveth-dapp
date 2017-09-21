import React, { Component } from 'react'
import PropTypes from 'prop-types';

import { Form, Input, Select } from 'formsy-react-components';
import { feathersClient } from '../../lib/feathersClient'
import Loader from '../Loader'
import QuillFormsy from '../QuillFormsy'
// import Milestone from '../Milestone'
// import EditMilestone from '../EditMilestone'
import FormsyImageUploader from './../FormsyImageUploader'
import GoBackButton from '../GoBackButton'
import { isOwner } from '../../lib/helpers'
import { isAuthenticated } from '../../lib/middleware'
import getNetwork from "../../lib/blockchain/getNetwork";
import { getTruncatedText } from '../../lib/helpers'

/**
 * Create or edit a campaign
 *
 *  @props
 *    isNew (bool):  
 *      If set, component will load an empty model.
 *      If not set, component expects an id param and will load a campaign object from backend
 *    
 *  @params
 *    id (string): an id of a campaign object
 */

class EditCampaign extends Component {
  constructor() {
    super()

    this.state = {
      isLoading: true,
      isSaving: false,
      hasError: false,
      causesOptions: [],

      // campaign model
      title: '',
      description: '',
      summary: '',
      image: '',
      videoUrl: '',
      ownerAddress: null,
      projectId: 0,
      milestones: [],
      causes: [],
      uploadNewImage: false
    }

    this.submit = this.submit.bind(this)
    this.setImage = this.setImage.bind(this)  
  }


  componentDidMount() {
    isAuthenticated(this.props.currentUser, this.props.history, this.props.wallet).then(()=>
      Promise.all([
        // load a single campaigns (when editing)
        new Promise((resolve, reject) => {
          if(!this.props.isNew) {
            feathersClient.service('campaigns').find({query: {_id: this.props.match.params.id}})
              .then((resp) => {
                if(!isOwner(resp.data[0].owner.address, this.props.currentUser)) {
                  this.props.history.goBack()
                } else {                
                  this.setState(Object.assign({}, resp.data[0], {
                    id: this.props.match.params.id,
                  }), resolve())  
                }})
              .catch(() => reject())
          } else {
            resolve()
          }
        })
      ,
        // load all causes. that aren't pending
        // TO DO: this needs to be replaced by something like http://react-autosuggest.js.org/
        new Promise((resolve, reject) => {
          feathersClient.service('causes').find({query: { $exists: [ 'delegateId' ], $select: [ 'title', 'delegateId' ] }})
            .then((resp) => 
              this.setState({ 
                causesOptions: resp.data.map((c) =>  { return { label: c.title, value: c.delegateId } }),
                hasError: false
              }, resolve())
            )
            .catch(() => reject())
        })

      ]).then(() => this.setState({ isLoading: false, hasError: false }), this.focusFirstInput())
        .catch((e) => {
          console.log('error loading', e)
          this.setState({ isLoading: false, hasError: true })        
        })
    )
  }

  focusFirstInput(){
    setTimeout(() => this.refs.title.element.focus(), 500)
  }

  mapInputs(inputs) {
    return {
      'title': inputs.title,
      'description': inputs.description,
      'causes': inputs.causes
    }
  }  

  setImage(image) {
    this.setState({ image: image, uploadNewImage: true })
  }

  isValid() {
    return true
    return this.state.description.length > 0 && this.state.title.length > 10 && this.state.image.length > 0
  }

  submit(model) {    
    this.setState({ isSaving: true })

    const afterEmit = () => {
      this.setState({ isSaving: false })
      React.toast.success("Your Campaign has been updated!")      
      this.props.history.push('/campaigns')      
    }

    const updateCampaign = (file) => {
      const constructedModel = {
        title: model.title,
        description: model.description,
        summary: getTruncatedText(this.state.summary, 200),
        image: file,
        projectId: this.state.projectId,
        parentProject: model.cause || 0,
      }  

      if(this.props.isNew){
        feathersClient.service('campaigns').create(constructedModel)
          .then(() => this.props.history.push('/my-campaigns'));

        getNetwork()
          .then(network => {
            const { liquidPledging } = network;

            // set a 2 year commitTime. This is temporary so the campaign acts like a delegate and the donor can
            // still has control of their funds for upto 2 years. Once we implement campaign reviewers, we can set a
            // more reasonable commitTime
            let txHash;
            liquidPledging.addProject(model.title, this.props.currentUser, model.parentProject, 60 * 60 * 24 * 365 * 2, '0x0')
              .once('transactionHash', hash => {
                txHash = hash;
                React.toast.info(`New Campaign transaction hash ${network.etherscan}tx/${txHash}`)
              })
              .then(() => {
                React.toast.success(`Your Campaign was created! New Campaign transaction mined ${network.etherscan}tx/${txHash}`);
              })
              .catch(err => {
                console.log('New Campaign transaction failed:', err);
                React.toast.error(`New Campaign transaction failed ${network.etherscan}tx/${txHash}`);
                //TODO update or remove from feathers? maybe don't remove, so we can inform the user that the tx failed
              });
          })
      } else {
        feathersClient.service('campaigns').patch(this.state.id, constructedModel)
          .then(()=> afterEmit())        
      }
    }

    if(this.state.uploadNewImage) {
      feathersClient.service('/uploads').create({uri: this.state.image}).then(file => updateCampaign(file.url))
    } else {
      updateCampaign()
    }
  } 

  goBack(){
    this.props.history.push('/campaigns')
  }

  constructSummary(text){
    this.setState({ summary: text})
  }

  render(){
    const { isNew, history } = this.props
    let { isLoading, isSaving, title, description, image, causes, causesOptions } = this.state

    return(
        <div id="edit-campaign-view">
          <div className="container-fluid page-layout">
            <div className="row">
              <div className="col-md-8 m-auto">
                { isLoading && 
                  <Loader className="fixed"/>
                }
                
                { !isLoading &&
                  <div>
                    <GoBackButton history={history}/>
                  
                    { isNew &&
                      <h1>Start a new campaign!</h1>
                    }

                    { !isNew &&
                      <h1>Edit campaign {title}</h1>
                    }

                    <Form onSubmit={this.submit} mapping={this.mapInputs} layout='vertical'>
                      <div className="form-group">
                        <Input
                          name="title"
                          id="title-input"
                          label="Title"
                          ref="title"
                          type="text"
                          value={title}
                          placeholder="E.g. Climate change."
                          help="Describe your campaign in 1 sentence."
                          validations="minLength:10"
                          validationErrors={{
                              minLength: 'Please provide at least 10 characters.'
                          }}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <QuillFormsy 
                          name="description"
                          label="Description"
                          value={description}
                          placeholder="Describe your campaign..."
                          onTextChanged={(content)=>this.constructSummary(content)}
                          validations="minLength:10"  
                          help="Describe your campaign."   
                          validationErrors={{
                              minLength: 'Please provide at least 10 characters.'
                          }}                    
                          required                                        
                        />
                      </div>

                      <FormsyImageUploader setImage={this.setImage} previewImage={image}/>

                      {/* TO DO: This needs to be replaced by something like http://react-autosuggest.js.org/ */}
                      <div className="form-group">
                        <Select
                          name="causes"
                          label="Which cause does this campaign solve?"
                          options={causesOptions}
                          value={causes[0]}
                          required
                        />
                      </div>

                      <button className="btn btn-success" formNoValidate={true} type="submit" disabled={isSaving || !this.isValid()}>
                        {isSaving ? "Saving..." : "Save campaign"}
                      </button>
                                     
                    </Form>
                  </div>
                }

              </div>
            </div>
          </div>
      </div>
    )
  }
}

export default EditCampaign

EditCampaign.propTypes = {
  currentUser: PropTypes.string,
  history: PropTypes.object.isRequired,
  isNew: PropTypes.bool
}
