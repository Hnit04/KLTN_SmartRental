package iuh.se.kltn.backend.modules.contract.controller;

import iuh.se.kltn.backend.modules.contract.dto.request.SePayWebhookRequest;
import iuh.se.kltn.backend.modules.contract.entity.Bill;
import iuh.se.kltn.backend.modules.contract.entity.ProcessedWebhook;
import iuh.se.kltn.backend.modules.contract.repository.BillRepository;
import iuh.se.kltn.backend.modules.contract.repository.ProcessedWebhookRepository;
import iuh.se.kltn.backend.modules.contract.service.BillService;
import iuh.se.kltn.backend.modules.contract.service.ContractService;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import jakarta.validation.Valid;

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
    private ProcessedWebhookRepository processedWebhookRepository;

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
    // 🛡️ SECURITY: Default = false để production an toàn. Chỉ set true trong .env dev/test.
    @Value("${sepay.mock.amount-override:false}")
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
            @Valid @RequestBody SePayWebhookRequest request) {

        System.out.println("🔔 [SePay Webhook] Nhận request: " + request.getTransactionContent());

        // 🛡️ SECURITY: BẮT BUỘC kiểm tra token — reject nếu chưa cấu hình
        if (sepayWebhookToken == null || sepayWebhookToken.trim().isEmpty()) {
            System.err.println("🚨 [SECURITY] SePay webhook token chưa được cấu hình! Từ chối mọi request.");
            return ResponseEntity.status(503).body(Map.of("success", false, "message", "Webhook service not configured"));
        }

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

        try {
            // 🛡️ IDEMPOTENCY: Kiểm tra webhook đã xử lý chưa (chống duplicate từ SePay retry)
            String refNumber = request.getReferenceNumber();
            if (refNumber != null && !refNumber.trim().isEmpty()) {
                if (processedWebhookRepository.existsByReferenceNumber(refNumber)) {
                    System.out.println("⚡ [SePay] Webhook đã xử lý trước đó, bỏ qua: " + refNumber);
                    return ResponseEntity.ok(Map.of("success", true, "message", "Already processed (idempotent)"));
                }
            }

            String content = request.getTransactionContent();
            String webhookType = "UNKNOWN";
            Long targetId = null;

            if (content != null) {
                java.util.regex.Matcher depositMatcher = java.util.regex.Pattern.compile("SMR DEPOSIT (\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(content);
                if (depositMatcher.find()) {
                    Long contractId = Long.parseLong(depositMatcher.group(1));
                    contractService.processSePayDepositWebhook(contractId, request.getAmountIn(), request.getReferenceNumber(), request.getAccountNumber());
                    webhookType = "DEPOSIT";
                    targetId = contractId;
                    recordProcessedWebhook(refNumber, webhookType, targetId, request.getAmountIn(), content);
                    return ResponseEntity.ok(Map.of("success", true, "message", "Deposit Webhook processed"));
                }

                // Pattern VIP: "SMR VIP {orderId}"
                java.util.regex.Matcher vipMatcher = java.util.regex.Pattern.compile("SMR VIP (\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(content);
                if (vipMatcher.find()) {
                    Long orderId = Long.parseLong(vipMatcher.group(1));
                    vipSubscriptionService.processVipPayment(orderId, request.getAmountIn(), request.getReferenceNumber());
                    webhookType = "VIP";
                    targetId = orderId;
                    recordProcessedWebhook(refNumber, webhookType, targetId, request.getAmountIn(), content);
                    return ResponseEntity.ok(Map.of("success", true, "message", "VIP Webhook processed"));
                }
            }

            // Mặc định gọi BillService
            billService.processSePayWebhook(request);
            webhookType = "BILL";
            recordProcessedWebhook(refNumber, webhookType, targetId, request.getAmountIn(), content);
            return ResponseEntity.ok(Map.of("success", true, "message", "Bill Webhook processed"));
        } catch (Exception e) {
            System.err.println("❌ [SePay Webhook] Lỗi xử lý: " + e.getMessage());
            // Vẫn trả về 200 OK để SePay không gửi lại liên tục nếu lỗi logic
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * 🛡️ Ghi nhận webhook đã xử lý thành công vào DB để chống duplicate.
     * Nếu lỗi ghi (ví dụ: unique constraint violation từ race condition), bỏ qua im lặng
     * vì nghiệp vụ chính đã hoàn thành.
     */
    private void recordProcessedWebhook(String refNumber, String type, Long targetId, Double amount, String content) {
        if (refNumber == null || refNumber.trim().isEmpty()) return;
        try {
            processedWebhookRepository.save(ProcessedWebhook.builder()
                    .referenceNumber(refNumber)
                    .webhookType(type)
                    .targetId(targetId)
                    .amount(amount)
                    .transactionContent(content != null && content.length() > 300 ? content.substring(0, 300) : content)
                    .build());
        } catch (Exception e) {
            // Unique constraint violation = webhook đã được ghi bởi concurrent request → OK
            System.out.println("ℹ️ [SePay] Webhook ref đã tồn tại (concurrent): " + refNumber);
        }
    }
}
