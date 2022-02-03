const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = function (deployer, network, accounts) {

    const [owner, ...otherAccounts] = accounts
    let firstAirlineAddress = otherAccounts[0];
    let firstAirlineName = "Genesis Airlines";
    let firstAirlineCode = "GA01";
    deployer.deploy(FlightSuretyData, firstAirlineAddress, firstAirlineName, firstAirlineCode)
        .then(() => {
            deployer.link(FlightSuretyData, FlightSuretyApp);
            return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then(async () => {
                    flightSuretyData = await FlightSuretyData.deployed();
                    await flightSuretyData.authorizeCaller(FlightSuretyApp.address, { from: owner})
                    let config = {
                        localhost: {
                            url: 'http://localhost:8545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address,
                            otherAccounts: otherAccounts
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
                });
        });
}