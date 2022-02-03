const BigNumber = require('bignumber.js');

const FlightSuretyApp = artifacts.require("FlightSuretyApp");

const ether = (n) => {
    return new web3.utils.BN(
        web3.utils.toWei(n.toString(), 'ether')
    )
}

const wait = (seconds) => {
    const milliseconds = seconds * 1000
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts()
        const [owner, ...otherAccounts] = accounts
        const flightSuretyApp = await FlightSuretyApp.deployed()

        let fundAmount = web3.utils.toWei('10', 'ether')
        let min = 2
        let max = 4

        let airlines = []
        for (let i = min; i <= max; i++) {
            airlines.push({
                address: accounts[i],
                name: "European Airlines",
                code: "EA0" + (i)
            })
        }

        let a = 0
        for (let i = min; i <= max; i++) {
            let fromAddress = accounts[i - 1]
            let newAirline = airlines[a]
            try {
                await flightSuretyApp.fundDeposit({ from: fromAddress, value: fundAmount })
                await flightSuretyApp.submitAirlineRegistration(newAirline.address, newAirline.name, newAirline.code, { from: fromAddress })
            } catch (e) {
                console.log(e)
            }
            a++
        }

        /* --------------------------- Oracle registration -------------------------- */

        let init = 9
        let numOracles = 20
        for (let i = init; i <= init + numOracles; i++) {
            let fee = await flightSuretyApp.REGISTRATION_FEE.call();
            let amount = BigNumber(fee).toNumber()
            try {
                await flightSuretyApp.registerOracle({ from: otherAccounts[i], value: BigNumber(fee).toNumber() });
            } catch (e) {
                console.log("Oracle not registered " + e)
            }
        }
    }
    catch (error) {
        console.log(error)
    }

    callback()
}