pragma solidity ^0.5.16;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyApp {
    using SafeMath for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                  Constants                                 */
    /* -------------------------------------------------------------------------- */

    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    /* -------------------------------------------------------------------------- */
    /*                               Main parameters                              */
    /* -------------------------------------------------------------------------- */

    address private contractOwner;
    uint256 public quorum = 4;

    /* -------------------------------------------------------------------------- */
    /*                               Flight registry                              */
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                                  Insurance                                 */
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                              Storage contract                              */
    /* -------------------------------------------------------------------------- */

    FlightSuretyData fsdContract;

    /* -------------------------------------------------------------------------- */
    /*                                   Structs                                  */
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                                   Events                                   */
    /* -------------------------------------------------------------------------- */

    event QuorumChanged(uint256 oldQuorum, uint256 newQuorum);

    /* -------------------------------------------------------------------------- */
    /*                                 Constructor                                */
    /* -------------------------------------------------------------------------- */

    constructor(address dataContractAddress) public {
        require(dataContractAddress != address(0));
        fsdContract = FlightSuretyData(dataContractAddress);
        contractOwner = msg.sender;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Modifiers                                 */
    /* -------------------------------------------------------------------------- */

    modifier requireContractOwner() {
        require(
            msg.sender == contractOwner,
            "Caller is not the contract owner"
        );
        _;
    }

    modifier requireIsOperational() {
        require(
            fsdContract.isOperational(),
            "Contract is currently not operational"
        );
        _;
    }

    modifier requireValidInsuranceRange() {
        require(
            msg.value > 0 && msg.value <= fsdContract.getMaxInsurancePremium(),
            "Sent amount is zero or exceedes the maximum insurance premium possible"
        );
        _;
    }

    modifier requireCompliantAirline(address airline) {
        require(
            fsdContract.isCompliantAirline(airline),
            "Indicated airline is not compliant"
        );
        _;
    }

    modifier requireValidFlightCode(bytes32 flight) {
        require(bytes32(flight).length > 0, "Flight code not specified");
        require(
            fsdContract.isValidFlightCode(flight),
            "Indicated flight code is not valid"
        );
        _;
    }

    /* -------------------------------------------------------------------------- */
    /*                             Status verification                            */
    /* -------------------------------------------------------------------------- */

    function isOperational() public view returns (bool) {
        return fsdContract.isOperational();
    }

    function isTestingMode() public view returns (bool) {
        return fsdContract.isTestingMode();
    }

    function isAuthorized() public view returns (bool) {
        return fsdContract.isAuthorized();
    }

    /* -------------------------------------------------------------------------- */
    /*                              Multiparty quorum                             */
    /* -------------------------------------------------------------------------- */

    function setQuorum(uint256 n) external requireContractOwner {
        require(n > quorum);
        uint256 prev = quorum;
        quorum = n;
        emit QuorumChanged(prev, n);
    }

    function getAirlineVotes(address airlineAddress)
        public
        view
        returns (uint256 count)
    {
        return fsdContract.getAirlineVotes(airlineAddress);
    }

    function getCountOperationalAirlines() public view returns (uint256 count) {
        return fsdContract.getCountOperationalAirlines();
    }

    /* -------------------------------------------------------------------------- */
    /*                             Airline management                             */
    /* -------------------------------------------------------------------------- */

    function getAirlineInfo(address airlineAddress)
        external
        view
        returns (string memory name, string memory code)
    {
        return (fsdContract.getAirlineInfo(airlineAddress));
    }

    function submitAirlineRegistration(
        address airlineAddress,
        string calldata name,
        string calldata code
    ) external requireIsOperational {
        require(airlineAddress != address(0));
        uint256 airlines = fsdContract.getCountOperationalAirlines();
        bool isTrusted = airlines < quorum;
        uint256 receivedVotes = fsdContract.getAirlineVotes(airlineAddress);
        bool isMajority = receivedVotes >= quorum.div(2);
        if (isTrusted || isMajority) {
            fsdContract.registerAirline(airlineAddress, name, code);
        } else {
            fsdContract.voteAirline(airlineAddress);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                              Flight management                             */
    /* -------------------------------------------------------------------------- */

    function registerFlight() external pure {}

    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal pure {}

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string calldata flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    /* -------------------------------------------------------------------------- */
    /*                              Oracle management                             */
    /* -------------------------------------------------------------------------- */

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string calldata flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account)
        internal
        returns (uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    function voteAirline(address airlineAddress) external {}

    /* -------------------------- Insurance management -------------------------- */
    function purchaseInsurance(address airline, bytes32 flight)
        external
        payable
        requireIsOperational
        requireValidInsuranceRange
        requireCompliantAirline(airline)
        requireValidFlightCode(flight)
    {
        address payable dataContract = address(uint160(address(fsdContract)));
        dataContract.transfer(msg.value);
        fsdContract.purchaseInsurance(airline, flight, msg.sender, msg.value);
    }

    function creditInsurees(bytes32 flight) external {}

    function withdrawInsurancePayout() external {}
}

/* -------------------------------------------------------------------------- */
/*                         Storage contract interface                         */
/* -------------------------------------------------------------------------- */

contract FlightSuretyData {
    /* -------------------------- Basic contract status ------------------------- */
    function isOperational() external view returns (bool);

    function isTestingMode() external view returns (bool);

    function isAuthorized() external view returns (bool);

    /* --------------------------- Airline management --------------------------- */
    function getCountOperationalAirlines() external view returns (uint256);

    function getAirlineInfo(address airlineAddress)
        external
        view
        returns (string memory name, string memory code);

    function getAirlineVotes(address airlineAddress)
        external
        view
        returns (uint256);

    function registerAirline(
        address airlineAddress,
        string calldata name,
        string calldata code
    ) external;

    function voteAirline(address airlineAddress) external;

    function isCompliantAirline(address airline) public view returns (bool);

    function isValidFlightCode(bytes32 flight) public view returns (bool);

    /* -------------------------- Insurance management -------------------------- */
    function getMaxInsurancePremium() public view returns (uint256);

    function purchaseInsurance(
        address airline,
        bytes32 flight,
        address customer,
        uint256 value
    ) external payable;

    function creditInsurees(bytes32 flight) external;

    function withdrawInsurancePayout() external;
}
