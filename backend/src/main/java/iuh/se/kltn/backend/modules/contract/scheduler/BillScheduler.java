package iuh.se.kltn.backend.modules.contract.scheduler;

import iuh.se.kltn.backend.modules.contract.service.BillService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BillScheduler {

    private final BillService billService;

    // Chạy lúc 01:00 AM mỗi ngày
    @Scheduled(cron = "0 0 1 * * ?")
    public void processOverdueBillsDaily() {
        log.info("⏰ Bắt đầu quét hóa đơn trễ hạn tự động...");
        billService.processOverdueBills();
        log.info("✅ Hoàn tất quét hóa đơn trễ hạn.");
    }
}
