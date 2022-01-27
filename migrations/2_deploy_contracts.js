const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = function (deployer, network, accounts) {

    let firstAirlineAddress = accounts[1];
    let firstAirlineName = "Genesis Airlines";
    let firstAirlineCode = "GA01";
    deployer.deploy(FlightSuretyData, firstAirlineAddress, firstAirlineName, firstAirlineCode)
        .then(() => {
            deployer.link(FlightSuretyData, FlightSuretyApp);
            return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then(() => {
                    let config = {
                        localhost: {
                            url: 'http://localhost:7545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
                });
        });
}