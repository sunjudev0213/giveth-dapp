import React, { Component } from 'react'
import { Form, Input } from 'formsy-react-components';
import { socket, feathersClient } from '../../lib/feathersClient'
import Loader from '../Loader'
import QuillFormsy from '../QuillFormsy';
import FormsyImageUploader from './../FormsyImageUploader'
import GoBackButton from '../GoBackButton'
import { isOwner } from '../../lib/helpers'

/**
 * Edit a user profile
 *
 *  @props
 *    currentUser (string):  
 *      The current user's address
 *    
 *  @params
 *    address (string): an id of a user object
 */

class EditProfile extends Component {
  constructor() {
    super()

    this.state = {
      isLoading: true,
      isSaving: false,
      validForm: false,

      // user model
      name: '',
      avatar: '',
      email: '',
      linkedIn: '' 
    }

    this.submit = this.submit.bind(this)
    this.setImage = this.setImage.bind(this)   
    this.onValid = this.onValid.bind(this);
    this.onInvalid = this.onInvalid.bind(this);         
  }  

  componentDidMount() {
    if(!this.props.currentUser) {
      this.props.history.goBack()
    } else {
      new Promise((resolve, reject) => {
        socket.emit('users::find', {address: this.props.currentUser}, (error, resp) => { 
          if(resp) {
            this.setState(Object.assign({}, resp.data[0], {
              isLoading: false
            }, resolve()))
          } else {
            this.setState( { 
              isLoading: false,
              hasError: true
            }, resolve())          
          }
        })  
      }).then(() => this.setState({ isLoading: false }, this.focusFirstInput()))
    }
  }

  focusFirstInput(){
    setTimeout(() => this.refs.name.element.focus(), 0)
  }

  mapInputs(inputs) {
    return {
      'name': inputs.name,
      'email': inputs.email,
      'linkedIn': inputs.linkedIn
    }
  }

  setImage(image) {
    this.setState({ avatar: image })
  }

  isValid() {
    return true
    return this.state.name.length > 0 && this.state.email.length > 10 && this.state.avatar.length > 0
  }

  submit(model) {    
    const constructedModel = {
      name: model.name,
      email: model.email,
      linkedIn: model.linkedIn,
      avatar: this.state.avatar,
    }

    this.setState({ isSaving: true })

    feathersClient.service('/users').update(this.props.currentUser, 
      constructedModel
    ).then(user => {
      this.setState({ isSaving: false })
    })
  } 

  onValid() {
    this.setState({
      validForm: true,
    })
  }

  onInvalid() {
    this.setState({
      validForm: false,
    })
  }  

  render(){
    let { isLoading, isSaving, name, email, linkedIn, avatar, validForm } = this.state

    return(
        <div id="edit-cause-view">
          <div className="container-fluid page-layout">
            <div className="row">
              <div className="col-md-8 m-auto">
                { isLoading && 
                  <Loader className="fixed"/>
                }
                
                { !isLoading &&
                  <div>
                    <h1>Edit your profile</h1>

                    <Form onSubmit={this.submit} mapping={this.mapInputs} onValid={this.onValid} onInvalid={this.onInvalid} layout='vertical'>
                      <div className="form-group">
                        <Input
                          name="name"
                          id="name-input"
                          label="Your name"
                          ref="name"
                          type="text"
                          value={name}
                          placeholder="John Doe."
                          validations="minLength:3"
                          validationErrors={{
                            minLength: 'Please enter your name'
                          }}                    
                          required
                        />
                      </div>

                      <div className="form-group">
                        <Input 
                          name="email"
                          label="Email"
                          value={email}
                          placeholder="email@example.com"
                          validations="isEmail"  
                          help="Please enter your email address."   
                          validationErrors={{
                            isEmail: "That's not a valid email address."
                          }}                    
                          required                                        
                        />
                      </div>

                      <FormsyImageUploader setImage={this.setImage} previewImage={avatar}/>

                      <div className="form-group">
                        <Input
                          name="linkedIn"
                          label="LinkedIn Profile"
                          ref="linkedIn"
                          type="text"
                          value={linkedIn}
                          placeholder="Your linkedIn profile url"
                          validations="isUrl"
                          validationErrors={{
                            isUrl: 'Please enter your linkedin profile url'
                          }}                    
                        />
                      </div>                      

                      <button className="btn btn-success" formNoValidate={true} type="submit" disabled={isSaving || !validForm}>
                        {isSaving ? "Saving..." : "Save profile"}
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

export default EditProfile