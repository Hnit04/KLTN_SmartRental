package iuh.se.kltn.backend.modules.property.controller;

import iuh.se.kltn.backend.modules.property.service.CrawlerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/crawler")
@RequiredArgsConstructor
public class CrawlerController {

    private final CrawlerService crawlerService;

    @GetMapping("/test-phongtro123")
    public ResponseEntity<?> testCrawlPhongTro123() {
        var crawledData = crawlerService.crawlPhongTro123();
        if (crawledData.isEmpty()) {
            return ResponseEntity.internalServerError().body(crawledData);
        }
        return ResponseEntity.ok(crawledData);
    }

    @GetMapping("/test-nhatrovn")
    public ResponseEntity<?> testCrawlNhaTroVn() {
        var crawledData = crawlerService.crawlNhaTroVn();
        if (crawledData.isEmpty()) {
            return ResponseEntity.internalServerError().body(crawledData);
        }
        return ResponseEntity.ok(crawledData);
    }
}
