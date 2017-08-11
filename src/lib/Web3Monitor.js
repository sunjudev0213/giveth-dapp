import Web3 from "web3";
import BigNumber from "bignumber.js";

const ONE_SECOND = 1000;

/**
 * Loads and watches Web3 state
 * @params:
 *    callback (function): function that will be called whenever the state is changed.
 *      @returns:
 *        state (object): all the data
 */
class Web3Monitor {
  constructor(callback) {
    this.state = {
      web3: undefined,
      accounts: [],
    };
    this.callback = callback;

    this.interval = null;
    this.fetchAccounts = this.fetchAccounts.bind(this);

    this.getWeb3().then((web3) => {
      const accounts = this.getAccounts();
      this.updateStateAndNotify({web3, accounts});

      this.fetchAccounts(true);
      this.initPoll();
    });
  }

  // TODO maybe move this to separate lib and don't include web3 object in state. Depends on how we make on chain calls
  getWeb3() {
    console.log('only once');
    return new Promise((resolve) => {

      window.addEventListener('load', function () {
        const {web3} = window;

        // Checking if Web3 has been injected by the browser (Mist/MetaMask)
        if (typeof web3 !== 'undefined') {
          // Use Mist/MetaMask's provider
          window.web3 = new Web3(web3.currentProvider);
        } else {
          // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
          window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
        }

        if (!web3.isConnected()) {
          // TODO setup giveth node and use that
          window.web3 = new Web3(new Web3.providers.HttpProvider("https://giveth.psdev.io:8545"));
        }

        web3.eth.getTransactionReceiptMined = getTransactionReceiptMined;

        resolve(web3);
      })
    })
  }

  /**
   * Fetch accounts and balances.
   */
  fetchAccounts(recheckBalances = false) {
    const {web3} = this.state;
    const ethAccounts = this.getAccounts();

    if (ethAccounts.length === 0) {
      web3 && web3.eth && web3.eth.getAccounts((err, accounts) => {
        if (err) {
          console.log('Web3Monitor -> err fetching accounts', err);
        } else {
          this.handleAccounts(accounts, recheckBalances);
        }
      });
    } else {
      this.handleAccounts(ethAccounts.map(account => account.address), recheckBalances);
    }
  }

  /**
   * fetches the balances for a list of addresses if necessary
   *
   * @param addresses
   * @param recheckBalances if true, check balances for all addresses
   */
  handleAccounts(addresses, recheckBalances) {
    Promise.all(addresses.map((addr) => {
        const accountIdx = this.state.accounts.findIndex(account => account.address === addr);

        // only check balance for new accounts or recheckBalances is true
        if (recheckBalances || accountIdx === -1) {
          return this.getBalance(addr).then((balance) => ({
            address: addr,
            balance,
          }))
        }

        return Promise.resolve(this.state.accounts[accountIdx]);
      }),
    ).then((accounts) => {
      const accountsChanged = this.state.accounts.length !== accounts.length ||
        accounts.some((newAccount, index) => {
          const account = this.state.accounts[index];
          return newAccount.address !== account.address ||
            !newAccount.balance.equals(account.balance);
        });

      if (accountsChanged) this.updateStateAndNotify({accounts});

    }).catch(err => console.log('Web3Monitor -> err checking balances', err));
  }

  getBalance(address) {
    const {web3} = this.state;

    return new Promise((resolve, reject) => {
      web3.eth.getBalance(address, (err, balance) => {
        if (err) {
          reject(err);
        }

        resolve(balance);
      });
    });
  }


  /**
   * Init web3/account polling, and prevent duplicate interval.
   * @return {void}
   */
  initPoll() {
    if (!this.interval) {
      this.interval = setInterval(this.fetchAccounts, ONE_SECOND);
    }
  }

  /**
   * Get the accounts array.
   */
  getAccounts() {
    const {web3} = window;

    if (web3 && web3.eth) {
      return web3.eth.accounts.map((addr) => {
        return {
          address: addr,
          balance: new BigNumber(0),
        }
      });
    }

    return [];
  }

  /**
   * update the state and notify the callback
   * @param mutation
   */
  updateStateAndNotify(mutation) {
    Object.assign(this.state, mutation);
    if (this.callback !== "undefined") this.callback(this.state);
  }
}

export default Web3Monitor;

/* ///////////// custom Web3 Functions ///////////// */

const getTransactionReceiptMined = (txHash, blockLimit = 25) => new Promise(
  (resolve, reject) => {
    const {web3} = window;
    this.eth.getTransactionReceipt(txHash, (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      // tx already mined
      if (res) {
        resolve(res);
        return;
      }

      let blockCounter = blockLimit;
      const listener = web3.eth.filter("latest").watch((blockErr) => {
        if (blockErr) {
          listener.stopWatching();
          reject(blockErr);
          return;
        }

        if (blockCounter <= 0) {
          listener.stopWatching();
          console.warn(`${ txHash } not mined in last ${ blockLimit } blocks`);

          reject("blockLimit reached");
          return;
        }

        web3.eth.getTransactionReceipt(txHash, (receiptErr, receiptRes) => {
          blockCounter -= 1;

          if (receiptRes) {
            listener.stopWatching();
            resolve(receiptRes);
          }
        });
      });
    });
  });
