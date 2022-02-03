pragma solidity ^0.5.16;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyApp {
    using SafeMath for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                  Constants                                 */
    /* -------------------------------------------------------------------------- */

    uint8 private constant CODE_UNKNOWN = 0;
    uint8 private constant CODE_ON_TIME = 10;
    uint8 private constant CODE_LATE_AIRLINE = 20;
    uint8 private constant CODE_LATE_WEATHER = 30;
    uint8 private constant CODE_LATE_TECHNICAL = 40;
    uint8 private constant CODE_LATE_OTHER = 50;

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

    event SurplusRefunded(address customer, uint256 amount);
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

    modifier requireCompliantAirline(address airline) {
        require(
            fsdContract.isCompliantAirline(airline),
            "Indicated airline is not compliant"
        );
        _;
    }

    modifier requireValidFlightCode(bytes32 flightCode) {
        require(flightCode.length > 0, "Flight code not specified");
        require(
            fsdContract.isValidFlightCode(flightCode),
            "Indicated flight code is not valid"
        );
        _;
    }

    modifier requireOpenFlight(bytes32 flightCode) {
        require(
            fsdContract.isOpenFlight(flightCode),
            "Indicated flight code is closed"
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
        return fsdContract.getAirlineInfo(airlineAddress);
    }

    function isOperationalAirline(address airlineAddress)
        external
        view
        returns (bool)
    {
        return fsdContract.isOperationalAirline(airlineAddress);
    }

    function getAirlineFundDeposit(address airlineAddress)
        external
        view
        returns (uint256)
    {
        return fsdContract.getAirlineFundDeposit(airlineAddress);
    }

    function fundDeposit() external payable requireIsOperational {
        address payable dataContract = address(uint160(address(fsdContract)));
        dataContract.transfer(msg.value);
        fsdContract.fundDeposit(msg.sender, msg.value);
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
            fsdContract.registerAirline(airlineAddress, name, code, msg.sender);
        } else {
            fsdContract.voteAirline(airlineAddress, msg.sender);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                              Flight management                             */
    /* -------------------------------------------------------------------------- */

    function isValidFlight(bytes32 flightCode)
        external
        view
        returns (bool registered)
    {
        return fsdContract.isValidFlightCode(flightCode);
    }

    function getFlightData(bytes32 flightCode)
        external
        view
        returns (
            address airline,
            bool registered,
            uint8 statusCode,
            uint256 timestamp,
            uint256 updatetTimestamp
        )
    {
        return fsdContract.getFlightData(flightCode);
    }

    function registerFlight(string calldata flight, uint256 timestamp)
        external
        requireIsOperational
        requireCompliantAirline(msg.sender)
    {
        bytes32 flightCode = getFlightKey(msg.sender, flight, timestamp);
        fsdContract.registerFlight(msg.sender, flightCode, timestamp);
    }

    function updateFlight(bytes32 flightCode, uint8 status)
        external
        requireIsOperational
    {
        fsdContract.updateFlight(flightCode, status);
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        bytes32 flightCode,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flightCode, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flightCode, timestamp);
    }

    /* -------------------------------------------------------------------------- */
    /*                              Oracle management                             */
    /* -------------------------------------------------------------------------- */

    uint8 private nonce = 0;

    uint256 public constant REGISTRATION_FEE = 1 ether;

    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    mapping(address => Oracle) private oracles;

    struct ResponseInfo {
        address requester;
        bool isOpen; 
        mapping(uint8 => address[]) responses;
    }

    mapping(bytes32 => ResponseInfo) private oracleResponses;

    event FlightStatusInfo(
        address airline,
        bytes32 flightCode,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        bytes32 flightCode,
        uint256 timestamp,
        uint8 status,
        uint256 length
    );

    event OracleRegistered(
        address oracle,
        uint8 index1,
        uint8 index2,
        uint8 index3
    );

    event OracleRequest(
        uint8 index,
        address airline,
        bytes32 flightCode,
        uint256 timestamp
    );

    /* ------------------ Register an oracle with the contract ------------------ */
    function registerOracle() external payable {
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");
        require(oracles[msg.sender].isRegistered == false);
        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});

        emit OracleRegistered(msg.sender, indexes[0], indexes[1], indexes[2]);
    }

    function getMyIndexes() external view returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    function submitOracleResponse(
        uint8 index,
        address airline,
        bytes32 flightCode,
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
            abi.encodePacked(index, airline, flightCode, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        emit OracleReport(
            airline,
            flightCode,
            timestamp,
            statusCode,
            oracleResponses[key].responses[statusCode].length
        );
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            fsdContract.updateFlight(flightCode, statusCode);
            oracleResponses[key].isOpen = false;
            emit FlightStatusInfo(airline, flightCode, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

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

    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0;
        }

        return random;
    }

    function voteAirline(address airlineAddress) external {}

    /* -------------------------------------------------------------------------- */
    /*                            Insurance management                            */
    /* -------------------------------------------------------------------------- */
    function getCustomerInsurancePremium(
        address airline,
        bytes32 flightCode,
        address account
    ) external view returns (uint256) {
        return
            fsdContract.getCustomerInsurancePremium(
                airline,
                flightCode,
                account
            );
    }

    function getCustomerInsurancePayout(address account)
        external
        view
        returns (uint256)
    {
        return fsdContract.getCustomerInsurancePayout(account);
    }

    function purchaseInsurance(address airline, bytes32 flightCode)
        external
        payable
        requireIsOperational
        requireCompliantAirline(airline)
        requireValidFlightCode(flightCode)
        requireOpenFlight(flightCode)
    {
        require(msg.value > 0, "Sent amount is zero");
        uint256 insuredValue = fsdContract.getCustomerInsurancePremium(
            airline,
            flightCode,
            msg.sender
        );
        uint256 maxPremium = fsdContract.getMaxInsurancePremium();

        require(
            insuredValue < maxPremium,
            "Insured amount already covers the maximum possible premium"
        );
        uint256 value = msg.value;
        uint256 total = value.add(insuredValue);

        uint256 amount;
        uint256 refund;
        if (total > maxPremium) {
            refund = total.sub(maxPremium);
            amount = value.sub(refund);
        } else {
            refund = 0;
            amount = value;
        }

        address payable dataContract = address(uint160(address(fsdContract)));
        dataContract.transfer(amount);
        fsdContract.purchaseInsurance(airline, flightCode, msg.sender, amount);
        if (refund > 0) {
            msg.sender.transfer(refund);
            emit SurplusRefunded(msg.sender, refund);
        }
    }

    function getFlightStatus(bytes32 flightCode) external view returns (uint8) {
        return fsdContract.getFlightStatus(flightCode);
    }

    function claimOrCredit(bytes32 flightCode)
        external
        requireIsOperational
        requireCompliantAirline(msg.sender)
        requireValidFlightCode(flightCode)
    {
        if (fsdContract.getFlightStatus(flightCode) == CODE_LATE_AIRLINE) {
            fsdContract.creditInsurees(msg.sender, flightCode);
        } else {
            fsdContract.claimPremiums(msg.sender, flightCode);
        }
    }

    function withdrawInsurancePayout() external requireIsOperational {
        fsdContract.withdrawInsurancePayout(msg.sender);
    }
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

    function getAirlineFundDeposit(address airlineAddress)
        external
        view
        returns (uint256);

    function isOperationalAirline(address airlineAddress)
        external
        view
        returns (bool);

    function getAirlineInfo(address airlineAddress)
        external
        view
        returns (string memory name, string memory code);

    function fundDeposit(address airline, uint256 amount) external;

    function registerAirline(
        address airlineAddress,
        string calldata name,
        string calldata code,
        address proponentAddress
    ) external;

    function getAirlineVotes(address airlineAddress)
        external
        view
        returns (uint256);

    function voteAirline(address airlineAddress, address voterAddress) external;

    function isCompliantAirline(address airline) public view returns (bool);

    function isValidFlightCode(bytes32 flightCode) public view returns (bool);

    function isOpenFlight(bytes32 flightCode) public view returns (bool);

    /* ---------------------------- Flight management --------------------------- */
    function getFlightData(bytes32 flightCode)
        external
        view
        returns (
            address airline,
            bool registered,
            uint8 statusCode,
            uint256 timestamp,
            uint256 updatetTimestamp
        );

    function registerFlight(
        address airline,
        bytes32 flightCode,
        uint256 timestamp
    ) external;

    function updateFlight(bytes32 flightCode, uint8 statusCode) external;

    function getFlightStatus(bytes32 flightCode) external view returns (uint8);

    /* -------------------------- Insurance management -------------------------- */
    function getMaxInsurancePremium() public view returns (uint256);

    function getCustomerInsurancePremium(
        address airline,
        bytes32 flightCode,
        address customer
    ) public view returns (uint256);

    function getCustomerInsurancePayout(address customer)
        public
        view
        returns (uint256);

    function purchaseInsurance(
        address airline,
        bytes32 flightCode,
        address customer,
        uint256 value
    ) external;

    function creditInsurees(address airline, bytes32 flightCode) external;

    function claimPremiums(address airline, bytes32 flightCode) external;

    function withdrawInsurancePayout(address payable account) external;
}
