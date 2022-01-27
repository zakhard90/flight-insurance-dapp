// import DOM from './dom';
import Contract from './contract';
import Actions from './actions';
import Store from './store';
import './flightsurety.css';

(async () => {
    let result = null;
    let contract = new Contract('localhost', () => {
        contract.isOperational((error, result) => {
            Actions.display('Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: error, value: result }]);
        });
    });

    let button = document.getElementById('submit-oracle')
    Actions.bindEvent(button, "click", () => {
        let flight = document.getElementById('flight-number').value;
        contract.fetchFlightStatus(flight, (error, result) => {
            Actions.display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }]);
        });
    });

    let inputs = document.getElementsByTagName('input')

    Actions.recallValues(inputs, Store.fetchAllStates());

    Actions.bindEvent(inputs, "change", () => {
        for (let i = 0; i < inputs.length; i++) {
            Store.persistState(inputs[i].getAttribute('id'), inputs[i].value, i);
        }
    })

})();