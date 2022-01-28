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

    mapping(address => mapping(bytes32 => address[])) private insuredAccounts;
    mapping(address => mapping(bytes32 => mapping(address => uint256)))
        private insuranceBalances;
    mapping(address => uint256) private insurancePayouts;

    /* -------------------------------------------------------------------------- */
    /*                                   Structs                                  */
    /* -------------------------------------------------------------------------- */

    struct Airline {
        address id;
        bool isOperational;
        string name;
        string code;
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Events                                   */
    /* -------------------------------------------------------------------------- */

    event CallerAuthorized(address caller);
    event CallerDeauthorized(address caller);

    event AirlineVoted(address airline, uint256 votes);
    event AirlineRegistered(address airline, string name, string code);
    event AirlineBlocked(address airline, string name, string code);

    event FundsDeposited(address airline, uint256 amount);
    event FundsWithdrawn(address airline, uint256 amount);

    event InsurancePurchased(
        address airline,
        bytes32 flight,
        address account,
        uint256 amount
    );

    event InsurancePayoutCredited(
        address airline,
        bytes32 flight,
        address account,
        uint256 amount
    );

    event InsurancePayoutWithdrawn(address account, uint256 amount);

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
        airlines[firstAirline] = Airline(firstAirline, true, name, code);
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
            isOperationalAirline(tx.origin),
            "Caller is not an operational airline"
        );
        _;
    }
    modifier requireIsFirstVote(address airlineAddress) {
        require(
            airlineVoters[airlineAddress][tx.origin] == false,
            "Caller has already voted for this airline"
        );
        _;
    }

    modifier requireMinimumFundsCovered(address airlineAddress) {
        require(
            airlineFundDeposits[airlineAddress] >= minimumFund,
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
    {
        require(testing != mode);
        testing = mode;
    }

    /* -------------------------------------------------------------------------- */
    /*                               Funding values                               */
    /* -------------------------------------------------------------------------- */

    function setMinimumFunds(uint256 amount) public requireContractOwner {
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
        requireValidAddress(contractAddress)
    {
        authorizedCallers[contractAddress] = 1;
        emit CallerAuthorized(contractAddress);
    }

    function deauthorizeCaller(address contractAddress)
        external
        requireContractOwner
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
        string calldata code
    )
        external
        requireIsOperational
        requireIsCallerAuthorized
        requireOperationalAirline(tx.origin)
        requireMinimumFundsCovered(tx.origin)
    {
        require(bytes(airlines[airlineAddress].name).length == 0);

        airlineRegistry.push(airlineAddress);
        airlines[airlineAddress] = Airline(airlineAddress, true, name, code);
        countOperationalAirlines = countOperationalAirlines.add(1);
        emit AirlineRegistered(airlineAddress, name, code);
    }

    function voteAirline(address airlineAddress)
        external
        requireIsOperational
        requireIsCallerAuthorized
        requireIsFirstVote(airlineAddress)
        requireOperationalAirline(tx.origin)
        requireMinimumFundsCovered(tx.origin)
    {
        airlineVoters[airlineAddress][tx.origin] = true;
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

    function blockAirline(address airlineAddress)
        external
        requireIsOperational
        requireIsCallerAuthorized
        requireValidAddress(airlineAddress)
        requireMinimumFundsCovered(tx.origin)
    {
        require(bytes(airlines[airlineAddress].name).length > 0);
        require(countOperationalAirlines > 0);

        airlines[airlineAddress].isOperational = false;
        countOperationalAirlines = countOperationalAirlines.sub(1);
        countBlockedAirlines = countBlockedAirlines.add(1);
        emit AirlineBlocked(
            airlineAddress,
            airlines[airlineAddress].name,
            airlines[airlineAddress].code
        );
    }

    function isOperationalAirline(address airlineAddress)
        public
        view
        returns (bool registered)
    {
        return (airlines[airlineAddress].isOperational);
    }

    function getAirlineInfo(address airlineAddress)
        public
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

    function fundDeposit()
        public
        payable
        requireIsOperational
        requireDirectSender
    {
        require(
            msg.value >= minimumFund,
            "Funds are not enough for the deposit"
        );

        airlineFundDeposits[msg.sender] = msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }

    /* -------------------------------------------------------------------------- */
    /*                            Insurance management                            */
    /* -------------------------------------------------------------------------- */

    function purchaseInsurance(address airline, bytes32 flight)
        external
        payable
        requireIsOperational
        requireProxySender
        requireIsCallerAuthorized
    {
        insuredAccounts[airline][flight].push(tx.origin);
        uint256 newBalance = insuranceBalances[airline][flight][tx.origin].add(
            msg.value
        );
        insuranceBalances[airline][flight][tx.origin] = newBalance;
        emit InsurancePurchased(airline, flight, tx.origin, msg.value);
    }

    function creditInsuree(bytes32 flight, address account) internal {
        require(insuranceBalances[tx.origin][flight][account] > 0);
        uint256 premium = insuranceBalances[tx.origin][flight][account];
        uint256 credit = premium.div(2).mul(3);
        insuranceBalances[tx.origin][flight][account] = 0;
        insurancePayouts[account] = credit;
        emit InsurancePayoutCredited(tx.origin, flight, account, credit);
    }

    function creditInsurees(bytes32 flight)
        external
        requireIsOperational
        requireProxySender
        requireIsCallerAuthorized
    {
        require(insuredAccounts[tx.origin][flight].length > 0);
        address[] storage accounts = insuredAccounts[tx.origin][flight];
        for (uint256 a = 0; a < accounts.length; a++) {
            address account = accounts[a];
            creditInsuree(flight, account);
        }
    }

    function payoutInsurance()
        external
        requireIsOperational
        requireProxySender
        requireIsCallerAuthorized
    {
        require(insurancePayouts[tx.origin] > 0);
        uint256 payout = insurancePayouts[tx.origin];
        insurancePayouts[tx.origin] = 0;
        tx.origin.transfer(payout);
        emit InsurancePayoutWithdrawn(tx.origin, payout);
    }

    function() external payable {
        fundDeposit();
    }
}
