import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);


flightSuretyApp.events.OracleRequest({
  fromBlock: 'latest'
}, function (error, result) {
  if (!error) {
    console.log(result)
  }
}).on("connected", function (subscriptionId) {
  console.log(subscriptionId)
}).on('data', function (event) {
  console.log(event)
})

const express = require('express')
const app = express()
console.log(flightSuretyApp.options)


app.get('/', (req, res) => res.send('Welcome to the FlightSurety dApp API v1'))
app.get('/api',
  (req, res) => {
    res.send('An API for use with your Dapp!')
  }
)
export default app;


