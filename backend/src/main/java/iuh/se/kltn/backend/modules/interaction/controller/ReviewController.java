package iuh.se.kltn.backend.modules.interaction.controller;

import iuh.se.kltn.backend.modules.interaction.dto.request.ReviewRequest;
import iuh.se.kltn.backend.modules.interaction.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    // API: Khách thuê viết đánh giá
    @PostMapping
    public ResponseEntity<?> createReview(@RequestBody ReviewRequest request, Principal principal) {
        try {
            return ResponseEntity.ok(reviewService.createReview(request, principal.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // API: Xem tất cả đánh giá của 1 chủ nhà
    @GetMapping("/landlord/{landlordId}")
    public ResponseEntity<?> getReviewsByLandlord(@PathVariable Long landlordId) {
        return ResponseEntity.ok(reviewService.getReviewsByLandlord(landlordId));
    }
    @GetMapping("/property/{propertyId}")
    public ResponseEntity<?> getReviewsByProperty(@PathVariable Long propertyId) {
        return ResponseEntity.ok(reviewService.getReviewsByProperty(propertyId));
    }
}