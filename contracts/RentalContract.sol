// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title RentalContract
 * @dev Hợp đồng quản lý thuê phòng trọ: Tiền nhà, Điện nước, Phạt trễ hạn, Hoàn cọc.
 */
contract RentalContract is ReentrancyGuard, Pausable {
    using Address for address payable;

    // ===================== 1. KHAI BÁO BIẾN =====================
    address payable public landlord; // Ví Chủ trọ
    address payable public tenant;   // Ví Người thuê

    string public roomName;          // Tên phòng (VD: P.301)
    string public contractHash;      // Mã băm nội dung hợp đồng PDF

    uint256 public rentAmount;       // Giá thuê (Wei)
    uint256 public depositAmount;    // Tiền cọc (Wei)
    uint256 public elecPrice;        // Giá điện (Wei)
    uint256 public waterPrice;       // Giá nước (Wei)

    uint256 public pendingRentAmount;
    bool public isRentChangePending;

    enum State { CREATED, ACTIVE, ENDED }
    State public state;

    uint256 public constant LATE_PENALTY_PERCENT = 1; // Phạt 1% mỗi chu kỳ trễ

    // ===================== 2. CẤU TRÚC DỮ LIỆU =====================
    struct Bill {
        uint256 id;
        uint256 month;
        uint256 year;
        uint256 amount;       // Tổng tiền gốc
        uint256 deadline;     // Hạn chót
        bool isPaid;
        uint256 paidAt;
        uint256 penalty;      // Tiền phạt
    }

    mapping(uint256 => Bill) public bills;
    uint256 public billCount;

    // Chống double-pay cho hóa đơn từ Backend (Web2)
    mapping(uint256 => bool) public externalBillPaid;

    // ===================== 3. SỰ KIỆN (EVENTS) =====================
    event ContractActivated(address indexed tenant, uint256 depositAmount);
    event BillCreated(uint256 indexed billId, uint256 amount, uint256 deadline);
    event BillPaid(uint256 indexed billId, uint256 amount, uint256 penalty, address payer);
    event RentChangeProposed(uint256 newAmount);
    event RentChangeAccepted(uint256 newAmount);
    event ContractEnded(uint256 refundAmount, uint256 deductionAmount);

    // ===================== 4. MODIFIERS =====================
    modifier onlyLandlord() {
        require(msg.sender == landlord, "Chi Chu tro duoc thuc hien");
        _;
    }

    modifier onlyTenant() {
        require(msg.sender == tenant, "Chi Nguoi thue duoc thuc hien");
        _;
    }

    modifier inState(State _state) {
        require(state == _state, "Sai trang thai hop dong");
        _;
    }

    // ===================== 5. CONSTRUCTOR =====================
    constructor(
        address _landlord,
        address _tenant,
        string memory _roomName,
        string memory _contractHash,
        uint256 _rentAmount,
        uint256 _depositAmount,
        uint256 _elecPrice,
        uint256 _waterPrice
    ) {
        require(_landlord != address(0), "Dia chi Landlord khong hop le");
        require(_tenant != address(0), "Dia chi Tenant khong hop le");
        
        landlord = payable(_landlord); 
        tenant = payable(_tenant);
        
        roomName = _roomName;
        contractHash = _contractHash;
        rentAmount = _rentAmount;
        depositAmount = _depositAmount;
        elecPrice = _elecPrice;
        waterPrice = _waterPrice;
        
        state = State.CREATED;
    }

    // ===================== 6. CHỨC NĂNG CHÍNH =====================

    // Kích hoạt (Khách đóng cọc)
    function deposit() external payable onlyTenant inState(State.CREATED) whenNotPaused {
        require(msg.value == depositAmount, "Tien coc khong khop");
        state = State.ACTIVE;
        emit ContractActivated(msg.sender, msg.value);
    }

    // Tạo hóa đơn (Truyền gracePeriod linh hoạt để dễ Demo)
    function createBill(
        uint256 _month, 
        uint256 _year, 
        uint256 _elecUsage, 
        uint256 _waterUsage,
        uint256 _gracePeriodInSeconds // VD: Truyền 60 giây để test trễ hạn
    ) external onlyLandlord inState(State.ACTIVE) whenNotPaused {
        
        uint256 utilityCost = (_elecUsage * elecPrice) + (_waterUsage * waterPrice);
        uint256 total = rentAmount + utilityCost;
        
        uint256 deadline = block.timestamp + _gracePeriodInSeconds;

        billCount++;
        bills[billCount] = Bill({
            id: billCount,
            month: _month,
            year: _year,
            amount: total,
            deadline: deadline,
            isPaid: false,
            paidAt: 0,
            penalty: 0
        });

        emit BillCreated(billCount, total, deadline);
    }

    // Khách thanh toán (On-chain bill)
    function payBill(uint256 _billId) external payable nonReentrant inState(State.ACTIVE) whenNotPaused {
        Bill storage bill = bills[_billId];
        require(_billId > 0 && _billId <= billCount, "Hoa don khong ton tai");
        require(!bill.isPaid, "Da thanh toan");

        uint256 penalty = 0;
        if (block.timestamp > bill.deadline) {
            uint256 daysLate = (block.timestamp - bill.deadline) / 1 days;
            if (daysLate == 0) daysLate = 1; // Trễ dưới 24h vẫn tính 1 ngày
            penalty = (bill.amount * LATE_PENALTY_PERCENT * daysLate) / 100;
        }

        uint256 totalMustPay = bill.amount + penalty;
        require(msg.value == totalMustPay, "So tien khong dung (gom ca phat)");

        landlord.sendValue(msg.value); // Trả tiền về ví chủ trọ

        bill.isPaid = true;
        bill.paidAt = block.timestamp;
        bill.penalty = penalty;

        emit BillPaid(_billId, msg.value, penalty, msg.sender);
    }

    // ===================== PAYMENT GATEWAY (Web2 Bill) =====================
    // Hàm thanh toán hóa đơn do Backend quản lý
    // Nhận tiền -> Chuyển cho chủ trọ -> Ghi Log lên Blockchain
    // Không cần inState(ACTIVE) vì backend đã quản lý trạng thái hợp đồng
    function payExternalBill(uint256 _backendBillId) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "So tien phai lon hon 0");
        require(!externalBillPaid[_backendBillId], "Hoa don nay da duoc thanh toan");

        // Đánh dấu đã thanh toán (chống double-pay)
        externalBillPaid[_backendBillId] = true;

        // Chuyển thẳng tiền cho chủ trọ
        landlord.sendValue(msg.value);

        // Ghi log lên Blockchain (minh bạch, tra cứu được trên Etherscan)
        emit BillPaid(_backendBillId, msg.value, 0, msg.sender);
    }

    // Thanh lý hợp đồng
    function endContract(uint256 _deduction) external nonReentrant onlyLandlord inState(State.ACTIVE) {
        require(_deduction <= depositAmount, "Tien tru qua muc coc");

        uint256 refundAmount = depositAmount - _deduction;

        if (refundAmount > 0) {
            tenant.sendValue(refundAmount);
        }
        if (_deduction > 0) {
            landlord.sendValue(_deduction);
        }

        state = State.ENDED;
        emit ContractEnded(refundAmount, _deduction);
    }

    receive() external payable {}
}
