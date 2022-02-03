import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'
import Config from './config.json'
import DB from './db.js'
import Web3 from 'web3'
const config = Config['localhost']
let flip

let wsProvider = new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws'))
let web3 = new Web3(wsProvider)

web3.eth.defaultAccount = web3.eth.accounts[0]
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress)

const CODE_UNKNOWN = 0
const CODE_ON_TIME = 10
const CODE_LATE_AIRLINE = 20
const CODE_LATE_WEATHER = 30
const CODE_LATE_TECHNICAL = 40
const CODE_LATE_OTHER = 50
class Oracle {
  constructor(address, indexes) {
    this.address = address
    this.indexes = indexes
  }
}

flightSuretyApp.events.OracleRequest({
  fromBlock: 'latest'
}, function (error, result) {
  if (!error) {
    console.log(result)
  }
}).on("connected", function (subscriptionId) {
  console.log("Subscribed to OracleRequest")
}).on('data', function (event) {
  let data = event.returnValues
  let index = Number(data.index)
  let airline = data.airline
  let flight = data.flightCode
  let timestamp = data.timestamp
  consultOracles(index, airline, flight, timestamp)
})

const persistOracles = async () => {
  let events = await flightSuretyApp.getPastEvents('OracleRegistered', { fromBlock: 0, toBlock: 'latest' })
  for (let log of events) {
    let event = log.returnValues
    let address = event.oracle
    let indexes = [Number(event.index1), Number(event.index2), Number(event.index3)]
    let oracle = new Oracle(address, indexes)
    DB.persistOracle(oracle)
  }
}

const consultOracles = async (index, airline, flightCode, timestamp) => {
  let oracles = DB.fetchAllOracles().filter((oracle) => {
    return (oracle.indexes.includes(index))
  })
  let process = true
  for (let oracle of oracles) {
    if (process) {
      try {
        let status = evaluateStatus(flightCode)
        let oracleIndexes = await flightSuretyApp.methods.getMyIndexes().call({ from: oracle.address })
        if (oracleIndexes.includes(index + "")) {
          console.log(index, status, oracleIndexes)
          flightSuretyApp.methods.submitOracleResponse(
            index,
            airline,
            flightCode,
            timestamp,
            status
          ).send({ from: oracle.address }).then((res) => {
            // if (err) console.log(err)
            console.log(res)
          }).catch((error) => {
            process = false
            console.log(error)
          })
        }
      } catch (error) {
        console.log(error)
      }
    }
  }
}


const evaluateStatus = (flightCode) => {
  if (!flip) {
    flip = (Math.floor(Math.random(flightCode) * 4))
  }
  let status = flip < 1 ? CODE_ON_TIME : CODE_LATE_AIRLINE
  return status
}

const express = require('express')
const app = express()

app.get('/', (req, res) => res.send('Welcome to the FlightSurety dApp API. Go to "/api"'))

app.get('/api',
  (req, res) => {
    if (req.query.register == 1) { // ?register=1
      persistOracles()
      res.send('Registered oracles persisted to database')
    } else if (req.query.consult == 1) { // ?consult=1&index=4
      consultOracles(Number(req.query.index), "123", "123")
      res.send('Registered oracles consulted')
    } else {
      res.send('API available parameters: "register", "consult"')
    }
  }
)
export default app


