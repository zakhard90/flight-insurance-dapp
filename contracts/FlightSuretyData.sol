pragma solidity ^0.5.16;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    address private contractOwner;
    bool private operational = true;

    mapping(address => uint256) private authorizedCallers;

    address[] public airlineRegistry;
    mapping(address => Airline) private airlines;

    struct Airline {
        address id;
        bool isOperational;
        string name;
        string code;
    }

    event AirlineRegistered(address airline, string name, string code);
    event AirlineBlocked(address airline, string name, string code);

    constructor(
        address firstAirline,
        string memory name,
        string memory code
    ) public {
        require(firstAirline != address(0));
        airlineRegistry.push(firstAirline);
        airlines[firstAirline] = Airline(firstAirline, true, name, code);
        contractOwner = msg.sender;
    }

    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsCallerAuthorized() {
        require(authorizedCallers[msg.sender] == 1, "Caller is not authorized");
        _;
    }

 
    function isOperational() public view returns (bool) {
        return operational;
    }

    function setOperational(bool mode) external requireContractOwner {
        operational = mode;
    }

    function authorizeCaller(address contractAddress)
        external
        requireContractOwner
    {
        authorizedCallers[contractAddress] = 1;
    }

    function deauthorizeCaller(address contractAddress)
        external
        requireContractOwner
    {
        delete authorizedCallers[contractAddress];
    }

    function registerAirline(
        address airlineAddress,
        string calldata name,
        string calldata code
    )
        external
        requireIsCallerAuthorized
        requireIsOperational
        returns (bool success, uint256 votes)
    {
        require(airlineAddress != address(0));
        require(bytes(airlines[airlineAddress].name).length == 0);
        airlineRegistry.push(airlineAddress);
        airlines[airlineAddress] = Airline(airlineAddress, true, name, code);
        emit AirlineRegistered(airlineAddress, name, code);
        return (true, 1); // fixme
    }

    function blockAirline(address airlineAddress)
        external
        requireIsOperational
        requireIsCallerAuthorized
    {
        require(airlineAddress != address(0));
        require(bytes(airlines[airlineAddress].name).length > 0);
        airlines[airlineAddress].isOperational = false;
        emit AirlineBlocked(
            airlineAddress,
            airlines[airlineAddress].name,
            airlines[airlineAddress].code
        );
    }

    function getAirlineInfo(address airlineAddress)
        public
        view
        returns (string memory name, string memory code)
    {
        Airline memory a = airlines[airlineAddress];
        return (a.name, a.code);
    }

    function getAirlineCount() public view returns (uint256) {
        return airlineRegistry.length;
    }

    function buy() external payable {}

    function creditInsurees() external pure {}

    function pay() external pure {}

    function fund() public payable {}

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
