
const HDWalletProvider = require('@truffle/hdwallet-provider');
const { privateKey, apiKey } = require('./secret.json');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "5777",
      websockets: true,
    },
    ropsten: {
      provider: () => new HDWalletProvider(privateKey, `https://ropsten.infura.io/v3/${apiKey}`),
      network_id: 3,       
      gas: 5000000,        
      gasPrice: 20000000000,
      networkCheckTimeout: 1000000,
      disableConfirmationListener: true,
      confirmations: 2,    
      timeoutBlocks: 50,
      skipDryRun: true 
    },
  },

  mocha: {
    timeout: 200000
  },

  compilers: {
    solc: {
      version: "0.5.16",
    }
  }
}
