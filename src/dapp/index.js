// import DOM from './dom';
import Contract from './contract';
import UI from './ui';
import Store from './store';
import './flightsurety.css';
import Web3 from 'web3';


(async () => {
    const REFRESH_TIME = 3000
    let result = null;
    let amount = 0;
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
        let navlink = document.querySelectorAll(".nav-link.active")[0]
        if (navlink != null) {
            navlink.classList.remove("active")
        }
        event.target.classList.add("active")
    });

    const enableWallet = async () => {
        if (window.ethereum) {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            contract = new Contract(new Web3(window.ethereum), 'localhost', () => {
                contract.isOperational((error, status) => {
                    UI.heartbeat('Operational Status', status, error)
                });

                const displayHeartbeat = () => {
                    console.log("displayHeartbeat")
                    setTimeout(function () {
                        contract.isOperational((error, status) => {
                            UI.heartbeat('Operational Status', status, error)
                        });
                    }, REFRESH_TIME);
                }

                displayHeartbeat()


                contract.isOperationalAirline(async (error, result) => {
                    if (result) {
                        contract.getAirlineFundDeposit(contract.user, (error, amount) => {
                            amount = Web3.utils.fromWei(amount.toString(), "ether")
                            let depositValue = document.getElementById("deposit")
                            depositValue.innerText = amount
                        })
                        contract.getAirlineData(contract.user, (error, result) => {
                            let airlineName = document.getElementById("current-airline-name")
                            airlineName.innerText = result.name

                            let airlineCode = document.getElementById("current-airline-code")
                            airlineCode.innerText = result.code
                        })
                    } else {
                        let box = document.getElementById("airlines")
                        box.innerHTML = "<h2>Access not allowed</h2><h6>Available only for registered airlines</h6>"
                    }
                    contract.getCustomerPayoutBalance(contract.user, (error, amount) => {

                        if (amount > 0) {
                            amount = Web3.utils.fromWei(amount.toString(), "ether")
                            let balanceValue = document.getElementById("payout-balance")
                            balanceValue.innerText = amount
                            let withdrawPayouts = document.getElementById("withdraw-payouts")
                            withdrawPayouts.classList.remove("d-none")
                        }
                    })
                })

                UI.userAddress(contract.user)

                UI.displayFlightList(Store.fetchAllFlights(), contract.user, (flights) => {
                    for (let f in flights) {
                        let flight = flights[f]
                        contract.getFlightStatus(flight.code, (error, status) => {
                            let row = document.getElementById(flight.code)
                            if (status === "20") {
                                row.classList.add("text-danger")
                                if (contract.user === flight.airline) {
                                    UI.addCloseFlightButton(flight.code, row)
                                }
                            }
                        })
                    }
                    let buyButtons = document.querySelectorAll('.btn.js-buy')
                    UI.bindEvent(buyButtons, "click", (event) => {
                        event.preventDefault()
                        let target = event.target
                        if (event.target !== event.currentTarget) {
                            target = event.currentTarget
                        }
                        let airline = target.getAttribute("data-airline")
                        let flight = target.getAttribute("data-code")
                        UI.setInsuranceFields(airline, flight)
                    })
                    let closeButtons = document.querySelectorAll('.btn.js-close')
                    UI.bindEvent(closeButtons, "click", (event) => {
                        event.preventDefault()
                        let target = event.target
                        if (event.target !== event.currentTarget) {
                            target = event.currentTarget
                        }
                        let flight = target.getAttribute("data-code")
                        contract.closeFlight(flight)
                    })
                })

                contract.getAllEvents(["InsurancePurchased", "InsurancePayoutCredited"], [contract.user], (events) => {
                    UI.displayPremiumList(events, Store.fetchAllFlights(), () => {
                        if (events.length > 0) {
                            let transactions = document.querySelectorAll('.js-transactions')
                            transactions[0].classList.remove('d-none')
                        }
                    })
                })

                const displayEvents = () => {
                    setTimeout(function () {
                        console.log("displayEvents")
                        contract.getAllEvents([], [], (events) => {
                            UI.displayEventList(events, () => {
                                displayEvents();
                            })
                        })
                    }, REFRESH_TIME);
                }

                displayEvents();


                let showEvents = document.getElementById('show-events')
                UI.bindEvent(showEvents, "click", (event) => {
                    event.preventDefault()
                    let eventWrapper = document.getElementById('events-wrapper')
                    if (eventWrapper.classList.contains('d-none')) {
                        eventWrapper.classList.remove('d-none')
                        showEvents.innerText = "Hide event log"
                    } else {
                        eventWrapper.classList.add('d-none')
                        showEvents.innerText = "Show event log"
                    }
                })

                let cacheClear = document.getElementById('cache-clear')
                UI.bindEvent(cacheClear, "click", (event) => {
                    event.preventDefault()
                    UI.clearCache()
                })

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
    })

    let buttonFunds = document.getElementById('deposit-funds')
    UI.bindEvent(buttonFunds, "click", () => {
        contract.fundDeposit((error, result) => {
            console.log("depositFunds " + result);
        })
    })

    let buttonFlights = document.getElementById('register-flights')
    UI.bindEvent(buttonFlights, "click", () => {
        contract.registerFlights((flightRecord, isLast, error, result) => {
            Store.persistFlight(flightRecord.code, flightRecord)
            if (isLast) {
                location.reload();
            }
        });
    })

    let buttonOracles = document.getElementById('submit-oracle')
    UI.bindEvent(buttonOracles, "click", () => {
        let flightCode = document.getElementById('flight-number').value
        let flight = Store.fetchFlight(flightCode)

        contract.fetchFlightStatus(flight, (error, result) => {
            UI.display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }])
        })
    })

    let buttonDelay = document.getElementById('delay-flight')
    UI.bindEvent(buttonDelay, "click", () => {
        let flightCode = document.getElementById('flight-number').value
        contract.delayFlight(flightCode, 3000, (error, result) => {

        })
    })

    let buttonInsurancePurchase = document.getElementById('submit-insurance')
    UI.bindEvent(buttonInsurancePurchase, "click", () => {
        let address = document.getElementById('insurance-airline').value
        let flight = document.getElementById('insurance-flight').value
        let amount = document.getElementById('insurance-amount').value
        contract.purchaseInsurance(address, flight, amount, (error, result) => {
            console.log("purchaseInsurance " + result);
        })
    })

    let buttonWithdrawPayout = document.getElementById('withdraw-payouts')
    UI.bindEvent(buttonWithdrawPayout, "click", () => {
        contract.withdrawPayout((error, result) => {
            console.log("withdrawPayout " + result);
        })
    })

})();