package iuh.se.kltn.backend.modules.interaction.controller;

import iuh.se.kltn.backend.modules.interaction.dto.request.ReviewRequest;
import iuh.se.kltn.backend.modules.interaction.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Validated
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<?> createReview(@Valid @RequestBody ReviewRequest request, Principal principal) {
        try {
            return ResponseEntity.ok(reviewService.createReview(request, principal.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/landlord/{landlordId}")
    public ResponseEntity<?> getReviewsByLandlord(@PathVariable Long landlordId) {
        return ResponseEntity.ok(reviewService.getReviewsByLandlord(landlordId));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<?> getReviewsByProperty(@PathVariable Long propertyId) {
        return ResponseEntity.ok(reviewService.getReviewsByProperty(propertyId));
    }
}
