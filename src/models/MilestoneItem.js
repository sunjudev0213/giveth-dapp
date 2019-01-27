import React from 'react';
import { getStartOfDayUTC } from 'lib/helpers';
import BigNumber from 'bignumber.js';

import moment from 'moment';
import Model from './Model';

export default class MilestoneItemModel extends Model {
  constructor(data) {
    super(data);

    const {
      date = getStartOfDayUTC().subtract(1, 'd'),
      description = '',
      image = '',
      selectedFiatType = 'EUR',
      fiatAmount = new BigNumber('0'),
      wei = '',
      conversionRate = parseFloat(0),
      conversionRateTimestamp = new Date().toISOString(),
      _id,
    } = data;

    this._date = date;
    this._description = description;
    this._image = image;
    this._selectedFiatType = selectedFiatType;
    this._fiatAmount = new BigNumber(fiatAmount);
    this._wei = wei;
    this._conversionRate = conversionRate;
    this._conversionRateTimestamp = conversionRateTimestamp;
    this._id = _id;
  }

  get date() {
    return this._date;
  }

  set date(value) {
    if (moment(value).isAfter(moment(getStartOfDayUTC().subtract(1, 'd')))) {
      throw new TypeError(`Item date should be before today`);
    } else {
      this._date = value;
    }
  }

  get description() {
    return this._description;
  }

  set description(value) {
    this.checkType(value, ['string'], 'description');
    this._description = value;
  }

  set image(value) {
    this._image = value;
  }

  get image() {
    return this._image;
  }

  get selectedFiatType() {
    return this._selectedFiatType;
  }

  set selectedFiatType(value) {
    this.checkValue(value, React.whitelist.fiatWhitelist, 'selectedFiatType');
    this._selectedFiatType = value;
  }

  get fiatAmount() {
    return this._fiatAmount;
  }

  set fiatAmount(value) {
    this.checkInstanceOf(value, BigNumber, 'fiatAmount');
    this._fiatAmount = value;
  }

  get wei() {
    return this._wei;
  }

  set wei(value) {
    this.checkType(value, ['string'], 'wei');
    this._wei = value;
  }

  get conversionRate() {
    return this._conversionRate;
  }

  set conversionRate(value) {
    this.checkType(value, ['number'], 'conversionRate');
    this._conversionRate = value;
  }

  get conversionRateTimestamp() {
    return this._conversionRateTimestamp;
  }

  set conversionRateTimestamp(value) {
    this.checkType(value, ['string'], 'conversionRateTimestamp');
    this._conversionRateTimestamp = value;
  }

  getItem() {
    return {
      date: this._date,
      description: this._description,
      image: this._image,
      selectedFiatType: this._selectedFiatType,
      fiatAmount: this._fiatAmount,
      wei: this._wei,
      conversionRate: this._conversionRate,
      conversionRateTimestamp: this._conversionRateTimestamp,
    };
  }
}
