import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import DB from './db.js';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';
let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const CODE_UNKNOWN = 0;
const CODE_ON_TIME = 10;
const CODE_LATE_AIRLINE = 20;
const CODE_LATE_WEATHER = 30;
const CODE_LATE_TECHNICAL = 40;
const CODE_LATE_OTHER = 50;
class Oracle {
  constructor(address, indexes) {
    this._address = address
    this._indexes = indexes
  }
  evaluate(flightCode) {
    let seed = new Date().timestamp + flightCode
    let flip = (Math.floor(Math.random(seed) * 2))
    let rand = (Math.floor(Math.random() * 9))
    let status = flip * rand < 1 ? CODE_ON_TIME : CODE_LATE_AIRLINE

    console.log(flip * rand, status)
  }
}


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

flightSuretyApp.events.OracleRegistered({
  fromBlock: 'latest'
}, function (error, result) {
  if (!error) {
    console.log(result)
  }
}).on("connected", function (subscriptionId) {
  console.log(subscriptionId)
}).on('data', function (log) {
  let event = log.returnValues
  let address = event.oracle
  let indexes = [event.index1, oracle.index2, oracle.index3]
  let oracle = new Oracle(address, indexes)
  DB.persistOracle(oracle)
})

const express = require('express')
const app = express()

app.get('/', (req, res) => res.send('Welcome to the FlightSurety dApp API v1'))
app.get('/api',
  (req, res) => {
    let query = req.query;
    if (query["generateOracle"] !== undefined && query["generateOracle"] > 0) {
      let numOracles = query["generateOracle"]
      console.log(numOracles);
      for (let i = 0; i < numOracles && i < 10; i++) {
        flightSuretyApp.methods.REGISTRATION_FEE().call((error, result) => {
          
          flightSuretyApp.methods
            .registerOracle()
            .send({ from: config.otherAccounts[i], value: BigNumber(result).toNumber() }, (error, result) => {
              console.log(result)
            });
        });
      }
    }

    res.send('An API for use with your Dapp! ' + JSON.stringify(req.query))
  }
)
export default app;


