import React, { Component } from 'react'
import { Form, Input, File, Select } from 'formsy-react-components';
import { socket } from '../../lib/feathersClient'
import Loader from '../Loader'
import QuillFormsy from '../QuillFormsy';


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
      title: '',
      description: '',
      image: '',
      videoUrl: '',
      ownerAddress: null,
      milestones: [],
      causes: [],
      causesOptions: [],
      hasError: false
    }

    this.submit = this.submit.bind(this)
  } 


  componentDidMount() {
    Promise.all([
      // load a single campaigns (when editing)
      new Promise((resolve, reject) => {
        if(!this.props.isNew) {
          socket.emit('campaigns::find', {_id: this.props.match.params.id}, (error, resp) => {   
            console.log(resp) 
            if(resp) {  
              this.setState({
                id: this.props.match.params.id,
                title: resp.data[0].title,
                description: resp.data[0].description,
                image: resp.data[0].image,
                videoUrl: resp.data[0].videoUrl,
                ownerAddress: resp.data[0].ownerAddress,
                milestones: resp.data[0].milestones,        
                causes: resp.data[0].causes  
              }, resolve())  
            } else {
              reject()
            }
          })  
        } else {
          resolve()
        }
      })
    ,
      // load all causes. 
      // TO DO: this needs to be replaced by something like http://react-autosuggest.js.org/
      new Promise((resolve, reject) => {
        socket.emit('causes::find', { $select: [ 'title', '_id' ] }, (err, resp) => {    
          if(resp){
            this.setState({ 
              causesOptions: resp.data.map((c) =>  { return { label: c.title, value: c._id } }),
              hasError: false
            }, resolve())
          } else {
            this.setState({ hasError: true }, reject())
          }
        })
      })

    ]).then(() => this.setState({ isLoading: false, hasError: false }), this.focusFirstInput())
      .catch((e) => {
        console.log('error loading', e)
        this.setState({ isLoading: false, hasError: true })        
      })
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

  loadAndPreviewImage() {
    const reader = new FileReader()  

    reader.onload = (e) => this.setState({ image: e.target.result })

    reader.readAsDataURL(this.refs.imagePreview.element.files[0])
  }

  isValid() {
    return true
    return this.state.description.length > 0 && this.state.title.length > 10 && this.state.image.length > 0
  }

  submit(model) {    
    const constructedModel = {
      title: model.title,
      description: model.description,
      image: this.state.image,
      causes: [ model.causes ]
    }

    const afterEmit = () => {
      this.setState({ isSaving: false })
      this.props.history.push('/campaigns')      
    }

    this.setState({ isSaving: true })

    if(this.props.isNew){
      socket.emit('campaigns::create', constructedModel, afterEmit)
    } else {
      socket.emit('campaigns::update', this.state.id, constructedModel, afterEmit)
    }
  } 

  goBack(){
    this.props.history.push('/campaigns')
  }

  render(){
    const { isNew } = this.props
    let { isLoading, isSaving, title, description, image, causes, causesOptions } = this.state

    return(
        <div id="edit-campaign-view">
          <div className="container-fluid page-layout">
            <div className="row">
              <div className="col-md-8 offset-md-2">
                { isLoading && 
                  <Loader className="fixed"/>
                }
                
                { !isLoading &&
                  <div>
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
                          help="Describe your cause in 1 scentence."
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
                          validations="minLength:10"  
                          help="Describe your campaign."   
                          validationErrors={{
                              minLength: 'Please provide at least 10 characters.'
                          }}                    
                          required                                        
                        />
                      </div>

                      <div id="image-preview">
                        <img src={image} width="500px" alt=""/>
                      </div>

                      <div className="form-group">
                        <label>Add a picture</label>
                        <File
                          name="picture"
                          onChange={()=>this.loadAndPreviewImage()}
                          ref="imagePreview"
                          required
                        />
                      </div>

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