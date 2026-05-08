package iuh.se.kltn.backend.modules.contract.controller;

import iuh.se.kltn.backend.modules.contract.dto.request.SePayWebhookRequest;
import iuh.se.kltn.backend.modules.contract.entity.Bill;
import iuh.se.kltn.backend.modules.contract.repository.BillRepository;
import iuh.se.kltn.backend.modules.contract.service.BillService;
import iuh.se.kltn.backend.modules.contract.service.ContractService;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private BillService billService;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private ContractService contractService;

    @Autowired
    private iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService vipSubscriptionService;

    @Value("${sepay.webhook.token:}")
    private String sepayWebhookToken;

    @Value("${sepay.platform.bank-name:MB}")
    private String platformBankName;

    @Value("${sepay.platform.account-number:0326829327}")
    private String platformAccountNumber;

    @Value("${sepay.platform.account-name:TRAN CONG TINH}")
    private String platformAccountName;

    // Toggle mock: true = dùng 2000đ để test, false = dùng số tiền thật (PRODUCTION)
    @Value("${sepay.mock.amount-override:true}")
    private boolean mockAmountOverride;

    @GetMapping("/bill/{billId}/qr-code")
    public ResponseEntity<?> getVietQrCode(@PathVariable Long billId) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Hóa đơn không tồn tại"));

        // DÙNG TÀI KHOẢN TRUNG GIAN (VÍ PLATFORM) ĐỂ SINH MÃ QR
        String bankName = platformBankName;
        String accountNumber = platformAccountNumber;
        String accountName = platformAccountName;

        if (bankName == null || accountNumber == null) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Chủ trọ chưa cấu hình thông tin ngân hàng"));
        }

        // Nếu mock=true: dùng 2000đ để test. Nếu mock=false: dùng số tiền thật (PRODUCTION)
        String amount = mockAmountOverride 
            ? (bill.getTotalAmount().longValue() > 0 ? "2000" : "0")
            : String.valueOf(bill.getTotalAmount().longValue());
        String addInfo = "SMR BILL " + billId;
        String encodedAddInfo = java.net.URLEncoder.encode(addInfo, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
        String encodedAccountName = accountName != null ? java.net.URLEncoder.encode(accountName, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20") : "";

        String safeBankName = bankName.trim().replaceAll("\\s+", "");
        String qrUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                safeBankName, accountNumber, amount, encodedAddInfo, encodedAccountName);

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "qrUrl", qrUrl,
                "amount", amount,
                "addInfo", addInfo
        ));
    }

    @GetMapping("/contract/{contractId}/qr-code")
    public ResponseEntity<?> getContractQrCode(@PathVariable Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        // DÙNG TÀI KHOẢN TRUNG GIAN (VÍ PLATFORM) ĐỂ SINH MÃ QR
        String bankName = platformBankName;
        String accountNumber = platformAccountNumber;
        String accountName = platformAccountName;

        if (bankName == null || accountNumber == null) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Chủ trọ chưa cấu hình thông tin ngân hàng"));
        }

        // Tạo URL ảnh VietQR cho tiền cọc
        Double depositAmount = contract.getDepositAmount() != null ? contract.getDepositAmount() : 0.0;
        
        // Nếu mock=true: dùng 2000đ để test. Nếu mock=false: dùng số tiền thật (PRODUCTION)
        String amount = mockAmountOverride
            ? (depositAmount > 0 ? "2000" : "0")
            : String.valueOf(depositAmount.longValue());
        
        String addInfo = "SMR DEPOSIT " + contractId;
        String encodedAddInfo = java.net.URLEncoder.encode(addInfo, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
        String encodedAccountName = accountName != null ? java.net.URLEncoder.encode(accountName, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20") : "";

        String safeBankName = bankName.trim().replaceAll("\\s+", "");
        String qrUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                safeBankName, accountNumber, amount, encodedAddInfo, encodedAccountName);

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "qrUrl", qrUrl,
                "amount", amount,
                "addInfo", addInfo
        ));
    }

    @PostMapping("/sepay/webhook")
    public ResponseEntity<?> handleSePayWebhook(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "Apikey", required = false) String apiKeyHeader,
            @RequestBody SePayWebhookRequest request) {

        System.out.println("🔔 [SePay Webhook] Nhận request: " + request.getTransactionContent());

        // Kiểm tra bảo mật nếu có cấu hình token
        if (sepayWebhookToken != null && !sepayWebhookToken.trim().isEmpty()) {
            boolean isAuthorized = false;
            String cleanToken = sepayWebhookToken.trim();
            
            // Trường hợp 1: Token nằm trong header Authorization theo dạng "Apikey [TOKEN]"
            if (authHeader != null && authHeader.trim().equals("Apikey " + cleanToken)) {
                isAuthorized = true;
            }
            
            // Trường hợp 2: Token nằm trực tiếp trong header Apikey
            if (apiKeyHeader != null && apiKeyHeader.trim().equals(cleanToken)) {
                isAuthorized = true;
            }

            if (!isAuthorized) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
            }
        }

        try {
            String content = request.getTransactionContent();
            if (content != null) {
                java.util.regex.Matcher depositMatcher = java.util.regex.Pattern.compile("SMR DEPOSIT (\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(content);
                if (depositMatcher.find()) {
                    Long contractId = Long.parseLong(depositMatcher.group(1));
                    contractService.processSePayDepositWebhook(contractId, request.getAmountIn(), request.getReferenceNumber(), request.getAccountNumber());
                    return ResponseEntity.ok(Map.of("success", true, "message", "Deposit Webhook processed"));
                }

                // Pattern VIP: "SMR VIP {orderId}"
                java.util.regex.Matcher vipMatcher = java.util.regex.Pattern.compile("SMR VIP (\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(content);
                if (vipMatcher.find()) {
                    Long orderId = Long.parseLong(vipMatcher.group(1));
                    vipSubscriptionService.processVipPayment(orderId, request.getAmountIn(), request.getReferenceNumber());
                    return ResponseEntity.ok(Map.of("success", true, "message", "VIP Webhook processed"));
                }
            }

            // Mặc định gọi BillService
            billService.processSePayWebhook(request);
            return ResponseEntity.ok(Map.of("success", true, "message", "Bill Webhook processed"));
        } catch (Exception e) {
            System.err.println("❌ [SePay Webhook] Lỗi xử lý: " + e.getMessage());
            // Vẫn trả về 200 OK để SePay không gửi lại liên tục nếu lỗi logic
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
