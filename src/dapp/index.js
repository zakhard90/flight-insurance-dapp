// import DOM from './dom';
import Contract from './contract';
import UI from './ui';
import Store from './store';
import './flightsurety.css';
import Web3 from 'web3';

(async () => {
    let result = null;
    let contract = null;
    let inputs = document.getElementsByTagName('input')

    UI.recallValues(inputs, Store.fetchAllStates())

    UI.bindEvent(inputs, "change", () => {
        for (let i = 0; i < inputs.length; i++) {
            Store.persistState(inputs[i].getAttribute('id'), inputs[i].value, i)
        }
    })

    let links = document.querySelectorAll('[data-link]');
    UI.bindEvent(links, "click", (event, el) => {
        event.preventDefault();
        let target = event.target.getAttribute("data-link")
        UI.showSection(target)
        console.log("Click link " + target)
    });

    const enableWallet = async () => {
        if (window.ethereum) {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            contract = new Contract(new Web3(window.ethereum), 'localhost', () => {
                contract.isOperational((error, status) => {
                    UI.heartbeat('Operational Status', status, error)
                });
                contract.getAirlineFundDeposit(contract.user, (error, amount) => {
                    console.log(amount)
                    let depositValue = document.getElementById("deposit")
                    depositValue.innerText = amount

                });
            });
            await window.ethereum.enable()
            UI.setWalletEnabled(true)
        } else {
            UI.setWalletEnabled(false)
        }
    }

    enableWallet();

    let connectWallet = document.getElementById('connect-wallet')
    UI.bindEvent(connectWallet, "click", () => {
        enableWallet();
    })


    let buttonAirlineReg = document.getElementById('submit-airline')
    UI.bindEvent(buttonAirlineReg, "click", () => {
        let address = document.getElementById('airline-address').value
        let name = document.getElementById('airline-name').value
        let code = document.getElementById('airline-code').value
        contract.registerAirline(address, name, code, (error, result) => {
            console.log("registerAirline " + result);
            // UI.display('Airlines', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }]);
        })
    });

    let buttonFunds = document.getElementById('deposit-funds')
    UI.bindEvent(buttonFunds, "click", () => {
        contract.fundDeposit((error, result) => {
            console.log("depositFunds " + result);
            // UI.display('Airlines', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }]);
        })
    });

    let buttonOracles = document.getElementById('submit-oracle')
    UI.bindEvent(buttonOracles, "click", () => {
        let flight = document.getElementById('flight-number').value
        contract.fetchFlightStatus(flight, (error, result) => {
            UI.display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }])
        })
    });


})();