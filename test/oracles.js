
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const Web3 = require('web3');
const { assert } = require('chai');

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 9;
  var config;

  // Watch contract events
  const CODE_UNKNOWN = 0;
  const CODE_ON_TIME = 10;
  const CODE_LATE_AIRLINE = 20;
  const CODE_LATE_WEATHER = 30;
  const CODE_LATE_TECHNICAL = 40;
  const CODE_LATE_OTHER = 50;

  before('setup contract', async () => {
    config = await Test.Config(accounts);
  });


  it('can register oracles', async () => {

    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: BigNumber(fee).toNumber() });
      let result = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('can request flight status', async () => {

    const { flights, firstAirline } = config;
    let flight = flights[0]
    let timestamp = Math.floor(Date.now() / 1000);
    let delay = 2700
    let fund = Web3.utils.toWei('10', 'ether');
    let flightCode = web3.utils.soliditySha3(firstAirline.address, flight.description, flight.timestamp)
    await config.flightSuretyApp.fundDeposit({ from: firstAirline.address, value: fund })
    await config.flightSuretyApp.registerFlight(flight.description, flight.timestamp, { from: firstAirline.address })

    // ARRANGE

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(firstAirline.address, flightCode, timestamp);

    let requestEvents = await config.flightSuretyApp.getPastEvents('OracleRequest', { fromBlock: 'latest' })
    let event = null
    if (requestEvents.length > 0) {
      event = requestEvents[0]
    }
    assert.notEqual(event, null, 'There was no OracleRequest event emitted')
    // ACT
    let targetIndex = Number(event.returnValues.index);

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    let counter = 0;
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });

      for (let idx = 0; idx < 3; idx++) {
        if (targetIndex === BigNumber(oracleIndexes[idx]).toNumber()) {
          try {
            await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline.address, flightCode, timestamp, CODE_ON_TIME, delay, { from: accounts[a] });
            // Submit a response...it will only be accepted if there is an Index match
            counter++;
          }
          catch (e) {
            // Enable this when debugging
            console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
          }
        }
      }
    }

    console.log(`${counter} submissions for index ${targetIndex}`)
    assert.isTrue(counter > 0, `No oracle was eligible for this submission with index ${targetIndex}`)


  });



});
