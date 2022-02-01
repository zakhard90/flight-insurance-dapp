import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json'
import Config from './config.json'

export default class Contract {
    constructor(web3, network, callback) {

        let config = Config[network]
        this.web3 = web3
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress)
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress)
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
            airline: flight.airline,
            flight: flight.code,
            timestamp: Math.floor(Date.now() / 1000)
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(flight.airline, flight.code, payload.timestamp)
            .send({ from: self.user }, (error, result) => {
                callback(error, payload)
            })
    }

    getFlightStatus(flight, callback) {
        let self = this
        self.flightSuretyApp.methods
            .getFlightStatus(flight)
            .call((error, result) => {
                callback(error, result)
            })
    }

    isOperationalAirline(callback) {
        let self = this
        self.flightSuretyApp.methods.isOperationalAirline(self.user).call(callback)
    }

    getAirlineFundDeposit(address, callback) {
        let self = this
        self.flightSuretyApp.methods.getAirlineFundDeposit(address).call(callback)
    }

    getCustomerPayoutBalance(address, callback) {
        let self = this
        self.flightSuretyApp.methods.getCustomerInsurancePayout(address).call(callback)
    }

    getAirlineData(address, callback) {
        let self = this
        self.flightSuretyApp.methods.getAirlineInfo(address).call(callback)
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

    registerFlights(callback) {
        let self = this
        let flights = [
            {
                description: "Kyiv - Stockholm",
                scheduled: "Monday, February 28, 2022 1:50:00 PM",
                timestamp: 1646056200
            }, {
                description: "London - Berlin",
                scheduled: "Tuesday, March 1, 2022 9:00:00 AM",
                timestamp: 1646125200
            }, {
                description: "Milan - Tokyo",
                scheduled: "Thursday, March 10, 2022 5:00:00 PM",
                timestamp: 1646931600
            }, {
                description: "Rome - New York",
                scheduled: "Sunday, March 13, 2022 3:20:00 PM",
                timestamp: 1647184800
            }
        ]

        let i = 1
        for (let flight of flights) {
            let flightRecord = { ...flight }
            let flightCode = this.web3.utils.soliditySha3(self.user, flight.description, flight.timestamp)
            flightRecord.airline = self.user
            flightRecord.code = flightCode
            self.flightSuretyApp.methods
                .registerFlight(flight.description, flight.timestamp)
                .send({ from: self.user }, (error, result) => {
                    callback(flightRecord, Object.keys(flights).length == i++, error, result)
                })
        }
    }

    purchaseInsurance(airline, flight, amount, callback) {
        let self = this
        amount = self.web3.utils.toWei(amount.toString(), "ether")
        self.flightSuretyApp.methods
            .purchaseInsurance(airline, flight)
            .send({ from: self.user, value: amount }, (error, result) => {
                callback(error, result)
            })
    }

    withdrawPayout(flight, callback) {
        let self = this
        self.flightSuretyApp.methods
            .withdrawInsurancePayout()
            .send({ from: self.user }, (error, result) => {
                callback(error, result)
            })
    }

    closeFlight(flight, callback) {
        let self = this
        self.flightSuretyApp.methods
            .claimOrCredit(flight)
            .send({ from: self.user }, (error, result) => {
                callback(error, result)
            })
    }

    async getAllEvents(filterType, filterAccount, callback) {
        let self = this

        let allEvents = []
        let eventsData = await self.flightSuretyData
            .getPastEvents('allEvents', { fromBlock: 0, toBlock: 'latest' })
            .then((results) => {
                return results
            });
        let eventsApp = await self.flightSuretyApp
            .getPastEvents('allEvents', { fromBlock: 0, toBlock: 'latest' })
            .then((results) => {
                return results
            });
        allEvents = [...eventsData, ...eventsApp]
        let logs = []
        console.log(allEvents);
        for (let i = 0; i < allEvents.length; i++) {
            let event = allEvents[i]
            let contents = event.returnValues
            let name = event.event
            if (filterType.length === 0 || filterType.includes(name)) {
                if (filterAccount.length === 0 || filterAccount.includes(contents.account)) {
                    for (var key in contents) {
                        if (!isNaN(key) || key.indexOf("_") == 0)
                            delete contents[key];
                    }
                    if (contents.amount !== undefined) {
                        contents.eth = self.web3.utils.fromWei(contents.amount, "ether")
                    }
                    contents.name = name
                    logs.push(contents)
                }
            }
        }
        callback(logs)

    }

    delayFlight(flightCode, flightTimestamp, callback) {
        let self = this
        self.flightSuretyApp.methods
            .updateFlight(flightCode, (flightTimestamp + 3600), 20)
            .send({ from: self.user }, (error, result) => {
                callback(error, result)
            })
    }

}