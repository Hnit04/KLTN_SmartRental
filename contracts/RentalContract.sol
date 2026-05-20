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

    // ===== STATE & BALANCES =====
    uint256 public depositedAmount;
    mapping(address => uint256) public pendingWithdrawals;
    
    // ===== TERMINATION FLOW (H-02 Fix) =====
    struct DeductionProposal {
        uint256 amount;
        uint256 proposedAt;
        bool active;
        bool isEarlyTermination;
    }
    DeductionProposal public currentProposal;
    mapping(address => bool) public endConsent;

    uint256 public constant MAX_PENALTY_PERCENT = 20;
    uint256 public constant EMERGENCY_DELAY = 7 days;
    uint256 public constant PROPOSAL_EXPIRY = 7 days;
    uint256 public constant MAX_BILLS = 120;

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

    // ===== EXTERNAL BILL (H-02) =====
    struct ExternalBill {
        uint256 amount;
        bool isPaid;
        bool exists;
    }

    mapping(uint256 => ExternalBill) public externalBills;
    uint256 public externalBillCount;
    uint256 public constant MAX_EXTERNAL_BILLS = 50;
    uint256 public constant MAX_EXTERNAL_BILL_MULTIPLIER = 3;
    uint256[] public externalBillIdList; // ✅ FIX H-02: Track external bill IDs for emergencyWithdraw

    // ===== EVENTS =====
    event ContractActivated(address indexed tenant, uint256 amount);
    event BillCreated(uint256 indexed billId, uint256 amount, uint256 deadline);
    event BillPaid(uint256 indexed billId, uint256 amount, uint256 penalty, address payer);
    event ExternalBillCreated(uint256 indexed id, uint256 amount);
    event DeductionProposed(uint256 amount, bool isEarlyTermination);
    event TenantConsentGiven();
    event ContractEnded(uint256 refund, uint256 deduction);
    event Withdrawn(address indexed user, uint256 amount);
    event ContractDataUpdated(
        uint256 oldRent, uint256 newRent,
        uint256 oldEndDate, uint256 newEndDate,
        string newHash
    );

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

    // ===== PAUSE / UNPAUSE (L-04 Fix) =====
    function pause() external onlyAuthorized {
        _pause();
    }

    function unpause() external onlyAuthorized {
        _unpause();
    }

    // ===== DEPOSIT (M-04 Fix) =====
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
        // require(block.timestamp >= startDate, "Not started"); // Cho phép đặt cọc sớm để giữ chỗ (Reservation)
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
        require(billCount < MAX_BILLS, "Too many bills");
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

    // ===== PAY BILL (H-03 Fix) =====
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

        require(unpaidBillCount > 0, "Count error");
        unpaidBillCount--;

        pendingWithdrawals[landlord] += msg.value;

        emit BillPaid(id, msg.value, pen, msg.sender);
    }

    // ===== REGISTER EXTERNAL BILL (H-02 Fix) =====
    function registerExternalBill(uint256 _backendBillId, uint256 _amount)
        external
        onlyAuthorized
        inState(State.ACTIVE)
        contractActiveTime
        whenNotPaused
    {
        require(_amount > 0, "Invalid amount");
        require(!externalBills[_backendBillId].exists, "Exists");
        require(_amount <= rentAmount * MAX_EXTERNAL_BILL_MULTIPLIER, "Amount too high");
        require(externalBillCount < MAX_EXTERNAL_BILLS, "Too many bills");

        externalBills[_backendBillId] = ExternalBill(_amount, false, true);
        unpaidBillCount++;
        externalBillCount++;
        externalBillIdList.push(_backendBillId); // ✅ FIX H-02: Track ID for emergency loop

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
        require(unpaidBillCount > 0, "Count error");
        unpaidBillCount--;

        pendingWithdrawals[landlord] += msg.value;

        emit BillPaid(id, msg.value, 0, msg.sender);
    }

    // ===== UPDATE CONTRACT DATA (M-02 Fix) =====
    function updateContractData(
        uint256 _newRent,
        uint256 _newEndDate,
        uint256 _newElecPrice,
        uint256 _newWaterPrice,
        uint256 _newInternetPrice,
        uint256 _newLatePenalty,
        string memory _newHash
    ) external onlyAuthorized inState(State.ACTIVE) whenNotPaused {
        require(_newRent > 0, "Rent cannot be zero");
        require(_newEndDate > endDate, "Cannot shorten contract");
        require(_newLatePenalty <= MAX_PENALTY_PERCENT, "Penalty too high");

        emit ContractDataUpdated(rentAmount, _newRent, endDate, _newEndDate, _newHash);

        rentAmount = _newRent;
        endDate = _newEndDate;
        elecPrice = _newElecPrice;
        waterPrice = _newWaterPrice;
        internetPrice = _newInternetPrice;
        latePenaltyPercent = _newLatePenalty;
        contractHash = _newHash;
        
        // Reset proposal and consent if terms change (H-02 Fix)
        currentProposal.active = false;
        endConsent[landlord] = false;
        endConsent[tenant] = false;
    }

    // ===== TERMINATION FLOW (C-01 & H-02 Fix) =====
    function proposeDeduction(uint256 _amount, bool _isEarlyTermination) 
        external onlyLandlord inState(State.ACTIVE) 
    {
        require(_amount <= depositedAmount, "Too much");
        currentProposal = DeductionProposal(_amount, block.timestamp, true, _isEarlyTermination);
        endConsent[landlord] = true;
        endConsent[tenant] = false; 
        emit DeductionProposed(_amount, _isEarlyTermination);
    }

    function consentEndContract() external onlyTenant inState(State.ACTIVE) {
        require(currentProposal.active, "No active proposal");
        require(block.timestamp <= currentProposal.proposedAt + PROPOSAL_EXPIRY, "Proposal expired");
        endConsent[tenant] = true;
        emit TenantConsentGiven();
    }

    function endContract()
        external
        inState(State.ACTIVE)
        whenNotPaused
        nonReentrant
    {
        // Access Control (H-01 Fix)
        require(msg.sender == landlord || msg.sender == tenant || msg.sender == backend, "Not authorized");
        
        require(endConsent[landlord] && endConsent[tenant], "Need both consents");
        require(currentProposal.active, "Proposal inactive");
        require(block.timestamp <= currentProposal.proposedAt + PROPOSAL_EXPIRY, "Proposal expired");
        
        // Early Termination Check
        if (!currentProposal.isEarlyTermination) {
            require(block.timestamp >= endDate, "Too early");
        }

        require(unpaidBillCount == 0, "Unpaid bills");

        uint256 _deduction = currentProposal.amount;
        uint256 refund = depositedAmount - _deduction;

        state = State.ENDED;
        depositedAmount = 0;
        currentProposal.active = false;

        if (refund > 0) pendingWithdrawals[tenant] += refund;
        if (_deduction > 0) pendingWithdrawals[landlord] += _deduction;

        emit ContractEnded(refund, _deduction);
    }

    // ===== EMERGENCY WITHDRAW / AUTO-SETTLE (M-01 + H-02 Fix) =====
    function emergencyWithdraw() 
        external 
        nonReentrant 
        inState(State.ACTIVE) 
    {
        require(msg.sender == tenant || msg.sender == backend, "Not authorized");
        require(block.timestamp > endDate + EMERGENCY_DELAY, "Too early");
        
        uint256 totalUnpaid = 0;
        // Check for unpaid internal bills
        for (uint256 i = 1; i <= billCount; i++) {
            if (!bills[i].isPaid) {
                totalUnpaid += bills[i].amount + _penalty(bills[i]);
            }
        }
        // ✅ FIX H-02: Check for unpaid external bills
        for (uint256 j = 0; j < externalBillIdList.length; j++) {
            uint256 extId = externalBillIdList[j];
            if (!externalBills[extId].isPaid) {
                totalUnpaid += externalBills[extId].amount;
            }
        }
        
        uint256 deduction = totalUnpaid > depositedAmount ? depositedAmount : totalUnpaid;
        uint256 refund = depositedAmount - deduction;

        depositedAmount = 0;
        state = State.ENDED;
        currentProposal.active = false;
        
        if (refund > 0) pendingWithdrawals[tenant] += refund;
        if (deduction > 0) pendingWithdrawals[landlord] += deduction;

        emit ContractEnded(refund, deduction);
    }

    // ===== PULL PAYMENT WITHDRAW (M-03 Fix) =====
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).sendValue(amount);
        
        emit Withdrawn(msg.sender, amount);
    }
}