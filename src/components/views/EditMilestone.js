import React, { Component } from 'react'
import PropTypes from 'prop-types'
import LPPMilestone from 'lpp-milestone';
import { utils } from 'web3';

import { Form, Input } from 'formsy-react-components';
import { feathersClient } from './../../lib/feathersClient'
import Loader from './../Loader'
import QuillFormsy from './../QuillFormsy'
import FormsyImageUploader from './../FormsyImageUploader'
import GoBackButton from '../GoBackButton'
import { isOwner } from '../../lib/helpers'
import { isAuthenticated } from '../../lib/middleware'
import { getTruncatedText } from '../../lib/helpers'
import getNetwork from "../../lib/blockchain/getNetwork";
import getWeb3 from "../../lib/blockchain/getWeb3";
import LoaderButton from "../../components/LoaderButton"
import DatePickerFormsy from './../DatePickerFormsy'
import currentUserModel from '../../models/currentUserModel'
import { displayTransactionError } from '../../lib/helpers'

/**
 * Create or edit a milestone
 *
 *  @props
 *    isNew (bool):  
 *      If set, component will load an empty model.
 *      If not set, component expects an id param and will load a milestone object from backend
 *    
 *  @params
 *    id (string): an id of a milestone object
 */

class EditMilestone extends Component {
  constructor() {
    super()

    this.state = {
      isLoading: true,
      isSaving: false,
      hasError: false,
      formIsValid: false,      

      // milestone model
      title: '',
      description: '',
      image: '',
      videoUrl: '',
      maxAmount: 1000,
      ownerAddress: '',
      reviewerAddress: '',
      recipientAddress: '',
      donationsReceived: 0,
      donationsGiven: 0,
      completionDeadline: new Date(),
      status: 'pending',
      uploadNewImage: false         
    }

    this.submit = this.submit.bind(this)
    this.setImage = this.setImage.bind(this)
  } 


  componentDidMount() {
    isAuthenticated(this.props.currentUser, this.props.history, this.props.wallet).then(()=> {
      this.setState({ campaignId: this.props.match.params.id })

      // load a single milestones (when editing)
      if(!this.props.isNew) {
        feathersClient.service('milestones').find({query: {_id: this.props.match.params.milestoneId}})
          .then((resp) => {
            console.log("resp", resp)
            if(!isOwner(resp.data[0].owner.address, this.props.currentUser)) {
              this.props.history.goBack()
            } else {         
              this.setState(Object.assign({}, resp.data[0], {
                id: this.props.match.params.milestoneId,
                maxAmount: utils.fromWei(resp.data[0].maxAmount),
                isLoading: false,
                hasError: false
              }), this.focusFirstInput()) 
            }
          })
          .catch(()=>
            this.setState( { 
              isLoading: false,
              hasError: true
            }))
      } else {
        feathersClient.service('campaigns').get(this.props.match.params.id)
          .then(campaign => {
            if (!campaign.projectId) {
              this.props.history.goBack();
            } else {
              this.setState({
                campaignProjectId: campaign.projectId,
                isLoading: false,
              });
            }
          });
      }
    });

    this.setState({ recipientAddress: this.props.currentUser.address });
  }

  focusFirstInput(){
    setTimeout(() => this.refs.title.element.focus(), 500)
  }

  setImage(image) {
    this.setState({ image: image,  uploadNewImage: true })
  }

  changeDate(moment) {
    console.log('change date', moment.format('YYYY/MM/DD'))
    this.setState({ completionDeadline: moment.format('YYYY/MM/DD') })
  }

  mapInputs(inputs) {
    return {
      'title': inputs.title,
      'description': inputs.description,
      'reviewerAddress': inputs.reviewerAddress,
      'recipientAddress': inputs.recipientAddress,
      'completionDeadline': inputs.completionDeadline,
      'maxAmount': inputs.maxAmount
    }
  }  

  submit(model) {  
    this.setState({ isSaving: true })

    const afterEmit = () => {
      this.setState({ isSaving: false })
      this.props.history.goBack()  
    }

    const updateMilestone = (file) => {
      const constructedModel = {
        title: model.title,
        description: model.description,
        summary: getTruncatedText(this.state.summary, 200),        
        maxAmount: utils.toWei(model.maxAmount),
        ownerAddress: this.props.currentUser.address,
        reviewerAddress: model.reviewerAddress,
        recipientAddress: model.recipientAddress,
        completionDeadline: this.state.completionDeadline,
        image: file,
        campaignId: this.state.campaignId,
        status: this.state.status // make sure not to change status!
      };

      if(this.props.isNew){
        const createMilestone = () => {
          feathersClient.service('milestones').create(Object.assign({}, constructedModel, {
              txHash,
              pluginAddress: '0x0000000000000000000000000000000000000000',
              totalDonated: 0,
              donationCount: 0,
            }))
            .then(() => afterEmit(true))
        };

        let txHash;
        let etherScanUrl;
        Promise.all([ getNetwork(), getWeb3() ])
          .then(([ network, web3 ]) => {
            const { liquidPledging } = network;
            etherScanUrl = network.txHash;

            // web3, lp address, name, parentProject, recipient, maxAmount, reviewer
            LPPMilestone.new(web3, liquidPledging.$address, model.title, '', this.state.campaignProjectId, model.recipientAddress, constructedModel.maxAmount, model.reviewerAddress, { $extraGas: 50000 })
              .on('transactionHash', (hash) => {
                txHash = hash;
                createMilestone(txHash);
                React.toast.info(<p>Your milestone is pending....<br/><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>)
              })
              .then(() => {
                React.toast.success(<p>Your milestone has been created!<br/><a href={`${etherScanUrl}tx/${txHash}`} target="_blank" rel="noopener noreferrer">View transaction</a></p>)
              })
          })
          .catch(err => {
            console.log('New milestone transaction failed:', err);
            displayTransactionError(txHash, etherScanUrl)            
          });


      } else {
        feathersClient.service('milestones').patch(this.state.id, constructedModel)
          .then(()=> afterEmit())        
      }         

    }

    if(this.state.uploadNewImage) {
      feathersClient.service('/uploads').create({uri: this.state.image}).then(file => updateMilestone(file.url))
    } else {
      updateMilestone()
    }
  } 

  toggleFormValid(state) {
    this.setState({ formIsValid: state })
  }    

  constructSummary(text){
    this.setState({ summary: text})
  }    

  render(){
    const { isNew, history } = this.props
    let { isLoading, isSaving, title, description, image, recipientAddress, reviewerAddress, completionDeadline, formIsValid, maxAmount } = this.state

    return(
        <div id="edit-milestone-view">
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
                      <h1>Add a new milestone</h1>
                    }

                    { !isNew &&
                      <h1>Edit milestone {title}</h1>
                    }

                    <Form onSubmit={this.submit} mapping={this.mapInputs} onValid={()=>this.toggleFormValid(true)} onInvalid={()=>this.toggleFormValid(false)} layout='vertical'>

                      <div className="form-group">
                        <Input
                          name="title"
                          id="title-input"
                          ref="title"
                          type="text"
                          value={title}
                          placeholder="E.g. Climate change."
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
                          placeholder="Describe your milestone..."
                          onTextChanged={(content)=>this.constructSummary(content)}                                                    
                          validations="minLength:10"  
                          help="Describe your milestone."   
                          validationErrors={{
                              minLength: 'Please provide at least 10 characters.'
                          }}                    
                          required                                        
                        />
                      </div>

                      <FormsyImageUploader setImage={this.setImage} previewImage={image} required={isNew}/>

                      <Input
                        name="reviewerAddress"
                        id="title-input"
                        label="Reviewer Address"
                        type="text"
                        value={reviewerAddress}
                        placeholder="Who will review this milestone?"
                        help="Enter an Ethereum address."
                        validations="isEtherAddress"
                        validationErrors={{
                            isEtherAddress: 'Please insert a valid Ethereum address.'
                        }}                    
                        required
                      />    

                      <Input
                        name="recipientAddress"
                        id="title-input"
                        label="Recipient Address"
                        type="text"
                        value={recipientAddress}
                        placeholder="Where will the money go?"
                        help="Enter an Ethereum address."
                        validations="isEtherAddress"
                        validationErrors={{
                            isEtherAddress: 'Please insert a valid Ethereum address.'
                        }}                    
                        required
                      />                         

                      <DatePickerFormsy
                        name="completionDeadline"
                        label="Estimated Completion Date"
                        type="text"
                        value={completionDeadline}
                        changeDate={(date)=>this.changeDate(date)}
                        placeholder="When will the milestone be completed?"
                        help="Enter a date."
                        validations="minLength:10"
                        validationErrors={{
                            minLength: 'Please provide a date.'
                        }}                    
                        required
                      />  

                      <div className="form-group">
                        <Input
                          name="maxAmount"
                          id="maxamount-input"
                          ref="maxAmount"
                          type="number"
                          label="Maximum amount of &#926; for this milestone"
                          value={maxAmount}
                          placeholder="1000"
                          validations="greaterThan:0.1"                            
                          validationErrors={{
                              greaterThan: 'Minimum value must be at least &#926;0.1'
                          }}                    
                          required                             
                        />
                      </div>                       
                                              
                      <LoaderButton
                        className="btn btn-success" 
                        formNoValidate={true} 
                        type="submit" 
                        disabled={isSaving || !formIsValid}
                        isLoading={isSaving}
                        loadingText="Saving...">
                        Save Milestone
                      </LoaderButton>         

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

export default EditMilestone

EditMilestone.propTypes = {
  currentUser: currentUserModel,
  history: PropTypes.object.isRequired,
  isNew: PropTypes.bool
}