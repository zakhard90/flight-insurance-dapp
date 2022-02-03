pragma solidity ^0.5.16;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /* -------------------------------------------------------------------------- */
    /*                               Main parameters                              */
    /* -------------------------------------------------------------------------- */

    bool private operational;
    bool private testing;
    address private contractOwner;
    mapping(address => uint256) private authorizedCallers;

    /* -------------------------------------------------------------------------- */
    /*                              Airline registry                              */
    /* -------------------------------------------------------------------------- */

    uint256 countOperationalAirlines = 0;
    uint256 countBlockedAirlines = 0;
    address[] public airlineRegistry;
    mapping(address => Airline) private airlines;

    /* -------------------------------------------------------------------------- */
    /*                               Flight registry                              */
    /* -------------------------------------------------------------------------- */

    mapping(bytes32 => Flight) private flights;
    mapping(bytes32 => bool) private flightInsuranceClosed;

    /* -------------------------------------------------------------------------- */
    /*                                Fund deposits                               */
    /* -------------------------------------------------------------------------- */

    uint256 private minimumFund;
    mapping(address => uint256) private airlineFundDeposits;

    /* -------------------------------------------------------------------------- */
    /*                                Voting system                               */
    /* -------------------------------------------------------------------------- */

    mapping(address => uint256) private airlineVotes;
    mapping(address => mapping(address => bool)) private airlineVoters;

    /* -------------------------------------------------------------------------- */
    /*                                  Insurance                                 */
    /* -------------------------------------------------------------------------- */

    uint256 maxInsurancePremium = 1 ether;
    mapping(address => mapping(bytes32 => address[])) private insuredAccounts;
    mapping(address => mapping(bytes32 => mapping(address => uint256)))
        private insuranceBalances;
    mapping(address => uint256) private insurancePayouts;

    /* -------------------------------------------------------------------------- */
    /*                                   Structs                                  */
    /* -------------------------------------------------------------------------- */

    struct Airline {
        bool isOperational;
        string name;
        string code;
    }

    struct Flight {
        address airline;
        bool isRegistered;
        uint8 statusCode;
        uint256 timestamp;
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Events                                   */
    /* -------------------------------------------------------------------------- */

    event CallerAuthorized(address caller);
    event CallerDeauthorized(address caller);

    event AirlineVoted(address airline, uint256 votes);
    event AirlineRegistered(address airline, string name, string code);
    event AirlineBlocked(address airline, string name, string code);

    event FlightRegistered(address airline, bytes32 code, uint256 timestamp);
    event FlightBlocked(address airline, bytes32 code);
    event FlightUpdated(
        bytes32 code,
        uint8 oldStatus,
        uint8 newStatus
    );

    event FundsDeposited(address airline, uint256 amount);
    event FundsWithdrawn(address airline, uint256 amount);

    event InsurancePurchased(
        address airline,
        bytes32 flightCode,
        address account,
        uint256 amount
    );

    event InsurancePayoutCredited(
        address airline,
        bytes32 flightCode,
        address account,
        uint256 amount
    );

    event InsurancePayoutWithdrawn(address account, uint256 amount);

    event InsurancePremiumClaimed(
        address airline,
        bytes32 flightCode,
        address account,
        uint256 amount
    );

    event ContractReceivedFunds(address account, uint256 amount);
    event ContractTransferedFunds(address account, uint256 amount);

    /* -------------------------------------------------------------------------- */
    /*                                 Constructor                                */
    /* -------------------------------------------------------------------------- */

    constructor(
        address firstAirline,
        string memory name,
        string memory code
    ) public {
        require(firstAirline != address(0));
        airlineRegistry.push(firstAirline);
        airlines[firstAirline] = Airline(true, name, code);
        countOperationalAirlines = countOperationalAirlines.add(1);
        operational = true;
        testing = false;
        minimumFund = 10 ether;
        contractOwner = msg.sender;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Modifiers                                 */
    /* -------------------------------------------------------------------------- */

    modifier requireIsOperational() {
        require(
            operational,
            "Contract is currently not set to operational state"
        );
        _;
    }

    modifier requireContractOwner() {
        require(
            msg.sender == contractOwner || tx.origin == contractOwner,
            "Caller is not contract owner"
        );
        _;
    }

    modifier requireIsCallerAuthorized() {
        require(
            authorizedCallers[msg.sender] == 1,
            "Caller is not authorized to perform this call"
        );
        _;
    }

    modifier requireDirectSender() {
        require(
            msg.sender == tx.origin,
            "Message sender is not the initiator of the transaction"
        );
        _;
    }

    modifier requireProxySender() {
        require(
            msg.sender != tx.origin,
            "Message sender is the initiator of the transaction"
        );
        _;
    }

    modifier requireValidAddress(address checkAddress) {
        require(
            checkAddress != address(0),
            "Input address cannot be undefined"
        );
        _;
    }

    modifier requireOperationalAirline(address airlineAddress) {
        require(
            isOperationalAirline(airlineAddress),
            "Caller is not an operational airline"
        );
        _;
    }
    modifier requireIsFirstVote(address airlineAddress, address voterAddress) {
        require(
            airlineVoters[airlineAddress][voterAddress] == false,
            "Caller has already voted for this airline"
        );
        _;
    }

    modifier requireMinimumFundsCovered(address airlineAddress) {
        require(
            isFundedAirline(airlineAddress),
            "Caller has not covered minimum required fund deposit"
        );
        _;
    }

    /* -------------------------------------------------------------------------- */
    /*                              Operational state                             */
    /* -------------------------------------------------------------------------- */

    function isOperational() external view returns (bool) {
        return operational;
    }

    function setOperational(bool mode) external requireContractOwner {
        operational = mode;
    }

    /* -------------------------------------------------------------------------- */
    /*                                Testing mode                                */
    /* -------------------------------------------------------------------------- */

    function isTestingMode() external view returns (bool) {
        return testing;
    }

    function setTestingMode(bool mode)
        external
        requireContractOwner
        requireIsOperational
        requireDirectSender
    {
        require(testing != mode);
        testing = mode;
    }

    /* -------------------------------------------------------------------------- */
    /*                               Funding values                               */
    /* -------------------------------------------------------------------------- */

    function setMinimumFunds(uint256 amount)
        public
        requireContractOwner
        requireIsOperational
    {
        require(amount > 0);
        minimumFund = amount;
    }

    /* -------------------------------------------------------------------------- */
    /*                                Authorization                               */
    /* -------------------------------------------------------------------------- */

    function isAuthorized() external view requireProxySender returns (bool) {
        return authorizedCallers[msg.sender] == 1;
    }

    function isAuthorizedCaller(address callerAddress)
        public
        view
        returns (bool)
    {
        return authorizedCallers[callerAddress] == 1;
    }

    function authorizeCaller(address contractAddress)
        external
        requireContractOwner
        requireDirectSender
        requireValidAddress(contractAddress)
    {
        authorizedCallers[contractAddress] = 1;
        emit CallerAuthorized(contractAddress);
    }

    function deauthorizeCaller(address contractAddress)
        external
        requireContractOwner
        requireDirectSender
        requireValidAddress(contractAddress)
    {
        delete authorizedCallers[contractAddress];
        emit CallerDeauthorized(contractAddress);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Airline management                             */
    /* -------------------------------------------------------------------------- */

    function registerAirline(
        address airlineAddress,
        string calldata name,
        string calldata code,
        address proponentAddress
    )
        external
        requireIsOperational
        requireIsCallerAuthorized
        requireOperationalAirline(proponentAddress)
        requireMinimumFundsCovered(proponentAddress)
    {
        require(bytes(airlines[airlineAddress].name).length == 0);

        airlineRegistry.push(airlineAddress);
        airlines[airlineAddress] = Airline(true, name, code);
        countOperationalAirlines = countOperationalAirlines.add(1);
        emit AirlineRegistered(airlineAddress, name, code);
    }

    function voteAirline(address airlineAddress, address voterAddress)
        external
        requireIsOperational
        requireIsCallerAuthorized
        requireProxySender
        requireIsFirstVote(airlineAddress,voterAddress)
        requireOperationalAirline(voterAddress)
        requireMinimumFundsCovered(voterAddress)
    {
        airlineVoters[airlineAddress][voterAddress] = true;
        airlineVotes[airlineAddress] = airlineVotes[airlineAddress].add(1);
        emit AirlineVoted(airlineAddress, airlineVotes[airlineAddress]);
    }

    function getAirlineVotes(address airlineAddress)
        external
        view
        returns (uint256)
    {
        return airlineVotes[airlineAddress];
    }

    function isOperationalAirline(address airlineAddress)
        public
        view
        returns (bool registered)
    {
        return (airlines[airlineAddress].isOperational);
    }

    function isFundedAirline(address airlineAddress)
        public
        view
        returns (bool funded)
    {
        return airlineFundDeposits[airlineAddress] >= minimumFund;
    }

    function getAirlineFundDeposit(address airlineAddress)
        external
        view
        returns (uint256 deposit)
    {
        return airlineFundDeposits[airlineAddress];
    }

    function isCompliantAirline(address airlineAddress)
        external
        view
        returns (bool compliant)
    {
        return
            isOperationalAirline(airlineAddress) &&
            isFundedAirline(airlineAddress);
    }

    function getAirlineInfo(address airlineAddress)
        external
        view
        returns (string memory name, string memory code)
    {
        Airline memory a = airlines[airlineAddress];
        return (a.name, a.code);
    }

    function getCountOperationalAirlines() external view returns (uint256) {
        return countOperationalAirlines;
    }

    function getAirlineCount() public view returns (uint256) {
        return airlineRegistry.length;
    }

    function getAirlineFunds(address airlineAddress)
        public
        view
        returns (uint256)
    {
        return airlineFundDeposits[airlineAddress];
    }

    function fundDeposit(address airline, uint256 amount)
        external
        requireIsOperational
        requireProxySender
        requireIsCallerAuthorized
        requireValidAddress(airline)
    {
        airlineFundDeposits[airline] = airlineFundDeposits[airline].add(amount);
        emit FundsDeposited(airline, amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                              Flight management                             */
    /* -------------------------------------------------------------------------- */

    function registerFlight(
        address airline,
        bytes32 flightCode,
        uint256 timestamp
    )
        external
        requireIsOperational
        requireProxySender
        requireIsCallerAuthorized
    {
        require(flights[flightCode].airline == address(0));
        flights[flightCode] = Flight(airline, true, 0, timestamp);
        emit FlightRegistered(airline, flightCode, timestamp);
    }

    function updateFlight(
        bytes32 flightCode,
        uint8 status
    )
        external
        requireIsOperational
        requireProxySender
        requireIsCallerAuthorized
    {
        require(flights[flightCode].airline != address(0));
        uint8 oldStatus = flights[flightCode].statusCode;
        flights[flightCode].statusCode = status;

        emit FlightUpdated(
            flightCode,
            oldStatus,
            status
        );
    }

    function getFlightStatus(bytes32 flightCode) external view returns (uint8) {
        return (flights[flightCode].statusCode);
    }

    function isValidFlightCode(bytes32 flightCode)
        external
        view
        returns (bool valid)
    {
        return flights[flightCode].isRegistered == true;
    }

    function isOpenFlight(bytes32 flightCode)
        external
        view
        returns (bool valid)
    {
        return
            flights[flightCode].timestamp > now &&
            flightInsuranceClosed[flightCode] == false;
    }

    /* -------------------------------------------------------------------------- */
    /*                            Insurance management                            */
    /* -------------------------------------------------------------------------- */

    function getMaxInsurancePremium() external view returns (uint256 max) {
        return maxInsurancePremium;
    }

    function getCustomerInsurancePremium(
        address airline,
        bytes32 flightCode,
        address account
    ) external view returns (uint256 premium) {
        return (insuranceBalances[airline][flightCode][account]);
    }

    function getCustomerInsurancePayout(address account)
        external
        view
        returns (uint256 payout)
    {
        return (insurancePayouts[account]);
    }

    function purchaseInsurance(
        address airline,
        bytes32 flightCode,
        address customer,
        uint256 amount
    )
        external
        requireIsOperational
        requireProxySender
        requireIsCallerAuthorized
        requireValidAddress(airline)
    {
        insuredAccounts[airline][flightCode].push(customer);
        uint256 oldBalance = insuranceBalances[airline][flightCode][customer];
        uint256 newBalance = oldBalance.add(amount);
        insuranceBalances[airline][flightCode][customer] = newBalance;
        emit InsurancePurchased(airline, flightCode, customer, amount);
    }

    function creditInsuree(
        address airline,
        bytes32 flightCode,
        address account
    ) internal {
        require(insuranceBalances[airline][flightCode][account] > 0);
        uint256 premium = insuranceBalances[airline][flightCode][account];
        uint256 credit = premium.div(2).mul(3);
        insuranceBalances[airline][flightCode][account] = 0;
        insurancePayouts[account] = credit;
        emit InsurancePayoutCredited(airline, flightCode, account, credit);
    }

    function creditInsurees(address airline, bytes32 flightCode)
        external
        requireIsOperational
        requireProxySender
        requireIsCallerAuthorized
    {
        require(insuredAccounts[airline][flightCode].length > 0);
        address[] storage accounts = insuredAccounts[airline][flightCode];
        for (uint256 a = 0; a < accounts.length; a++) {
            creditInsuree(airline, flightCode, accounts[a]);
        }
        flightInsuranceClosed[flightCode] = true;
    }

    function claimPremium(
        address airline,
        bytes32 flightCode,
        address account
    ) internal requireOperationalAirline(airline) {
        require(insuranceBalances[airline][flightCode][account] > 0);
        uint256 premium = insuranceBalances[airline][flightCode][account];
        insuranceBalances[airline][flightCode][account] = 0;
        emit InsurancePremiumClaimed(airline, flightCode, account, premium);
    }

    function claimPremiums(address airline, bytes32 flightCode)
        external
        requireIsOperational
        requireProxySender
        requireIsCallerAuthorized
    {
        require(insuredAccounts[airline][flightCode].length > 0);
        address[] storage accounts = insuredAccounts[airline][flightCode];
        for (uint256 a = 0; a < accounts.length; a++) {
            claimPremium(airline, flightCode, accounts[a]);
        }
        flightInsuranceClosed[flightCode] = true;
    }

    function withdrawInsurancePayout(address payable account)
        external
        requireIsOperational
        requireProxySender
        requireIsCallerAuthorized
    {
        require(insurancePayouts[account] > 0);
        uint256 payout = insurancePayouts[account];
        insurancePayouts[account] = 0;
        account.transfer(payout);
        emit InsurancePayoutWithdrawn(account, payout);
    }

    function fund() private {
        if (msg.value > 0) {
            emit ContractReceivedFunds(tx.origin, msg.value);
        }
    }

    function() external payable {
        fund();
    }
}
