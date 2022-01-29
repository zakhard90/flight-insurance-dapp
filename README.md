# Project setup

## Installation

## Dependencies

## Contract interactions and Business logic

### Voting process and Airline registration

Due to the separation of concernes principle, the voting mechanisms are delegated 
entirely to the application contract. This choice has been made because of the possible
changes that the voting logic might require at scale. The data contract is meant to keep 
just the ledger for the registered votes and the respective voters, as this aspect will most 
probably stay unchanged at any point in time.

The voting process is implicitly enabled when an existing airline tries to submit a new
registration and the registration requirements are not met. The submission logic in the UI
should handle the two stages with some relevant messages.  


