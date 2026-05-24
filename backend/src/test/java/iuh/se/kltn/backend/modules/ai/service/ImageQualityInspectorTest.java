package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.ImageQualityResult;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ImageQualityInspectorTest {

    @Test
    void validHttpsImageUrls_shouldPassBasicQualityChecks() {
        ImageQualityInspector inspector = new ImageQualityInspector((url, maxBytes, timeoutMs) -> buildImageBytes(900, 700, Color.GRAY));

        ImageQualityResult result = inspector.inspect(List.of(
                "https://img.example.com/room-1.jpg",
                "https://img.example.com/room-2.jpeg",
                "https://img.example.com/room-3.png"
        ));

        assertTrue(result.isEnabled());
        assertEquals(3, result.getTotalImages());
        assertEquals(3, result.getValidUrlCount());
        assertEquals(0, result.getInvalidUrlCount());
        assertEquals(0, result.getBlockedUrlCount());
        assertEquals(0, result.getDuplicateUrlCount());
        assertEquals(3, result.getInspectedImageCount());
        assertFalse(result.isNeedsReview());
    }

    @Test
    void duplicateUrls_shouldBeFlagged() {
        ImageQualityInspector inspector = new ImageQualityInspector((url, maxBytes, timeoutMs) -> buildImageBytes(900, 700, Color.GRAY));

        ImageQualityResult result = inspector.inspect(List.of(
                "https://img.example.com/room-1.jpg",
                "https://img.example.com/room-1.jpg",
                "https://img.example.com/room-2.jpg"
        ));

        assertEquals(1, result.getDuplicateUrlCount());
        assertTrue(result.isNeedsReview());
    }

    @Test
    void invalidUrls_shouldBeCounted() {
        ImageQualityInspector inspector = new ImageQualityInspector((url, maxBytes, timeoutMs) -> buildImageBytes(900, 700, Color.GRAY));

        ImageQualityResult result = inspector.inspect(List.of(
                "http://img.example.com/room-1.jpg",
                "https://img.example.com/room-2.txt",
                "abc"
        ));

        assertEquals(0, result.getValidUrlCount());
        assertEquals(3, result.getInvalidUrlCount());
        assertEquals(0, result.getBlockedUrlCount());
        assertTrue(result.isNeedsReview());
    }

    @Test
    void noImages_shouldNotCrash() {
        ImageQualityInspector inspector = new ImageQualityInspector((url, maxBytes, timeoutMs) -> buildImageBytes(900, 700, Color.GRAY));

        ImageQualityResult result = inspector.inspect(List.of());

        assertEquals(0, result.getTotalImages());
        assertEquals(0, result.getValidUrlCount());
        assertEquals(0, result.getInspectedImageCount());
    }

    @Test
    void privateNetworkUrls_shouldBeBlocked() {
        ImageQualityInspector inspector = new ImageQualityInspector((url, maxBytes, timeoutMs) -> buildImageBytes(900, 700, Color.GRAY));

        ImageQualityResult result = inspector.inspect(List.of(
                "https://127.0.0.1/internal.jpg",
                "https://localhost/image.png"
        ));

        assertEquals(2, result.getBlockedUrlCount());
        assertEquals(0, result.getValidUrlCount());
        assertTrue(result.isNeedsReview());
    }

    @Test
    void allowedHost_cloudinary_shouldPass() {
        ImageQualityInspector inspector = new ImageQualityInspector((url, maxBytes, timeoutMs) -> buildImageBytes(900, 700, Color.GRAY));
        applyAllowedHosts(inspector, List.of("res.cloudinary.com"));

        ImageQualityResult result = inspector.inspect(List.of("https://res.cloudinary.com/demo/image/upload/sample.jpg"));

        assertEquals(1, result.getValidUrlCount());
        assertEquals(0, result.getBlockedUrlCount());
        assertFalse(result.isNeedsReview());
    }

    @Test
    void nonAllowlistedHost_shouldBeBlocked() {
        ImageQualityInspector inspector = new ImageQualityInspector((url, maxBytes, timeoutMs) -> buildImageBytes(900, 700, Color.GRAY));
        applyAllowedHosts(inspector, List.of("res.cloudinary.com"));

        ImageQualityResult result = inspector.inspect(List.of("https://evil.com/room.jpg"));

        assertEquals(0, result.getValidUrlCount());
        assertEquals(1, result.getBlockedUrlCount());
        assertTrue(result.isNeedsReview());
    }

    @Test
    void localhost_shouldStillBeBlocked_evenIfAllowlisted() {
        ImageQualityInspector inspector = new ImageQualityInspector((url, maxBytes, timeoutMs) -> buildImageBytes(900, 700, Color.GRAY));
        applyAllowedHosts(inspector, List.of("localhost"));

        ImageQualityResult result = inspector.inspect(List.of("https://localhost/room.jpg"));

        assertEquals(0, result.getValidUrlCount());
        assertEquals(1, result.getBlockedUrlCount());
        assertTrue(result.isNeedsReview());
    }

    private void applyAllowedHosts(ImageQualityInspector inspector, List<String> allowedHosts) {
        AiRuntimeProperties properties = new AiRuntimeProperties();
        properties.getModeration().getImageQuality().setAllowedHosts(allowedHosts);
        properties.getModeration().getImageQuality().setEnabled(true);
        ReflectionTestUtils.setField(inspector, "aiRuntimeProperties", properties);
    }

    private byte[] buildImageBytes(int width, int height, Color color) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(color);
        graphics.fillRect(0, 0, width, height);
        graphics.setColor(Color.WHITE);
        for (int x = 0; x < width; x += 40) {
            graphics.drawLine(x, 0, x, height - 1);
        }
        graphics.setColor(Color.BLACK);
        for (int y = 0; y < height; y += 40) {
            graphics.drawLine(0, y, width - 1, y);
        }
        graphics.setColor(new Color(180, 40, 40));
        graphics.fillOval(width / 3, height / 3, width / 4, height / 4);
        graphics.dispose();

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", output);
        return output.toByteArray();
    }
}
