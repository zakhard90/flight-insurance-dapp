var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const { assert } = require('chai');

function printEvents(events) {
    for (let i = 0; i < events.length; i++) {
        console.log();
        console.log(`${events[i].event} event #${i + 1}:`);
        console.log(JSON.stringify(events[i].args, null, 4));
    }
}

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address, { from: config.owner });
    });

    after('view events', async () => {
        let events = await config.flightSuretyData.getPastEvents('allEvents', { fromBlock: 0, toBlock: 'latest' });
        console.log(config.flightSuretyApp.address, "FlightSuretyApp address");
        printEvents(events);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/
    it(`(multiparty) has correct initial isOperational() value`, async function () {
        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");
    });

    /// extra test
    it(`(multiparty) has correctly authorized contract`, async function () {
        // Get authorization value
        let isAuthorized = await config.flightSuretyData.isAuthorizedCaller(config.flightSuretyApp.address);
        assert.equal(isAuthorized, true, "Caller is not authorized");
    });

    /// extra test
    it(`(multiparty) has correct first airline data`, async function () {
        // Get operating status
        let { firstAirline } = config;
        let airline = await config.flightSuretyData.getAirlineInfo.call(firstAirline.address);
        assert.equal(airline.name, firstAirline.name, "Incorrect initial airline name");
        assert.equal(airline.code, firstAirline.code, "Incorrect initial airline code");
    });

    /// extra test
    it(`(multiparty) can register a new airline below quorum`, async function () {
        // Get operating status
        let [newAirline1, newAirline2] = config.otherAirlines;
        await config.flightSuretyData.registerAirline(newAirline1.address, newAirline1.name, newAirline1.code, { from: config.owner });
        let airline = await config.flightSuretyData.getAirlineInfo.call(newAirline1.address);
        assert.equal(airline.name, newAirline1.name, "Incorrect new airline name");
        assert.equal(airline.code, newAirline1.code, "Incorrect new airline code");
    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperational(false, { from: config.testAddresses[2] });
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperational(false, { from: config.owner });
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access restricted to Contract Owner");
    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperational(false, { from: config.owner });
        let operational = await config.flightSuretyData.isOperational.call({ from: config.owner });
        assert.equal(operational, false, "Contract data is operational but should not be");
        let reverted = false;

        try {
            await config.flightSuretyData.setTestingMode(true, { from: config.owner });
        }
        catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperational(true, { from: config.owner });
        operational = await config.flightSuretyApp.isOperational.call({ from: config.owner });
    });
/*

    /*
        it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
            // ARRANGE
            let newAirline = accounts[2];
    
            // ACT
            try {
                await config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline });
            }
            catch (e) {
    
            }
            let result = await config.flightSuretyData.isAirline.call(newAirline);
    
            // ASSERT
            assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
    
        });
    
    */
});
