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

## Contract interactions and Business logic

### Voting process and Airline registration

App contract functions:
- Airline registration and voting logic (API)

Due to the separation of concernes principle, the voting mechanisms are delegated 
entirely to the application contract. This choice has been made because of the possible
changes that the voting logic might require at scale. The data contract is meant to keep 
just the ledger for the registered votes and the respective voters, as this aspect will most 
probably stay unchanged at any point in time.

The voting process is implicitly enabled when an existing airline tries to submit a new
registration and the registration requirements are not met. The submission logic in the UI
should handle the two stages with some relevant messages.  


