const Web3 = require('web3');
const runethtx = require('runethtx');
const LiquidPledgingAbi = require('./node_modules/liquidpledging/build/LiquidPledging.sol').LiquidPledgingAbi;
const liquidpledging = require('liquidpledging');

const LiquidPledging = liquidpledging.LiquidPledging(false);
const Vault = liquidpledging.Vault;

const web3 = new Web3("http://localhost:8545");

// override to display as base 10. default is base 16
web3.utils.BN.prototype.toJSON = function() {
  return this.toString(10);
};

async function deploy() {
  const accounts = await web3.eth.getAccounts();

  const vault = await Vault.new(web3);
  const liquidPledging = await LiquidPledging.new(web3, vault.$address);
  await vault.setLiquidPledging(liquidPledging.$address);

  console.log('vaultAddress: ', vault.$address);
  console.log('liquidPledgingAddress: ', liquidPledging.$address);

  // add 2 donors
  const donor1 = accounts[ 0 ];
  await liquidPledging.addDonor("Donor1", 0, { from: donor1 }); // managerId 1

  const donor2 = accounts[ 1 ];
  await liquidPledging.addDonor("Donor2", 0, { from: donor2 }); // managerId 2

  // add 2 dacs
  await liquidPledging.addDelegate("DAC 1", { from: accounts[ 0 ] }); // managerId 3
  await liquidPledging.addDelegate("DAC 2", { from: accounts[ 3 ] }); // managerId 4

  // add 2 campaigns
  const projectManager1 = accounts[ 2 ];
  const projectManager2 = accounts[ 3 ];
  await liquidPledging.addProject("Campaign 1", projectManager1, 0, 0); // name, projectManager, parentProject, commitTime; managerId 5
  await liquidPledging.addProject("Campaign 2", projectManager2, 0, 0); // name, projectManager, parentProject, commitTime; managerId 6

  // add 1 milestone to campaign 1
  await liquidPledging.addProject("Milestone 1", projectManager1, 5, 0, { from: projectManager1 }); // managerId 7

  // donate to a dac1, campaign1, and milestone1
  await liquidPledging.donate(1, 3, { value: web3.utils.toWei(1) }); // noteId 2
  await liquidPledging.donate(1, 5, { value: web3.utils.toWei(1) }); // noteId 3
  await liquidPledging.donate(1, 7, { value: web3.utils.toWei(1) }); // noteId 4

  const st = await liquidPledging.getState();
  // console.log(JSON.stringify(st.notes, null, 2));

  // delegate to from DAC 1 campaign 2
  await liquidPledging.transfer(3, 2, web3.utils.toWei(.25), 6); // idSender, idNote, amount, idReceive; noteId 5


  // delegate to from DAC 1 DAC 2
  await liquidPledging.transfer(3, 2, web3.utils.toWei(.25), 4); // idSender, idNote, amount, idReceiver; noteId 6

  // dac 2 propose to milestone 1
  await liquidPledging.transfer(4, 6, web3.utils.toWei(.25), 7, {$from: accounts[ 3 ], $gas: 2000000}); // idSender, idNote, amount, idReceiver; noteId 7

  // transfer from campaign 1 to milestone 1
  await liquidPledging.transfer(5, 3, web3.utils.toWei(.5), 7, {$from: projectManager1, $gas: 2000000}); // idSender, idNote, amount, idReceiver; noteId 8

  // approve proposedProject
  await liquidPledging.transfer(1, 7, web3.utils.toWei(.25), 7, {$from: donor1, $gas: 300000 });

  //
  // await liquidPledging.withdraw(7, web3.utils.toWei(.25), {$from: donor1 });

  const st2 = await liquidPledging.getState();
  console.log(JSON.stringify(st2.notes, null, 2));
  console.log(st2.notes.length);
  const st1 = await liquidPledging.getState();
  // console.log(JSON.stringify(st1, null, 2))
}

deploy();
