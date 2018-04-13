import React, { Component } from 'react';
import { Portal } from 'react-portal';
import { utils } from 'web3';
import PropTypes from 'prop-types';

import { SkyLightStateless } from 'react-skylight';
import { Input, Form } from 'formsy-react-components';
import FormsyImageUploader from './FormsyImageUploader';
import RateConvertor from './RateConvertor';

import { getStartOfDayUTC } from '../lib/helpers';

const initialState = {
  modalVisible: false,
  date: getStartOfDayUTC().subtract(1, 'd'),
  description: '',
  image: '',
  uploadNewImage: false,
  formIsValid: false,
};

const addMilestoneModalStyle = {
  width: '70% !important',
  height: '700px !important',
  marginTop: '-350px',
  maxHeight: '700px',
  overflowY: 'scroll',
  textAlign: 'left',
};

class AddMilestoneItem extends Component {
  constructor() {
    super();

    this.state = initialState;

    this.setImage = this.setImage.bind(this);
    this.submit = this.submit.bind(this);
    this.openDialog = this.openDialog.bind(this);
  }

  setImage(image) {
    this.setState({ image });
  }

  mapInputs(inputs) {
    return {
      date: inputs.date.format(),
      description: inputs.description,
      image: this.state.image,
      selectedFiatType: inputs.fiatType,
      fiatAmount: inputs.fiatAmount,
      etherAmount: inputs.etherAmount,
      wei: utils.toWei(inputs.etherAmount),
      conversionRate: parseFloat(inputs.conversionRate),
      ethConversionRateTimestamp: inputs.ethConversionRateTimestamp,
    };
  }

  closeDialog() {
    this.setState(initialState);
  }

  submit(model) {
    this.props.onAddItem(model);
    this.setState(initialState);
  }

  openDialog() {
    this.setState({ modalVisible: true });
  }

  render() {
    const { modalVisible, formIsValid, description, image } = this.state;

    return (
      <div className="add-milestone-item">
        <button
          type="button"
          className="btn btn-primary btn-sm btn-add-milestone-item"
          onClick={this.openDialog}
        >
          Add item
        </button>

        <Portal className="add-milestone-item-skylight">
          <SkyLightStateless
            isVisible={modalVisible}
            onCloseClicked={() => this.closeDialog()}
            title="Add an item to this milestone"
            dialogStyles={addMilestoneModalStyle}
          >
            <Form
              onSubmit={this.submit}
              mapping={inputs => this.mapInputs(inputs)}
              onValid={() => this.setState({ formIsValid: true })}
              onInvalid={() => this.setState({ formIsValid: false })}
              layout="vertical"
            >
              <div className="form-group row">
                <div className="col-12">
                  <Input
                    label="Description"
                    name="description"
                    type="text"
                    value={description}
                    placeholder="E.g. my receipt"
                    validations="minLength:3"
                    validationErrors={{
                      minLength: 'Provide description',
                    }}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <RateConvertor getEthConversion={this.props.getEthConversion} />

              <FormsyImageUploader
                name="image"
                previewImage={image}
                setImage={this.setImage}
                resize={false}
              />

              <button
                className="btn btn-primary"
                disabled={!formIsValid}
                formNoValidate
                type="submit"
              >
                Add item
              </button>

              <button className="btn btn-link" onClick={() => this.closeDialog()}>
                Cancel
              </button>
            </Form>
          </SkyLightStateless>
        </Portal>
      </div>
    );
  }
}

AddMilestoneItem.propTypes = {
  getEthConversion: PropTypes.func.isRequired,
  onAddItem: PropTypes.func,
};

AddMilestoneItem.defaultProps = {
  onAddItem: () => {},
};

export default AddMilestoneItem;
