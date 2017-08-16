import React, { Component } from 'react'
import { File } from 'formsy-react-components';

/**
 * Image uploader with preview. Returns base64 image
 *
 *  @props
 *    setImage (func):  
 *      Callback function that is called every time the image changes
 *    
 *  @returns
 *    base64 image
 */

class FormsyImageUploader extends Component {
  constructor(){
    super()

    this.state = {
      image: ''
    }
  }

  loadAndPreviewImage() {
    const reader = new FileReader()  
    reader.onload = (e) => {
      this.setState({ image: e.target.result })
      this.props.setImage(e.target.result)
    }

    reader.readAsDataURL(this.refs.imagePreview.element.files[0])
  }

  render(){
    return(
      <div>
        <div id="image-preview">
          <img src={this.state.image} width="500px" alt=""/>
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
      </div>     
    )
  }
}

export default FormsyImageUploader
