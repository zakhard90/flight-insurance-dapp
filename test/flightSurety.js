var Test = require('../config/testConfig.js')
var BigNumber = require('bignumber.js')
const { assert } = require('chai')
const Web3 = require('web3')

/* ---------------------- Pretty printer for event logs --------------------- */
function printEvents(events) {
    for (let i = 0; i < events.length; i++) {
        let contents = events[i].args
        let name = events[i].event
        // Removing redundant entries 
        for (var key in contents) {
            if (!isNaN(key) || key.indexOf("_") == 0)
                delete contents[key];
        }

        console.log(`${name} event #${i + 1}\n${JSON.stringify(contents, null, 4)}`)
    }
}

contract('Flight Surety Tests', async (accounts) => {

    var lastUsedAirline = -1
    var quorum = 4
    var config
    /* -------------------------------------------------------------------------- */
    /*                               Contract setup                               */
    /* -------------------------------------------------------------------------- */
    before('setup contract', async () => {
        config = await Test.Config(accounts)
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address, { from: config.owner })
    })
    /* -------------------------------------------------------------------------- */
    /*                                Event report                                */
    /* -------------------------------------------------------------------------- */
    after('view events', async () => {
        let dataEvents = await config.flightSuretyData.getPastEvents('allEvents', { fromBlock: 0, toBlock: 'latest' })
        let appEvents = await config.flightSuretyApp.getPastEvents('allEvents', { fromBlock: 0, toBlock: 'latest' })
        printEvents(dataEvents)
        printEvents(appEvents)
    })
    /* -------------------------------------------------------------------------- */
    /*                              Integration tests                             */
    /* -------------------------------------------------------------------------- */

    /* ------------------ Verify if the contract is operational ----------------- */
    it(`(basic) has correct initial isOperational() value`, async function () {
        let status = await config.flightSuretyApp.isOperational.call()
        assert.equal(status, true, "Incorrect initial operating status value")
    })

    /* --------- Verify if the calling contract is authorized correctly --------- */
    it(`(basic) has correctly authorized contract`, async function () {
        let isAuthorizedApp = await config.flightSuretyApp.isAuthorized.call({ from: config.owner })
        assert.equal(isAuthorizedApp, true, "Caller is not authorized")
    })

    /* ------------ The default airline shoud have the expected data ------------ */
    it(`(basic) has correct first airline data`, async function () {
        let { firstAirline } = config
        let airline = await config.flightSuretyApp.getAirlineInfo.call(firstAirline.address)
        assert.equal(airline.name, firstAirline.name, "Incorrect initial airline name")
        assert.equal(airline.code, firstAirline.code, "Incorrect initial airline code")
    })
    /* -------------------------------------------------------------------------- */
    /*                                 Multiparty                                 */
    /* -------------------------------------------------------------------------- */

    /* --- Verify if the registration is possible before the quorum is reached -- */
    it(`(multiparty) can register a new airline directly, below quorum value of ${quorum}`, async function () {
        let { firstAirline } = config

        let totalAirlines = await config.flightSuretyApp.getCountOperationalAirlines.call()
        totalAirlines = BigNumber(totalAirlines).toNumber()

        assert.isBelow(totalAirlines, quorum, "Total airline count is above quorum value")

        let min = 0
        let max = quorum - 1
        let amount = Web3.utils.toWei('10.1', 'ether');

        for (let i = min; i < max; i++) {
            let newAirline = config.otherAirlines[i]
            let fromAddress = i == 0 ? firstAirline.address : config.otherAirlines[i - 1].address
            await config.flightSuretyApp.fundDeposit({ from: fromAddress, value: amount })

            let deposit = await config.flightSuretyApp.getAirlineFundDeposit.call(fromAddress)
            assert.equal(BigNumber(deposit).toNumber(), amount, `Deposit for new airline ${i} incorrect`)

            await config.flightSuretyApp.submitAirlineRegistration(newAirline.address, newAirline.name, newAirline.code, { from: fromAddress })
            let airline = await config.flightSuretyApp.getAirlineInfo.call(newAirline.address)
            assert.equal(airline.name, newAirline.name, `Incorrect new airline ${i} name`)
            assert.equal(airline.code, newAirline.code, `Incorrect new airline ${i} code`)
            lastUsedAirline = i;
        }
    })

    /* ----- Verify if the voting rules are enforced after quorum is reached ---- */
    it(`(multiparty) can't register a new airline directly, above quorum value of ${quorum}`, async function () {
        let { firstAirline } = config
        let newAirline = config.otherAirlines[++lastUsedAirline]
        await config.flightSuretyApp.submitAirlineRegistration(newAirline.address, newAirline.name, newAirline.code, { from: firstAirline.address })
        let airline = await config.flightSuretyApp.getAirlineInfo.call(newAirline.address)
        assert.equal(airline.name, "", "Airline registered above quorum")
        let votes = await config.flightSuretyApp.getAirlineVotes.call(newAirline.address)
        assert.equal(BigNumber(votes).toNumber(), 1, "Airline votes not recorded")
    })

    /* -------- Verify that the votes are counted correctly in each round ------- */
    it(`(multiparty) can't vote twice for the same candidate`, async function () {
        let { firstAirline } = config
        let hasVoted
        let newAirline = config.otherAirlines[lastUsedAirline]
        try {
            await config.flightSuretyApp.submitAirlineRegistration(newAirline.address, newAirline.name, newAirline.code, { from: firstAirline.address })
            hasVoted = true;
        } catch (e) {
            hasVoted = false;
        }
        assert.equal(hasVoted, false, "Airline has voted twice")
        let votes = await config.flightSuretyApp.getAirlineVotes.call(newAirline.address)
        assert.equal(BigNumber(votes).toNumber(), 1, "Airline votes not recorded")
    })

    /* ------ Verify that the voting process succedes with a 50% consensus ------ */
    it(`(multiparty) can register a new airline through voting, above quorum value of ${quorum}`, async function () {

        let totalAirlines = await config.flightSuretyApp.getCountOperationalAirlines.call()
        totalAirlines = BigNumber(totalAirlines).toNumber()

        assert.isAtLeast(totalAirlines, quorum, "Total airline count is below quorum value")

        let min = 0
        let max = totalAirlines / 2 - 1 // required voters = 50% of total considering index of 0

        let newAirline = config.otherAirlines[lastUsedAirline]

        for (let i = min; i <= max; i++) {
            let fromAddress = config.otherAirlines[i].address
            await config.flightSuretyApp.submitAirlineRegistration(newAirline.address, newAirline.name, newAirline.code, { from: fromAddress })
            let airline = await config.flightSuretyApp.getAirlineInfo.call(newAirline.address)
            if (i == max) { // the last required voter registers the new airline
                assert.equal(airline.name, newAirline.name, `Incorrect new airline ${i} name`)
                assert.equal(airline.code, newAirline.code, `Incorrect new airline ${i} code`)
            } else { // the new airline isn't registered but the votes are incremented
                assert.equal(airline.name, "", "Airline registered above quorum")
                let votes = await config.flightSuretyApp.getAirlineVotes.call(newAirline.address)
                assert.equal(BigNumber(votes).toNumber(), i + 2, "Airline votes not recorded")
            }
        }
        let prevTotalAirlines = totalAirlines;
        totalAirlines = await config.flightSuretyApp.getCountOperationalAirlines.call();
        assert.equal(totalAirlines, prevTotalAirlines + 1, "The total number of registered airlines doesn't match the expected value")
    })

    /* ---------------- Verify the limitations for external users --------------- */
    it(`(admin) can block access to setOperational() for non-Contract Owner account`, async function () {

        let accessDenied = false
        try {
            await config.flightSuretyData.setOperational(false, { from: config.testAddresses[2] })
        }
        catch (e) {
            accessDenied = true
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner")
    })

    /* --------------------- Verify the access to the owner --------------------- */
    it(`(admin) can allow access to setOperational() for Contract Owner account`, async function () {

        let accessDenied = false
        try {
            await config.flightSuretyData.setOperational(false, { from: config.owner })
        }
        catch (e) {
            accessDenied = true
        }
        assert.equal(accessDenied, false, "Access restricted to Contract Owner")
    })

    /* --- Verify that the operational status is set correctly and is required -- */
    it(`(admin) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperational(false, { from: config.owner })
        let operational = await config.flightSuretyApp.isOperational.call({ from: config.owner })
        assert.equal(operational, false, "Contract data is operational but should not be")
        let reverted = false

        try {
            await config.flightSuretyData.setTestingMode(true, { from: config.owner })
        }
        catch (e) {
            reverted = true
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational")

        // Set it back for other tests to work
        await config.flightSuretyData.setOperational(true, { from: config.owner })
        operational = await config.flightSuretyApp.isOperational.call({ from: config.owner })
    })

    /* - Verify that the minimum funds have been deposited for the registration - */
    it(`(airline) cannot register an Airline using submitAirlineRegistration() if it is not funded`, async () => {

        // the last airline shouldn't have funds
        let lastAirline = config.otherAirlines[lastUsedAirline]
        // the new airline is the next available account
        let newAirline = config.otherAirlines[++lastUsedAirline]

        let rejected
        try {
            await config.flightSuretyApp.submitAirlineRegistration(newAirline.address, newAirline.name, newAirline.code, { from: lastAirline.address })
            rejected = false
        }
        catch (e) {
            rejected = true
        }

        assert.equal(rejected, true, "The registration hasn't been rejected with 0 funds")
        let result = await config.flightSuretyApp.isOperationalAirline.call(newAirline.address)
        assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding")

    })
    /* -------------------------------------------------------------------------- */
    /*                                   Flight                                   */
    /* -------------------------------------------------------------------------- */

    /* ------------------- Verify flight registration process ------------------- */
    it(`(flight) can register a new flight`, async () => {
        const { flights, otherAirlines } = config;
        let flight = flights[0]
        let airline = otherAirlines[1]

        let flightCode = web3.utils.soliditySha3(airline.address, flight.description, flight.timestamp)
        await config.flightSuretyApp.registerFlight(flight.description, flight.timestamp, { from: airline.address })
        let validFlight = await config.flightSuretyApp.isValidFlight(flightCode)
        assert.equal(validFlight, true, "Flight has not been registered")
    })

    /* -------------------------------------------------------------------------- */
    /*                                  Insurance                                 */
    /* -------------------------------------------------------------------------- */

    /* ------------------ Verify correct purchase functionality ----------------- */
    it(`(insurance) can purchase an insurance for a defined flight`, async () => {
        const { flights, otherAirlines } = config;
        let flight = flights[0]
        let airline = otherAirlines[1]
        let flightCode = web3.utils.soliditySha3(airline.address, flight.description, flight.timestamp)
        let amount = Web3.utils.toWei("0.5", "ether")
        let customer = config.customers[0]
        await config.flightSuretyApp.purchaseInsurance(airline.address, flightCode, { from: customer.address, value: amount })
        let premium = await config.flightSuretyApp.getCustomerInsurancePremium.call(airline.address, flightCode, customer.address)
        assert.equal(BigNumber(premium).toNumber(), amount, "The insurance purchase value doesn't match")
    })

    /* ------------------- Verify the maximum allowed purchase ------------------ */
    it(`(insurance) can purchase an insurance over the maximum value of ETH`, async () => {
        const { flights, otherAirlines } = config;
        let flight = flights[0]
        let airline = otherAirlines[1]
        let flightCode = web3.utils.soliditySha3(airline.address, flight.description, flight.timestamp)
        let max = Web3.utils.toWei("1", "ether")
        let amount = Web3.utils.toWei("1.5", "ether")
        let customer = config.customers[1]
        await config.flightSuretyApp.purchaseInsurance(airline.address, flightCode, { from: customer.address, value: amount })
        let premium = await config.flightSuretyApp.getCustomerInsurancePremium.call(airline.address, flightCode, customer.address)
        assert.equal(BigNumber(premium).toNumber(), max, "The insurance purchase doesn't match the max allowed value")
    })

    /* ------------ Verify credit functionality for a delayed flight ------------ */

    it(`(insurance) can credit the customers`, async () => {
        const { flights, otherAirlines } = config;
        let flight = flights[0]
        let airline = otherAirlines[1]
        let flightCode = web3.utils.soliditySha3(airline.address, flight.description, flight.timestamp)

        // setting the flight status to "CODE_LATE_AIRLINE"
        await config.flightSuretyApp.updateFlight(flightCode, (flight.timestamp + 3600), 20, { from: airline.address })

        let customer1 = config.customers[0]
        let customer2 = config.customers[1]

        let premiumBefore1 = await config.flightSuretyApp.getCustomerInsurancePremium.call(airline.address, flightCode, customer1.address)
        let premiumBefore2 = await config.flightSuretyApp.getCustomerInsurancePremium.call(airline.address, flightCode, customer2.address)

        // claim the insurance premiums or credit the customers based on the flight status code
        await config.flightSuretyApp.claimOrCredit(flightCode, { from: airline.address })
        let premiumAfter1 = await config.flightSuretyApp.getCustomerInsurancePremium.call(airline.address, flightCode, customer1.address)
        let premiumAfter2 = await config.flightSuretyApp.getCustomerInsurancePremium.call(airline.address, flightCode, customer2.address)

        assert.equal(BigNumber(premiumAfter1).toNumber(), 0, "The insurance premium hasn't been removed from the customer 1 balance")
        let payout1 = await config.flightSuretyApp.getCustomerInsurancePayout.call(customer1.address)
        let expectedPayout1 = premiumBefore1 * 1.5;
        assert.equal(BigNumber(payout1).toNumber(), expectedPayout1, "The insurance payout doesn't match the expected value for customer 1")

        assert.equal(BigNumber(premiumAfter2).toNumber(), 0, "The insurance premium hasn't been removed from the customer 2 balance")
        let payout2 = await config.flightSuretyApp.getCustomerInsurancePayout.call(customer2.address)
        let expectedPayout2 = premiumBefore2 * 1.5;
        assert.equal(BigNumber(payout2).toNumber(), expectedPayout2, "The insurance payout doesn't match the expected value for customer 2")
    })

    /* ------------------------ Verify payout withdrawal ------------------------ */
    it(`(insurance) can withdraw payout`, async () => {
        let customer = config.customers[1]
        let payoutBefore = await config.flightSuretyApp.getCustomerInsurancePayout.call(customer.address)
        let expectedPayout = Web3.utils.toWei("1.5", "ether");
        assert.equal(BigNumber(payoutBefore).toNumber(), BigNumber(expectedPayout).toNumber(), "The insurance payout doesn't match the expected value before withdrawal")
        await config.flightSuretyApp.withdrawInsurancePayout({ from: customer.address })
        let payoutAfter = await config.flightSuretyApp.getCustomerInsurancePayout.call(customer.address)
        assert.equal(BigNumber(payoutAfter).toNumber(), 0, "The insurance payout doesn't match the expected value after withdrawal")
    })

    /* ------------------------- Verify account security ------------------------ */
    it(`(insurance) can't steal payout from another account`, async () => {
        let victim = config.customers[0]
        let hacker = config.customers[1]
        let payoutBefore = await config.flightSuretyApp.getCustomerInsurancePayout.call(victim.address)
        let expectedPayout = Web3.utils.toWei("0.75", "ether");
        assert.equal(BigNumber(payoutBefore).toNumber(), BigNumber(expectedPayout).toNumber(), "The insurance payout doesn't match the expected value before withdrawal")

        let stolen
        try {
            await config.flightSuretyData.withdrawInsurancePayout(victim.address, { from: hacker.address })
            stolen = true
        } catch (e) {
            stolen = false
        }
        let payoutAfter = await config.flightSuretyApp.getCustomerInsurancePayout.call(victim.address)
        assert.equal(stolen, false, "The insurance payout has been stolen")
        assert.equal(BigNumber(payoutAfter).toNumber(), expectedPayout, "The insurance payout doesn't match the expected value after withdrawal")
    })

    /* ------------------------- Verify premium claiming ------------------------ */
    it(`(insurance) can purchase an insurance for another flight`, async () => {
        const { flights, otherAirlines } = config;
        let flight = flights[1]
        let airline = otherAirlines[0]
        let flightCode = web3.utils.soliditySha3(airline.address, flight.description, flight.timestamp)
        await config.flightSuretyApp.registerFlight(flight.description, flight.timestamp, { from: airline.address })
        let amount = Web3.utils.toWei("1", "ether")
        let customer = config.customers[2]
        await config.flightSuretyApp.purchaseInsurance(airline.address, flightCode, { from: customer.address, value: amount })
        let premium = await config.flightSuretyApp.getCustomerInsurancePremium.call(airline.address, flightCode, customer.address)
        assert.equal(BigNumber(premium).toNumber(), amount, "The insurance purchase value doesn't match the expected value before claiming")

        // setting the flight status to "CODE_LATE_WEATHER"
        await config.flightSuretyApp.updateFlight(flightCode, flight.timestamp, 30, { from: airline.address })

        // claim the insurance premiums or credit the customers based on the flight status code
        await config.flightSuretyApp.claimOrCredit(flightCode, { from: airline.address })

        premiumAfter = await config.flightSuretyApp.getCustomerInsurancePremium.call(airline.address, flightCode, customer.address)
        assert.equal(BigNumber(premiumAfter).toNumber(), 0, "The insurance purchase value doesn't match after claiming")

        let payout = await config.flightSuretyApp.getCustomerInsurancePayout.call(customer.address)
        assert.equal(BigNumber(payout).toNumber(), 0, "The insurance payout value doesn't match the expected value after claiming")
    })

})
