import Accounts from 'web3-eth-accounts';

const _get = WeakMap.prototype.get;
const _set = WeakMap.prototype.set;

const _accounts = new WeakMap();
const _password = new WeakMap();

class GivethWallet {

  constructor(provider, keystoreArray) {
    const accounts = new Accounts(provider);
    _set.call(_accounts, this, accounts);

    this._keystore = keystoreArray;

    this.unlocked = false;
  }

  signMessage(msg) {
    if (!this.unlocked) throw new Error("Locked Wallet");

    const accounts = _get.call(_accounts, this);

    return accounts.wallet[ 0 ].sign(msg || "")
  }

  unlock(password) {
    if (this.unlocked) return;

    _set.call(_password, this, password);

    const accounts = _get.call(_accounts, this);
    accounts.wallet.decrypt(this._keystore, password);

    this.unlocked = true;
  }

  lock() {
    if (!this.unlocked) return;

    const accounts = _get.call(_accounts, this);
    this._keystore = this.getKeystore();

    accounts.wallet.clear();
  }

  clear() {
    _get.call(_accounts, this).clear();
  }

  getKeystore() {
    if (this.unlocked) {
      const password = _get.call(_password, this);
      const accounts = _get.call(_accounts, this);

      return accounts.wallet.encrypt(password);
    }

    return this._keystore;
  }

  getAddresses() {
    if (this.unlocked) {
      const wallet = _get.call(_accounts, this).wallet;
      const addrs = [];

      for (let i = 0; i < wallet.length; i++) {
        addrs[ i ] = wallet[ i ].address;
      }

      return addrs;
    }

    if (!this._keystore) return [];

    return this._keystore.map(account => GivethWallet.fixAddress(account.address));
  }

  static fixAddress(addr) {
    return (addr.toLowerCase().startsWith('0x')) ? addr : `0x${addr}`;
  }

  static createWallet(provider, password) {
    return new Promise(resolve => {
      const keystore = new Accounts(provider).wallet.create(1).encrypt(password);
      resolve(createGivethWallet(keystore, provider, password));
    });
  }

  static loadWallet(keystore, provider, password) {
    return new Promise(resolve => {
      if (!Array.isArray(keystore)) keystore = [ keystore ];

      resolve(createGivethWallet(keystore, provider, password));
    });
  }
}

const createGivethWallet = (keystore, provider, password) => {
  const wallet = new GivethWallet(provider, keystore);
  wallet.unlock(password);

  return wallet;
};

export default GivethWallet;