import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'
import Config from './config.json'

export default class Contract {
    constructor(web3, network, callback) {

        let config = Config[network]
        this.web3 = web3
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress)
        this.initialize(callback)
        this.user = null
        this.airlines = []
        this.passengers = []
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accounts) => {
            this.user = accounts[0]
            let counter = 1
            while (this.airlines.length < 5) {
                this.airlines.push(accounts[counter++])
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accounts[counter++])
            }

            callback()
        })
    }

    isOperational(callback) {
        let self = this
        self.flightSuretyApp.methods.isOperational().call({ from: self.owner }, callback)
    }

    fetchFlightStatus(flight, callback) {
        let self = this
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.user }, (error, result) => {
                callback(error, payload)
            })
    }

    getAirlineFundDeposit(address, callback) {
        let self = this
        self.flightSuretyApp.methods.getAirlineFundDeposit(address).call(callback)
    }

    fundDeposit(callback) {
        let self = this
        let amount = this.web3.utils.toWei("10", "ether")
        self.flightSuretyApp.methods
            .fundDeposit()
            .send({ from: self.user, value: amount }, (error, result) => {
                callback(error, result)
            })
    }

    registerAirline(address, name, code, callback) {
        let self = this
        self.flightSuretyApp.methods
            .submitAirlineRegistration(address, name, code)
            .send({ from: self.user }, (error, result) => {
                callback(error, result)
            })
    }
}