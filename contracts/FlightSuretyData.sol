pragma solidity ^0.5.16;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    address private contractOwner;
    bool private operational;
    bool private testing;
    uint256 private minimumFund;

    mapping(address => uint256) private authorizedCallers;

    uint256 countOperationalAirlines = 0;
    uint256 countBlockedAirlines = 0;
    address[] public airlineRegistry;
    mapping(address => Airline) private airlines;
    mapping(address => uint256) private airlineFundDeposits;
    mapping(address => uint256) private airlineVotes;
    mapping(address => mapping(address => bool)) private airlineVoters;

    struct Airline {
        address id;
        bool isOperational;
        string name;
        string code;
    }

    event CallerAuthorized(address caller);
    event CallerDeauthorized(address caller);
    event AirlineVoted(address airline, uint256 votes);
    event AirlineRegistered(address airline, string name, string code);
    event AirlineBlocked(address airline, string name, string code);
    event FundsDeposited(address airline, uint256 amount);
    event FundsWithdrawn(address airline, uint256 amount);

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

    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
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
        require(authorizedCallers[msg.sender] == 1, "Caller is not authorized");
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

    function isOperational() external view returns (bool) {
        return operational;
    }

    function setOperational(bool mode) external requireContractOwner {
        operational = mode;
    }

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

    function setMinimumFund(uint256 amount) public requireContractOwner {
        minimumFund = amount;
    }

    function isAuthorized() external view returns (bool) {
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

    function registerAirline(
        address airlineAddress,
        string calldata name,
        string calldata code
    )
        external
        requireIsOperational
        requireIsCallerAuthorized
        requireMinimumFundsCovered(tx.origin)
    {
        require(isOperationalAirline(tx.origin));
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
        requireMinimumFundsCovered(tx.origin)
    {
        require(airlineAddress != address(0));
        require(isOperationalAirline(tx.origin));
        airlineVoters[airlineAddress][tx.origin] = true;
        airlineVotes[airlineAddress] = airlineVotes[airlineAddress].add(1);
        emit AirlineVoted(airlineAddress, airlineVotes[airlineAddress]);
    }

    function blockAirline(address airlineAddress)
        external
        requireIsOperational
        requireIsCallerAuthorized
        requireMinimumFundsCovered(tx.origin)
    {
        require(airlineAddress != address(0));
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

    function getAirlineVotes(address airlineAddress)
        external
        view
        returns (uint256)
    {
        return airlineVotes[airlineAddress];
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

    function buy() external payable {}

    function creditInsurees() external pure {}

    function pay() external pure {}

    function fund() public payable {
        require(msg.sender == tx.origin, "Sender is not the payer");
        require(
            msg.value >= minimumFund,
            "Funds are not enough for the deposit"
        );
        airlineFundDeposits[msg.sender] = msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function() external payable {
        fund();
    }
}
