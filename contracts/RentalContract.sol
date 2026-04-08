// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ✅ FIX IMPORT (version tồn tại)
import "https://cdn.jsdelivr.net/npm/@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";
import "https://cdn.jsdelivr.net/npm/@openzeppelin/contracts@5.0.2/utils/Pausable.sol";
import "https://cdn.jsdelivr.net/npm/@openzeppelin/contracts@5.0.2/utils/Address.sol";
contract RentalContract is ReentrancyGuard, Pausable {
    using Address for address payable;

    // ===== IMMUTABLE =====
    address payable public landlord;
    address payable public tenant;
    address public backend;

    // ===== BASIC INFO =====
    string public roomName;
    string public contractHash;

    // ===== PRICING =====
    uint256 public rentAmount;
    uint256 public depositAmount;
    uint256 public elecPrice;
    uint256 public waterPrice;
    uint256 public internetPrice;

    // ===== TIME =====
    uint256 public startDate;
    uint256 public endDate;
    uint256 public latePenaltyPercent;

    uint256 public depositedAmount;

    uint256 public constant MAX_PENALTY_PERCENT = 20;

    enum State { CREATED, ACTIVE, ENDED }
    State public state;

    // ===== BILL =====
    struct Bill {
        uint256 id;
        uint256 month;
        uint256 year;
        uint256 amount;
        uint256 deadline;
        bool isPaid;
        uint256 paidAt;
        uint256 penalty;
    }

    mapping(uint256 => Bill) public bills;
    uint256 public billCount;
    mapping(uint256 => mapping(uint256 => bool)) public billExists;

    uint256 public unpaidBillCount;

    // ===== EXTERNAL BILL =====
    struct ExternalBill {
        uint256 amount;
        bool isPaid;
        bool exists;
    }

    mapping(uint256 => ExternalBill) public externalBills;

    // ===== EVENTS =====
    event ContractActivated(address indexed tenant, uint256 amount);
    event BillCreated(uint256 indexed billId, uint256 amount, uint256 deadline);
    event BillPaid(uint256 indexed billId, uint256 amount, uint256 penalty, address payer);
    event ExternalBillCreated(uint256 indexed id, uint256 amount);
    event ContractEnded(uint256 refund, uint256 deduction);

    // ===== MODIFIERS =====
    modifier onlyLandlord() {
        require(msg.sender == landlord, "Only landlord");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == landlord || msg.sender == backend, "Not authorized");
        _;
    }

    modifier onlyTenant() {
        require(msg.sender == tenant, "Only tenant");
        _;
    }

    modifier inState(State _state) {
        require(state == _state, "Invalid state");
        _;
    }

    modifier contractActiveTime() {
        require(block.timestamp <= endDate, "Contract expired");
        _;
    }

    // ===== CONSTRUCTOR =====
    constructor(
        address _landlord,
        address _tenant,
        string memory _roomName,
        string memory _contractHash,
        uint256[] memory p
    ) {
        require(_landlord != address(0), "Invalid landlord");
        require(_tenant != address(0), "Invalid tenant");
        require(p.length == 8, "Invalid params");
        require(p[5] < p[6], "Invalid time");
        require(p[7] <= MAX_PENALTY_PERCENT, "Penalty too high");

        landlord = payable(_landlord);
        tenant = payable(_tenant);
        backend = msg.sender;

        roomName = _roomName;
        contractHash = _contractHash;

        rentAmount = p[0];
        depositAmount = p[1];
        elecPrice = p[2];
        waterPrice = p[3];
        internetPrice = p[4];
        startDate = p[5];
        endDate = p[6];
        latePenaltyPercent = p[7];

        state = State.CREATED;
    }

    // ===== DEPOSIT =====
    function deposit()
        external
        payable
        onlyTenant
        inState(State.CREATED)
        whenNotPaused
        nonReentrant
    {
        require(depositedAmount == 0, "Already deposited");
        require(msg.value == depositAmount, "Wrong amount");
        require(block.timestamp < endDate, "Expired");

        depositedAmount = msg.value;
        state = State.ACTIVE;

        emit ContractActivated(msg.sender, msg.value);
    }

    // ===== INTERNAL =====
    function _utility(uint256 e, uint256 w)
        internal
        view
        returns (uint256)
    {
        return (e * elecPrice) + (w * waterPrice) + internetPrice;
    }

    function _penalty(Bill storage b)
        internal
        view
        returns (uint256)
    {
        if (block.timestamp <= b.deadline) return 0;

        uint256 daysLate = (block.timestamp - b.deadline + 1 days - 1) / 1 days;
        uint256 p = (b.amount * latePenaltyPercent * daysLate) / 100;

        uint256 cap = b.amount * 2;
        return p > cap ? cap : p;
    }

    // ===== CREATE BILL =====
    function createBill(
        uint256 m,
        uint256 y,
        uint256 e,
        uint256 w,
        uint256 grace
    )
        external
        onlyLandlord
        inState(State.ACTIVE)
        whenNotPaused
        contractActiveTime
    {
        require(m >= 1 && m <= 12, "Invalid month");
        require(grace > 0, "Invalid grace");
        require(!billExists[m][y], "Exists");

        uint256 total = rentAmount + _utility(e, w);
        uint256 deadline = block.timestamp + grace;

        unchecked { billCount++; }
        unpaidBillCount++;

        bills[billCount] = Bill(
            billCount,
            m,
            y,
            total,
            deadline,
            false,
            0,
            0
        );

        billExists[m][y] = true;

        emit BillCreated(billCount, total, deadline);
    }

    // ===== PAY BILL =====
    function payBill(uint256 id)
        external
        payable
        onlyTenant
        nonReentrant
        inState(State.ACTIVE)
        whenNotPaused
    {
        require(id > 0 && id <= billCount, "Invalid id");

        Bill storage b = bills[id];
        require(!b.isPaid, "Paid");

        uint256 pen = _penalty(b);
        uint256 total = b.amount + pen;

        require(msg.value == total, "Wrong amount");

        b.isPaid = true;
        b.paidAt = block.timestamp;
        b.penalty = pen;

        unchecked { unpaidBillCount--; }

        landlord.sendValue(msg.value);

        emit BillPaid(id, msg.value, pen, msg.sender);
    }

    // ===== REGISTER EXTERNAL BILL (Web2 -> Web3) =====
    function registerExternalBill(uint256 _backendBillId, uint256 _amount)
        external
        onlyAuthorized
        whenNotPaused
    {
        require(_amount > 0, "Invalid amount");
        require(!externalBills[_backendBillId].exists, "Exists");

        externalBills[_backendBillId] = ExternalBill(_amount, false, true);
        unchecked { unpaidBillCount++; }

        emit ExternalBillCreated(_backendBillId, _amount);
    }

    function payExternalBill(uint256 id)
        external
        payable
        onlyTenant
        nonReentrant
        inState(State.ACTIVE)
        whenNotPaused
    {
        ExternalBill storage b = externalBills[id];

        require(b.exists, "Invalid");
        require(!b.isPaid, "Paid");
        require(msg.value == b.amount, "Wrong amount");

        b.isPaid = true;
        unchecked { unpaidBillCount--; }

        landlord.sendValue(msg.value);

        emit BillPaid(id, msg.value, 0, msg.sender);
    }

    // ===== END CONTRACT =====
    function endContract(uint256 _deduction)
        external
        onlyAuthorized
        inState(State.ACTIVE)
        whenNotPaused
        nonReentrant
    {
        require(block.timestamp >= endDate, "Too early");
        require(unpaidBillCount == 0, "Unpaid bills");
        require(_deduction <= depositedAmount, "Too much");

        uint256 refund = depositedAmount - _deduction;

        state = State.ENDED;
        depositedAmount = 0;

        if (refund > 0) tenant.sendValue(refund);
        if (_deduction > 0) landlord.sendValue(_deduction);

        emit ContractEnded(refund, deduction);
    }
}