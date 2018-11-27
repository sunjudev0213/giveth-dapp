import React from 'react';
import BigNumber from 'bignumber.js';
import { getStartOfDayUTC, getRandomWhitelistAddress } from 'lib/helpers';
import BasicModel from './BasicModel';

import MilestoneItemModel from './MilestoneItem';
/**
 * The DApp Milestone model
 */
export default class MilestoneModel extends BasicModel {
  constructor(data) {
    super(data);

    const {
      id = data._id || undefined,
      maxAmount = new BigNumber('0'),
      selectedFiatType = 'EUR',
      fiatAmount = new BigNumber('0'),
      recipientAddress = '',
      status = MilestoneModel.PENDING,
      projectId = '',
      reviewerAddress = React.whitelist.reviewerWhitelist.length > 0
        ? getRandomWhitelistAddress(React.whitelist.reviewerWhitelist).address
        : '',
      items = [],
      itemizeState = false,
      date = getStartOfDayUTC().subtract(1, 'd'),
      confirmations = 0,
      requiredConfirmations = 6,
      commitTime,
    } = data;

    this._maxAmount = maxAmount;
    this._selectedFiatType = selectedFiatType;
    this._fiatAmount = fiatAmount;
    this._recipientAddress = recipientAddress;
    this._status = status;
    this._projectId = projectId;
    this._reviewerAddress = reviewerAddress;
    this._items = items;
    this._itemizeState = itemizeState;
    this._date = date;
    this._id = id;
    this._confirmations = confirmations;
    this._requiredConfirmations = requiredConfirmations;
    this._commitTime = commitTime;
  }

  /**
    get & setters
  * */

  static get PROPOSED() {
    return MilestoneModel.statuses.PROPOSED;
  }

  static get REJECTED() {
    return MilestoneModel.statuses.REJECTED;
  }

  static get PENDING() {
    return MilestoneModel.statuses.PENDING;
  }

  static get IN_PROGRESS() {
    return MilestoneModel.statuses.IN_PROGRESS;
  }

  static get NEEDS_REVIEW() {
    return MilestoneModel.statuses.NEEDS_REVIEW;
  }

  static get COMPLETED() {
    return MilestoneModel.statuses.COMPLETED;
  }

  static get CANCELED() {
    return MilestoneModel.statuses.CANCELED;
  }

  static get PAYING() {
    return MilestoneModel.statuses.PAYING;
  }

  static get PAID() {
    return MilestoneModel.statuses.PAID;
  }

  static get FAILED() {
    return MilestoneModel.statuses.FAILED;
  }

  static get statuses() {
    return {
      PROPOSED: 'Proposed',
      REJECTED: 'Rejected',
      PENDING: 'Pending',
      IN_PROGRESS: 'InProgress',
      NEEDS_REVIEW: 'NeedsReview',
      COMPLETED: 'Completed',
      CANCELED: 'Canceled',
      PAYING: 'Paying',
      PAID: 'Paid',
      FAILED: 'Failed',
    };
  }

  static get type() {
    return 'milestone';
  }

  get title() {
    return this._title;
  }

  set title(value) {
    this.checkType(value, ['string'], 'title');
    this._title = value;
  }

  get description() {
    return this._description;
  }

  set description(value) {
    this.checkType(value, ['string'], 'description');
    this._description = value;
  }

  get image() {
    return this._image;
  }

  set image(value) {
    this.checkType(value, ['string'], 'image');
    this._image = value;
  }

  get maxAmount() {
    return this._maxAmount;
  }

  set maxAmount(value) {
    this.checkInstanceOf(value, BigNumber, 'maxAmount');
    this._maxAmount = value;
  }

  get selectedFiatType() {
    return this._selectedFiatType;
  }

  set selectedFiatType(value) {
    this.checkType(value, ['string'], 'selectedFiatType');
    this._selectedFiatType = value;
  }

  get fiatAmount() {
    return this._fiatAmount;
  }

  set fiatAmount(value) {
    this.checkInstanceOf(value, BigNumber, 'fiatAmount');
    this._fiatAmount = value;
  }

  get recipientAddress() {
    return this._recipientAddress;
  }

  set recipientAddress(value) {
    this.checkType(value, ['string'], 'recipientAddress');
    this._recipientAddress = value;
  }

  get status() {
    return this._status;
  }

  set status(value) {
    this.checkValue(value, Object.values(MilestoneModel.statuses), 'status');
    this._status = value;
  }

  get campaignTitle() {
    return this._campaignTitle;
  }

  set campaignTitle(value) {
    this.checkType(value, ['string'], 'campaignTitle');
    this._campaignTitle = value;
  }

  get projectId() {
    return this._projectId;
  }

  set projectId(value) {
    this.checkType(value, ['string'], 'projectId');
    this._projectId = value;
  }

  get reviewerAddress() {
    return this._reviewerAddress;
  }

  set reviewerAddress(value) {
    this.checkType(value, ['string'], 'reviewerAddress');
    this._reviewerAddress = value;
  }

  get items() {
    return this._items;
  }

  set items(value) {
    value.forEach(item => {
      this.checkInstanceOf(item, MilestoneItemModel, 'items');
    });

    this._items = value;
  }

  get itemizeState() {
    return this._itemizeState;
  }

  set itemizeState(value) {
    this.checkType(value, ['boolean'], 'itemizeState');
    this._itemizeState = value;
  }

  get date() {
    return this._date;
  }

  set date(value) {
    this.checkIsMoment(value, 'date');
    this._date = value;
  }

  get id() {
    return this._id;
  }

  set id(value) {
    if (value) {
      this.checkType(value, ['string'], '_id');
      this._id = value;
    }
  }

  get confirmations() {
    return this._confirmations;
  }

  set confirmations(value) {
    this.checkType(value, ['number'], 'confirmations');
    this._confirmations = value;
  }

  get requiredConfirmations() {
    return this._requiredConfirmations;
  }

  set requiredConfirmations(value) {
    this.checkType(value, ['number'], 'requiredConfirmations');
    this._requiredConfirmations = value;
  }

  get commitTime() {
    return this._commitTime;
  }

  set commitTime(value) {
    this.checkType(value, ['number'], 'commitTime');
    this._commitTime = value;
  }

  get currentBalance() {
    if (Array.isArray(this._donationCounters) && this._donationCounters.length > 0) {
      return this._donationCounters[0].currentBalance;
    }
    return '0';
  }
}
