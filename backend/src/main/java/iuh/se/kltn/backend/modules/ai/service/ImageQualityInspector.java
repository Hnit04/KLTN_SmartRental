package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.ImageQualityResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLConnection;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ImageQualityInspector {

    @Autowired(required = false)
    private AiRuntimeProperties aiRuntimeProperties;

    private final ImageFetcher imageFetcher;

    public ImageQualityInspector() {
        this.imageFetcher = this::downloadImageBytes;
    }

    ImageQualityInspector(ImageFetcher imageFetcher) {
        this.imageFetcher = imageFetcher == null ? this::downloadImageBytes : imageFetcher;
    }

    public ImageQualityResult inspect(List<String> imageUrls) {
        AiRuntimeProperties.Moderation.ImageQuality cfg = resolveConfig();
        if (!cfg.isEnabled()) {
            return ImageQualityResult.builder()
                    .enabled(false)
                    .totalImages(imageUrls == null ? 0 : imageUrls.size())
                    .build();
        }

        List<String> safeUrls = sanitize(imageUrls);
        List<String> reasons = new ArrayList<>();
        Set<String> uniqueUrls = new HashSet<>();

        int validUrlCount = 0;
        int invalidUrlCount = 0;
        int blockedUrlCount = 0;
        int duplicateCount = 0;
        int inspectedCount = 0;
        int lowResolutionCount = 0;
        int lowQualityCount = 0;
        int downloadFailedCount = 0;

        int minWidth = Math.max(1, cfg.getMinWidth());
        int minHeight = Math.max(1, cfg.getMinHeight());
        int maxDownloadBytes = Math.max(100_000, cfg.getMaxDownloadBytes());
        int timeoutMs = Math.max(500, cfg.getTimeoutMs());
        int maxInspect = Math.max(1, cfg.getMaxImagesToInspect());

        for (String url : safeUrls) {
            String normalized = url.trim().toLowerCase(Locale.ROOT);
            if (!uniqueUrls.add(normalized)) {
                duplicateCount++;
            }

            UrlValidationStatus validationStatus = validateImageUrl(
                    url,
                    cfg.isRequireHttps(),
                    cfg.isBlockPrivateNetwork(),
                    cfg.getAllowedHosts());
            if (validationStatus == UrlValidationStatus.INVALID) {
                invalidUrlCount++;
                continue;
            }
            if (validationStatus == UrlValidationStatus.BLOCKED_PRIVATE_NETWORK) {
                blockedUrlCount++;
                continue;
            }
            if (validationStatus == UrlValidationStatus.BLOCKED_BY_ALLOWLIST) {
                blockedUrlCount++;
                continue;
            }
            validUrlCount++;

            if (inspectedCount >= maxInspect) {
                continue;
            }

            try {
                byte[] data = imageFetcher.fetch(url, maxDownloadBytes, timeoutMs);
                BufferedImage image = decodeImage(data);
                inspectedCount++;

                if (image.getWidth() < minWidth || image.getHeight() < minHeight) {
                    lowResolutionCount++;
                    continue;
                }

                ImageQualityMetrics metrics = analyzeImageQuality(image);
                if (metrics.tooDark || metrics.tooBright || metrics.blurry) {
                    lowQualityCount++;
                }
            } catch (Exception ex) {
                downloadFailedCount++;
            }
        }

        if (invalidUrlCount > 0) {
            reasons.add("Phát hiện URL ảnh không hợp lệ hoặc không dùng https.");
        }
        if (blockedUrlCount > 0) {
            reasons.add("Phát hiện URL ảnh bị chặn theo chính sách host/SSRF.");
        }
        if (duplicateCount > 0) {
            reasons.add("Danh sách ảnh có URL trùng lặp.");
        }
        if (lowResolutionCount > 0) {
            reasons.add("Một số ảnh có độ phân giải quá thấp.");
        }
        if (lowQualityCount > 0) {
            reasons.add("Một số ảnh quá tối/sáng hoặc có dấu hiệu mờ.");
        }
        if (downloadFailedCount > 0) {
            reasons.add("Một số ảnh không tải/phân tích được, cần admin xem lại.");
        }

        boolean needsReview = duplicateCount > 0
                || invalidUrlCount > 0
                || blockedUrlCount > 0
                || lowResolutionCount > 0
                || lowQualityCount > 0
                || downloadFailedCount > 0;

        return ImageQualityResult.builder()
                .enabled(true)
                .totalImages(safeUrls.size())
                .validUrlCount(validUrlCount)
                .invalidUrlCount(invalidUrlCount)
                .blockedUrlCount(blockedUrlCount)
                .duplicateUrlCount(duplicateCount)
                .inspectedImageCount(inspectedCount)
                .lowResolutionCount(lowResolutionCount)
                .lowQualityCount(lowQualityCount)
                .downloadFailedCount(downloadFailedCount)
                .needsReview(needsReview)
                .reasons(reasons)
                .build();
    }

    private AiRuntimeProperties.Moderation.ImageQuality resolveConfig() {
        if (aiRuntimeProperties == null || aiRuntimeProperties.getModeration() == null
                || aiRuntimeProperties.getModeration().getImageQuality() == null) {
            return new AiRuntimeProperties.Moderation.ImageQuality();
        }
        return aiRuntimeProperties.getModeration().getImageQuality();
    }

    private List<String> sanitize(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return List.of();
        }
        List<String> safe = new ArrayList<>();
        for (String url : imageUrls) {
            if (url != null && !url.isBlank()) {
                safe.add(url.trim());
            }
        }
        return safe;
    }

    private UrlValidationStatus validateImageUrl(
            String rawUrl,
            boolean requireHttps,
            boolean blockPrivateNetwork,
            List<String> allowedHosts) {
        try {
            URI uri = URI.create(rawUrl);
            String scheme = uri.getScheme();
            if (scheme == null) {
                return UrlValidationStatus.INVALID;
            }
            String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
            if (requireHttps && !"https".equals(normalizedScheme)) {
                return UrlValidationStatus.INVALID;
            }
            if (!requireHttps && !("https".equals(normalizedScheme) || "http".equals(normalizedScheme))) {
                return UrlValidationStatus.INVALID;
            }
            String path = uri.getPath();
            if (path == null || path.isBlank()) {
                return UrlValidationStatus.INVALID;
            }
            String lowerPath = path.toLowerCase(Locale.ROOT);
            boolean supportedExtension = lowerPath.endsWith(".jpg")
                    || lowerPath.endsWith(".jpeg")
                    || lowerPath.endsWith(".png")
                    || lowerPath.endsWith(".webp");
            if (!supportedExtension) {
                return UrlValidationStatus.INVALID;
            }
            if (!isHostAllowed(uri.getHost(), allowedHosts)) {
                return UrlValidationStatus.BLOCKED_BY_ALLOWLIST;
            }
            if (blockPrivateNetwork && isPrivateOrLocalHost(uri.getHost())) {
                return UrlValidationStatus.BLOCKED_PRIVATE_NETWORK;
            }
            return UrlValidationStatus.VALID;
        } catch (Exception ex) {
            return UrlValidationStatus.INVALID;
        }
    }

    private boolean isHostAllowed(String host, List<String> allowedHosts) {
        if (host == null || host.isBlank()) {
            return false;
        }
        if (allowedHosts == null || allowedHosts.isEmpty()) {
            return true;
        }
        String normalizedHost = host.trim().toLowerCase(Locale.ROOT);
        for (String allowed : allowedHosts) {
            if (allowed == null || allowed.isBlank()) {
                continue;
            }
            String normalizedAllowed = allowed.trim().toLowerCase(Locale.ROOT);
            if (normalizedHost.equals(normalizedAllowed) || normalizedHost.endsWith("." + normalizedAllowed)) {
                return true;
            }
        }
        return false;
    }

    private BufferedImage decodeImage(byte[] data) throws IOException {
        if (data == null || data.length == 0) {
            throw new IOException("Image bytes empty");
        }
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(data));
        if (image == null) {
            throw new IOException("Cannot decode image");
        }
        return image;
    }

    private byte[] downloadImageBytes(String rawUrl, int maxBytes, int timeoutMs) throws IOException {
        URLConnection connection = URI.create(rawUrl).toURL().openConnection();
        connection.setConnectTimeout(timeoutMs);
        connection.setReadTimeout(timeoutMs);
        if (connection instanceof HttpURLConnection http) {
            http.setInstanceFollowRedirects(false);
            http.setRequestMethod("GET");
            int code = http.getResponseCode();
            if (code >= 300 && code < 400) {
                throw new IOException("Redirected URL is not allowed for image moderation.");
            }
            if (code >= 400) {
                throw new IOException("HTTP " + code);
            }
        }
        try (InputStream input = connection.getInputStream()) {
            return readLimitedBytes(input, maxBytes);
        }
    }

    private boolean isPrivateOrLocalHost(String host) {
        if (host == null || host.isBlank()) {
            return true;
        }
        String normalizedHost = host.trim().toLowerCase(Locale.ROOT);
        if ("localhost".equals(normalizedHost) || normalizedHost.endsWith(".localhost") || normalizedHost.endsWith(".local")) {
            return true;
        }
        try {
            InetAddress[] resolved = InetAddress.getAllByName(normalizedHost);
            for (InetAddress address : resolved) {
                if (address.isAnyLocalAddress()
                        || address.isLoopbackAddress()
                        || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress()
                        || address.isMulticastAddress()
                        || isUniqueLocalIpv6(address)) {
                    return true;
                }
            }
        } catch (Exception ignored) {
            // If host cannot be resolved here, continue and let network request decide.
        }
        return false;
    }

    private boolean isUniqueLocalIpv6(InetAddress address) {
        if (!(address instanceof Inet6Address)) {
            return false;
        }
        byte[] bytes = address.getAddress();
        if (bytes == null || bytes.length < 2) {
            return false;
        }
        int firstByte = bytes[0] & 0xFF;
        return (firstByte & 0xFE) == 0xFC;
    }

    private byte[] readLimitedBytes(InputStream input, int maxBytes) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = input.read(buffer)) != -1) {
            total += read;
            if (total > maxBytes) {
                throw new IOException("Image exceeds allowed max bytes");
            }
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private ImageQualityMetrics analyzeImageQuality(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        int stepX = Math.max(1, width / 64);
        int stepY = Math.max(1, height / 64);

        double luminanceSum = 0;
        double edgeSum = 0;
        int sampleCount = 0;

        for (int y = 0; y < height - stepY; y += stepY) {
            for (int x = 0; x < width - stepX; x += stepX) {
                double gray = toGray(image.getRGB(x, y));
                double grayRight = toGray(image.getRGB(x + stepX, y));
                double grayBottom = toGray(image.getRGB(x, y + stepY));
                luminanceSum += gray;
                edgeSum += Math.abs(gray - grayRight) + Math.abs(gray - grayBottom);
                sampleCount++;
            }
        }

        if (sampleCount == 0) {
            return new ImageQualityMetrics(false, false, false);
        }

        double avgLuminance = luminanceSum / sampleCount;
        double avgEdge = edgeSum / sampleCount;
        boolean tooDark = avgLuminance < 40;
        boolean tooBright = avgLuminance > 220;
        boolean blurry = avgEdge < 14;
        return new ImageQualityMetrics(tooDark, tooBright, blurry);
    }

    private double toGray(int rgb) {
        int r = (rgb >> 16) & 0xFF;
        int g = (rgb >> 8) & 0xFF;
        int b = rgb & 0xFF;
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    interface ImageFetcher {
        byte[] fetch(String rawUrl, int maxBytes, int timeoutMs) throws Exception;
    }

    private enum UrlValidationStatus {
        VALID,
        INVALID,
        BLOCKED_PRIVATE_NETWORK,
        BLOCKED_BY_ALLOWLIST
    }

    private record ImageQualityMetrics(boolean tooDark, boolean tooBright, boolean blurry) {
    }
}
