# Project setup

## Installation

1. For this setup I've used **Ganache-cli** with 30 accounts, 1000 ETH and a fixed mnemonic and chain ID: \
`ganache-cli -a 30 -e 1000 --chainId 5777 -m "hockey ..."`

2. Run `npm install` for the package installations

3. The Truffle tests can be executed with `npm run test`

4. Contracts can be migrated with `npm run migrate`

5. The Front-end application can be launched with `npm run dapp`

6. The Back-end application can be launched with `npm run server`

7. In order to register some airlines and oracles use `npm run setup`

## Dependencies

Truffle v5.4.29 (core: 5.4.29) \
Solidity - 0.5.16 (solc-js) \
Node v14.16.0 \
Web3.js v1.5.3

## Contract interactions and Business logic

1. The oracles have to be persisted in a json file in order to provide the data for 
the server-side actions. So after the `setup` script, trigger this endpoint:
`http://localhost:3000/api?register=1`

![](https://github.com/zakhard90/udproj-4/blob/master/_screenshots/Oracles%20registered.PNG)

2. The first airline is registered on deploy. In the dApp client you can deposit 
funds with an airline account and register the demo flights in the "Register Airline" section

![](https://github.com/zakhard90/udproj-4/blob/master/_screenshots/Airline%20registration.PNG)

3. Only registered airlines can access the "Register Airline" section

![](https://github.com/zakhard90/udproj-4/blob/master/_screenshots/Not%20allowed.PNG)

4. The customers can fill the insurance purchasing form by clicking the cart icon 
in the flight table in the landing page

![](https://github.com/zakhard90/udproj-4/blob/master/_screenshots/Cart.PNG)

![](https://github.com/zakhard90/udproj-4/blob/master/_screenshots/Insurance%20payout%20-%201.PNG)

5. The "Flight Radar" section enables the oracle data fetching or forcing a delay

![](https://github.com/zakhard90/udproj-4/blob/master/_screenshots/Oracle%20request%20data.PNG)

6. At the end of the process, the airline can close the flight in the landing page.
Based on the flight status the insurance funds are credited to the insurees or 
claimed by the airline

![](https://github.com/zakhard90/udproj-4/blob/master/_screenshots/Close%20flight.PNG)

![](https://github.com/zakhard90/udproj-4/blob/master/_screenshots/Insurance%20payout%20-%202.PNG)

7. All the events can be inspected with "Show event log" button

![](https://github.com/zakhard90/udproj-4/blob/master/_screenshots/Event%20log.PNG)

### Voting process and Airline registration

Due to the separation of concernes principle, the voting mechanisms are delegated 
entirely to the application contract. This choice has been made because of the possible
changes that the voting logic might require at scale. The data contract is meant to keep 
just the ledger for the registered votes and the respective voters, as this aspect will most 
probably stay unchanged at any point in time.

The voting process is implicitly enabled when an existing airline tries to submit a new
registration and the registration requirements are not met. The submission logic in the UI
should handle the two stages with some relevant messages.  


