import { feathersClient } from './feathersClient';

export const isOwner = (address, currentUser) => {
  // console.log('a/c', address, currentUser)
  // console.log(address !== undefined)
  // console.log(currentUser !== undefined)

  return address !== undefined && currentUser !== undefined && address === currentUser
}


export const authenticate = wallet => {
  const authData = {
    strategy: 'web3',
    address: wallet.getAddresses()[ 0 ],
  };

  return new Promise((resolve, reject) => {
    feathersClient.authenticate(authData)
      .catch(response => {
        // normal flow will issue a 401 with a challenge message we need to sign and send to verify our identity
        if (response.code === 401 && response.data.startsWith('Challenge =')) {
          const msg = response.data.replace('Challenge =', '').trim();

          return resolve(wallet.signMessage(msg).signature);
        }
        return reject(response);
      })
  }).then(signature => {
    authData.signature = signature;
    return feathersClient.authenticate(authData)
  }).then(response => {
    console.log('Authenticated!');
    return response.accessToken;
  });
};