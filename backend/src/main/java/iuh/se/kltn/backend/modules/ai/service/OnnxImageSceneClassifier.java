package iuh.se.kltn.backend.modules.ai.service;

import ai.onnxruntime.NodeInfo;
import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtException;
import ai.onnxruntime.OrtSession;
import ai.onnxruntime.TensorInfo;
import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.ImageSceneClassificationResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Array;
import java.net.HttpURLConnection;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URLConnection;
import java.nio.FloatBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
public class OnnxImageSceneClassifier implements ImageSceneClassifier, DisposableBean {

    private static final Set<String> SUPPORTED_LABELS = Set.of(
            "ROOM_INTERIOR",
            "BATHROOM",
            "KITCHEN",
            "EXTERIOR",
            "CORRIDOR",
            "DOCUMENT",
            "OTHER",
            "UNKNOWN"
    );

    private static final Set<String> DEFAULT_SUSPICIOUS_LABELS = Set.of("DOCUMENT", "OTHER");

    @Autowired(required = false)
    private AiRuntimeProperties aiRuntimeProperties;

    private final Object modelLock = new Object();
    private final ExecutorService inferenceExecutor = Executors.newSingleThreadExecutor(new DaemonThreadFactory("onnx-scene-infer"));
    private volatile LoadedModel loadedModel;

    @Override
    public ImageSceneClassificationResult classify(List<String> imageUrls) {
        AiRuntimeProperties.Moderation.SceneClassifier cfg = resolveConfig();
        List<String> safeUrls = sanitize(imageUrls);

        if (!cfg.isEnabled()) {
            return ImageSceneClassificationResult.builder()
                    .enabled(false)
                    .source("DISABLED")
                    .requestedCount(safeUrls.size())
                    .build();
        }
        if (safeUrls.isEmpty()) {
            return ImageSceneClassificationResult.builder()
                    .enabled(true)
                    .source("NO_IMAGE_INPUT")
                    .requestedCount(0)
                    .classifiedCount(0)
                    .needsReview(true)
                    .reasons(List.of("⚠️ Không có ảnh để phân loại cảnh."))
                    .build();
        }

        LoadedModel model;
        try {
            model = ensureModelLoaded(cfg);
        } catch (ModelUnavailableException ex) {
            return ImageSceneClassificationResult.builder()
                    .enabled(true)
                    .source("ONNX_UNAVAILABLE")
                    .requestedCount(safeUrls.size())
                    .classifiedCount(0)
                    .needsReview(true)
                    .reasons(List.of(ex.getMessage()))
                    .build();
        }

        int maxImages = Math.max(1, cfg.getMaxImagesToClassify());
        int timeoutMs = Math.max(500, cfg.getTimeoutMs());
        double minConfidence = clamp(cfg.getMinConfidence(), 0.0, 1.0, 0.50);
        int maxDownloadBytes = resolveMaxDownloadBytes();
        AiRuntimeProperties.Moderation.ImageQuality imageQualityCfg = resolveImageQualityConfig();
        Set<String> suspiciousLabels = resolveSuspiciousLabels(cfg);
        List<ImageSceneClassificationResult.ImageScenePrediction> predictions = new ArrayList<>();
        Set<String> uniqueReasons = new HashSet<>();
        List<String> reasons = new ArrayList<>();

        int roomLikeCount = 0;
        int suspiciousCount = 0;
        int unknownCount = 0;
        int classifiedCount = 0;
        boolean needsReview = false;

        int limit = Math.min(maxImages, safeUrls.size());
        for (int i = 0; i < limit; i++) {
            String imageUrl = safeUrls.get(i);
            UrlValidationStatus validation = validateImageUrl(imageUrl, imageQualityCfg);
            if (validation != UrlValidationStatus.VALID) {
                needsReview = true;
                addReason(uniqueReasons, reasons, reasonForValidationStatus(validation));
                continue;
            }

            try {
                byte[] imageBytes = downloadImageBytes(imageUrl, maxDownloadBytes, timeoutMs);
                BufferedImage image = decodeImage(imageBytes);
                InferenceOutput output = runInferenceWithTimeout(model, image, cfg, timeoutMs);
                String mappedLabel = mapToDomainLabel(output.label(), cfg);
                double confidence = output.confidence();

                if (confidence < minConfidence) {
                    mappedLabel = "UNKNOWN";
                }

                predictions.add(ImageSceneClassificationResult.ImageScenePrediction.builder()
                        .imageUrl(imageUrl)
                        .label(mappedLabel)
                        .confidence(confidence)
                        .build());

                classifiedCount++;
                if ("UNKNOWN".equals(mappedLabel)) {
                    unknownCount++;
                    needsReview = true;
                    addReason(uniqueReasons, reasons, "⚠️ Độ tin cậy của phân loại cảnh thấp, cần Admin xem lại.");
                } else if (isRoomLikeLabel(mappedLabel)) {
                    roomLikeCount++;
                }
                if (suspiciousLabels.contains(mappedLabel)) {
                    suspiciousCount++;
                    needsReview = true;
                    addReason(uniqueReasons, reasons, "⚠️ Phát hiện ảnh tài liệu/không liên quan đến phòng trọ.");
                }
            } catch (TimeoutException ex) {
                needsReview = true;
                addReason(uniqueReasons, reasons, "⚠️ Phân loại cảnh bị quá thời gian, cần Admin xem lại.");
            } catch (Exception ex) {
                needsReview = true;
                addReason(uniqueReasons, reasons, "⚠️ Phân loại cảnh không phân tích được một số ảnh.");
            }
        }

        if (classifiedCount == 0) {
            needsReview = true;
            addReason(uniqueReasons, reasons, "⚠️ Không đủ dữ liệu phân loại ảnh phòng trọ.");
        }

        return ImageSceneClassificationResult.builder()
                .enabled(true)
                .source("ONNX_LOCAL")
                .requestedCount(safeUrls.size())
                .classifiedCount(classifiedCount)
                .unknownCount(unknownCount)
                .roomLikeCount(roomLikeCount)
                .suspiciousCount(suspiciousCount)
                .needsReview(needsReview)
                .reasons(reasons)
                .predictions(predictions)
                .build();
    }

    private AiRuntimeProperties.Moderation.SceneClassifier resolveConfig() {
        if (aiRuntimeProperties == null || aiRuntimeProperties.getModeration() == null
                || aiRuntimeProperties.getModeration().getSceneClassifier() == null) {
            return new AiRuntimeProperties.Moderation.SceneClassifier();
        }
        return aiRuntimeProperties.getModeration().getSceneClassifier();
    }

    private AiRuntimeProperties.Moderation.ImageQuality resolveImageQualityConfig() {
        if (aiRuntimeProperties == null || aiRuntimeProperties.getModeration() == null
                || aiRuntimeProperties.getModeration().getImageQuality() == null) {
            return new AiRuntimeProperties.Moderation.ImageQuality();
        }
        return aiRuntimeProperties.getModeration().getImageQuality();
    }

    private LoadedModel ensureModelLoaded(AiRuntimeProperties.Moderation.SceneClassifier cfg) throws ModelUnavailableException {
        String key = buildModelKey(cfg);
        LoadedModel cached = loadedModel;
        if (cached != null && cached.key().equals(key)) {
            return cached;
        }

        synchronized (modelLock) {
            LoadedModel recheck = loadedModel;
            if (recheck != null && recheck.key().equals(key)) {
                return recheck;
            }
            return loadModel(cfg, key);
        }
    }

    private LoadedModel loadModel(AiRuntimeProperties.Moderation.SceneClassifier cfg, String key) throws ModelUnavailableException {
        Path modelPath = resolveExistingPath(cfg.getModelPath());
        if (modelPath == null || !Files.exists(modelPath)) {
            throw new ModelUnavailableException("⚠️ Phân loại cảnh không khả dụng: thiếu model-path.");
        }
        Path labelsPath = resolveExistingPath(cfg.getLabelsPath());
        if (labelsPath == null || !Files.exists(labelsPath)) {
            throw new ModelUnavailableException("⚠️ Phân loại cảnh không khả dụng: thiếu labels-path.");
        }
        if (!hasOnnxRuntimeAvailable()) {
            throw new ModelUnavailableException("⚠️ Phân loại cảnh không khả dụng: chưa cài ONNX Runtime.");
        }

        try {
            OrtEnvironment environment = OrtEnvironment.getEnvironment();
            OrtSession.SessionOptions options = new OrtSession.SessionOptions();
            options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);
            OrtSession session = environment.createSession(modelPath.toString(), options);
            String inputName = resolveInputName(session);
            boolean nchw = inferNchwInput(session, inputName);
            List<String> labels = loadLabels(labelsPath);
            if (labels.isEmpty()) {
                session.close();
                throw new ModelUnavailableException("⚠️ Đường dẫn nhãn của phân loại cảnh rỗng/không hợp lệ.");
            }

            LoadedModel next = new LoadedModel(key, session, inputName, nchw, labels);
            closeLoadedModel(loadedModel);
            loadedModel = next;
            return next;
        } catch (ModelUnavailableException ex) {
            throw ex;
        } catch (Throwable ex) {
            throw new ModelUnavailableException("⚠️ Khởi tạo mô hình phân loại cảnh bị lỗi (" + ex.getClass().getSimpleName() + ").");
        }
    }

    private String resolveInputName(OrtSession session) throws ModelUnavailableException {
        try {
            Map<String, NodeInfo> inputInfo = session.getInputInfo();
            if (inputInfo == null || inputInfo.isEmpty()) {
                throw new ModelUnavailableException("⚠️ Mô hình phân loại cảnh không có đầu vào hợp lệ.");
            }
            return inputInfo.keySet().iterator().next();
        } catch (OrtException ex) {
            throw new ModelUnavailableException("⚠️ Phân loại cảnh không đọc được mô hình đầu vào.");
        }
    }

    private boolean inferNchwInput(OrtSession session, String inputName) {
        try {
            NodeInfo nodeInfo = session.getInputInfo().get(inputName);
            if (nodeInfo == null || !(nodeInfo.getInfo() instanceof TensorInfo tensorInfo)) {
                return true;
            }
            long[] shape = tensorInfo.getShape();
            if (shape == null || shape.length != 4) {
                return true;
            }
            long channelSecond = shape[1];
            long channelLast = shape[3];
            if (channelSecond == 3) {
                return true;
            }
            if (channelLast == 3) {
                return false;
            }
            return true;
        } catch (Exception ex) {
            return true;
        }
    }

    private List<String> loadLabels(Path labelsPath) throws IOException {
        List<String> raw = Files.readAllLines(labelsPath, StandardCharsets.UTF_8);
        List<String> labels = new ArrayList<>();
        for (String line : raw) {
            if (line == null) {
                continue;
            }
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            labels.add(trimmed);
        }
        return labels;
    }

    private InferenceOutput runInferenceWithTimeout(
            LoadedModel model,
            BufferedImage image,
            AiRuntimeProperties.Moderation.SceneClassifier cfg,
            int timeoutMs
    ) throws Exception {
        Future<InferenceOutput> future = inferenceExecutor.submit(() -> inferSingle(model, image, cfg));
        try {
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException ex) {
            future.cancel(true);
            throw ex;
        } catch (ExecutionException ex) {
            Throwable cause = ex.getCause();
            if (cause instanceof Exception exception) {
                throw exception;
            }
            throw new RuntimeException(cause);
        }
    }

    private InferenceOutput inferSingle(
            LoadedModel model,
            BufferedImage image,
            AiRuntimeProperties.Moderation.SceneClassifier cfg
    ) throws OrtException {
        int targetWidth = Math.max(32, cfg.getInputWidth());
        int targetHeight = Math.max(32, cfg.getInputHeight());

        try (OnnxTensor inputTensor = createInputTensor(model, image, targetWidth, targetHeight);
             OrtSession.Result result = model.session().run(Map.of(model.inputName(), inputTensor))) {
            if (result == null || result.size() == 0) {
                return new InferenceOutput("UNKNOWN", 0.0);
            }
            Object outputValue = result.get(0).getValue();
            double[] scores = extractFirstVector(outputValue);
            if (scores == null || scores.length == 0) {
                return new InferenceOutput("UNKNOWN", 0.0);
            }
            int topIndex = argMax(scores);
            double confidence = softmaxConfidence(scores, topIndex);
            String rawLabel = topIndex >= 0 && topIndex < model.labels().size()
                    ? model.labels().get(topIndex)
                    : "UNKNOWN";
            return new InferenceOutput(rawLabel, clamp(confidence, 0.0, 1.0, 0.0));
        } catch (IOException ex) {
            return new InferenceOutput("UNKNOWN", 0.0);
        }
    }

    private OnnxTensor createInputTensor(LoadedModel model, BufferedImage original, int targetWidth, int targetHeight)
            throws OrtException, IOException {
        BufferedImage resized = resizeToRgb(original, targetWidth, targetHeight);
        OrtEnvironment env = OrtEnvironment.getEnvironment();
        if (model.nchw()) {
            float[] data = new float[3 * targetHeight * targetWidth];
            int rOffset = 0;
            int gOffset = targetHeight * targetWidth;
            int bOffset = gOffset + targetHeight * targetWidth;
            for (int y = 0; y < targetHeight; y++) {
                for (int x = 0; x < targetWidth; x++) {
                    int rgb = resized.getRGB(x, y);
                    float r = ((rgb >> 16) & 0xFF) / 255.0f;
                    float g = ((rgb >> 8) & 0xFF) / 255.0f;
                    float b = (rgb & 0xFF) / 255.0f;
                    int index = y * targetWidth + x;
                    data[rOffset + index] = r;
                    data[gOffset + index] = g;
                    data[bOffset + index] = b;
                }
            }
            return OnnxTensor.createTensor(env, FloatBuffer.wrap(data), new long[]{1, 3, targetHeight, targetWidth});
        }

        float[] data = new float[targetHeight * targetWidth * 3];
        int idx = 0;
        for (int y = 0; y < targetHeight; y++) {
            for (int x = 0; x < targetWidth; x++) {
                int rgb = resized.getRGB(x, y);
                data[idx++] = ((rgb >> 16) & 0xFF) / 255.0f;
                data[idx++] = ((rgb >> 8) & 0xFF) / 255.0f;
                data[idx++] = (rgb & 0xFF) / 255.0f;
            }
        }
        return OnnxTensor.createTensor(env, FloatBuffer.wrap(data), new long[]{1, targetHeight, targetWidth, 3});
    }

    private BufferedImage resizeToRgb(BufferedImage source, int width, int height) throws IOException {
        if (source == null) {
            throw new IOException("Image is null");
        }
        BufferedImage target = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.drawImage(source, 0, 0, width, height, null);
        } finally {
            graphics.dispose();
        }
        return target;
    }

    private double[] extractFirstVector(Object value) {
        if (value == null) {
            return null;
        }
        Class<?> type = value.getClass();
        if (!type.isArray()) {
            return null;
        }
        int len = Array.getLength(value);
        if (len == 0) {
            return null;
        }
        Object first = Array.get(value, 0);
        if (first instanceof Number) {
            double[] vector = new double[len];
            for (int i = 0; i < len; i++) {
                Object current = Array.get(value, i);
                vector[i] = current instanceof Number number ? number.doubleValue() : 0.0;
            }
            return vector;
        }
        return extractFirstVector(first);
    }

    private int argMax(double[] values) {
        if (values == null || values.length == 0) {
            return -1;
        }
        int index = 0;
        double best = values[0];
        for (int i = 1; i < values.length; i++) {
            if (values[i] > best) {
                best = values[i];
                index = i;
            }
        }
        return index;
    }

    private double softmaxConfidence(double[] logits, int topIndex) {
        if (logits == null || logits.length == 0 || topIndex < 0 || topIndex >= logits.length) {
            return 0.0;
        }
        double max = logits[0];
        for (int i = 1; i < logits.length; i++) {
            max = Math.max(max, logits[i]);
        }
        double sum = 0.0;
        double top = 0.0;
        for (int i = 0; i < logits.length; i++) {
            double value = Math.exp(logits[i] - max);
            sum += value;
            if (i == topIndex) {
                top = value;
            }
        }
        if (sum <= 0.0 || Double.isNaN(sum) || Double.isInfinite(sum)) {
            return 0.0;
        }
        return top / sum;
    }

    private String mapToDomainLabel(String rawLabel, AiRuntimeProperties.Moderation.SceneClassifier cfg) {
        String normalized = normalizeLabel(rawLabel);
        if (normalized.isBlank()) {
            return "UNKNOWN";
        }

        Map<String, String> configured = resolveConfiguredLabelMapping(cfg);
        String configuredLabel = configured.get(normalized);
        if (configuredLabel != null && SUPPORTED_LABELS.contains(configuredLabel)) {
            return configuredLabel;
        }

        if (containsAny(normalized, "bedroom", "living_room", "livingroom", "interior", "studio", "room")) {
            return "ROOM_INTERIOR";
        }
        if (containsAny(normalized, "bathroom", "toilet", "wc", "lavatory")) {
            return "BATHROOM";
        }
        if (containsAny(normalized, "kitchen", "pantry")) {
            return "KITCHEN";
        }
        if (containsAny(normalized, "corridor", "hallway", "hall")) {
            return "CORRIDOR";
        }
        if (containsAny(normalized, "building_facade", "facade", "exterior", "outdoor", "balcony", "apartment_building")) {
            return "EXTERIOR";
        }
        if (containsAny(normalized, "document", "paper", "id_card", "passport", "receipt", "invoice", "cccd")) {
            return "DOCUMENT";
        }
        if (containsAny(normalized, "other", "person", "selfie", "animal", "cat", "dog", "car", "food", "text")) {
            return "OTHER";
        }
        return "UNKNOWN";
    }

    private Map<String, String> resolveConfiguredLabelMapping(AiRuntimeProperties.Moderation.SceneClassifier cfg) {
        Map<String, String> source = cfg.getLabelMapping();
        if (source == null || source.isEmpty()) {
            return Map.of();
        }
        Map<String, String> normalized = new HashMap<>();
        for (Map.Entry<String, String> entry : source.entrySet()) {
            if (entry.getKey() == null || entry.getValue() == null) {
                continue;
            }
            String key = normalizeLabel(entry.getKey());
            String value = entry.getValue().trim().toUpperCase(Locale.ROOT);
            if (!key.isBlank() && SUPPORTED_LABELS.contains(value)) {
                normalized.put(key, value);
            }
        }
        return normalized;
    }

    private Set<String> resolveSuspiciousLabels(AiRuntimeProperties.Moderation.SceneClassifier cfg) {
        if (cfg.getSuspiciousLabels() == null || cfg.getSuspiciousLabels().isEmpty()) {
            return DEFAULT_SUSPICIOUS_LABELS;
        }
        Set<String> labels = new HashSet<>();
        for (String label : cfg.getSuspiciousLabels()) {
            if (label == null || label.isBlank()) {
                continue;
            }
            String normalized = label.trim().toUpperCase(Locale.ROOT);
            if (SUPPORTED_LABELS.contains(normalized)) {
                labels.add(normalized);
            }
        }
        if (labels.isEmpty()) {
            return DEFAULT_SUSPICIOUS_LABELS;
        }
        return labels;
    }

    private boolean isRoomLikeLabel(String label) {
        return "ROOM_INTERIOR".equals(label)
                || "BATHROOM".equals(label)
                || "KITCHEN".equals(label)
                || "EXTERIOR".equals(label)
                || "CORRIDOR".equals(label);
    }

    private String normalizeLabel(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim()
                .toLowerCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
    }

    private boolean containsAny(String source, String... tokens) {
        if (source == null || source.isBlank() || tokens == null) {
            return false;
        }
        for (String token : tokens) {
            if (token != null && !token.isBlank() && source.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private void addReason(Set<String> dedupe, List<String> reasons, String reason) {
        if (reason == null || reason.isBlank()) {
            return;
        }
        if (dedupe.add(reason)) {
            reasons.add(reason);
        }
    }

    private String reasonForValidationStatus(UrlValidationStatus status) {
        return switch (status) {
            case INVALID -> "⚠️ URL ảnh không hợp lệ cho phân loại cảnh.";
            case BLOCKED_PRIVATE_NETWORK -> "⚠️ URL ảnh bị chặn do rủi ro mạng riêng/SSRF.";
            case BLOCKED_BY_ALLOWLIST -> "⚠️ URL ảnh không nằm trong danh sách máy chủ cho phép.";
            default -> "";
        };
    }

    private int resolveMaxDownloadBytes() {
        AiRuntimeProperties.Moderation.ImageQuality imageQuality = resolveImageQualityConfig();
        return Math.max(100_000, imageQuality.getMaxDownloadBytes());
    }

    private UrlValidationStatus validateImageUrl(
            String rawUrl,
            AiRuntimeProperties.Moderation.ImageQuality imageQualityCfg
    ) {
        try {
            URI uri = URI.create(rawUrl);
            String scheme = uri.getScheme();
            if (scheme == null) {
                return UrlValidationStatus.INVALID;
            }
            String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
            if (imageQualityCfg.isRequireHttps() && !"https".equals(normalizedScheme)) {
                return UrlValidationStatus.INVALID;
            }
            if (!imageQualityCfg.isRequireHttps() && !("https".equals(normalizedScheme) || "http".equals(normalizedScheme))) {
                return UrlValidationStatus.INVALID;
            }
            String path = uri.getPath();
            if (path == null || path.isBlank()) {
                return UrlValidationStatus.INVALID;
            }
            String lowerPath = path.toLowerCase(Locale.ROOT);
            boolean supported = lowerPath.endsWith(".jpg")
                    || lowerPath.endsWith(".jpeg")
                    || lowerPath.endsWith(".png")
                    || lowerPath.endsWith(".webp");
            if (!supported) {
                return UrlValidationStatus.INVALID;
            }
            if (!isHostAllowed(uri.getHost(), imageQualityCfg.getAllowedHosts())) {
                return UrlValidationStatus.BLOCKED_BY_ALLOWLIST;
            }
            if (imageQualityCfg.isBlockPrivateNetwork() && isPrivateOrLocalHost(uri.getHost())) {
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

    private boolean isPrivateOrLocalHost(String host) {
        if (host == null || host.isBlank()) {
            return true;
        }
        String normalized = host.trim().toLowerCase(Locale.ROOT);
        if ("localhost".equals(normalized) || normalized.endsWith(".localhost") || normalized.endsWith(".local")) {
            return true;
        }
        try {
            InetAddress[] resolved = InetAddress.getAllByName(normalized);
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
            // keep safe fallback to request phase
        }
        return false;
    }

    private boolean isUniqueLocalIpv6(InetAddress address) {
        if (!(address instanceof Inet6Address)) {
            return false;
        }
        byte[] bytes = address.getAddress();
        if (bytes == null || bytes.length < 1) {
            return false;
        }
        int first = bytes[0] & 0xFF;
        return (first & 0xFE) == 0xFC;
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
                throw new IOException("Redirected image URL is blocked.");
            }
            if (code >= 400) {
                throw new IOException("HTTP status: " + code);
            }
        }
        try (InputStream input = connection.getInputStream()) {
            return readLimitedBytes(input, maxBytes);
        }
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

    private boolean hasOnnxRuntimeAvailable() {
        try {
            Class.forName("ai.onnxruntime.OrtEnvironment");
            return true;
        } catch (Throwable ex) {
            return false;
        }
    }

    private Path resolveExistingPath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            return null;
        }
        try {
            Path direct = Paths.get(rawPath.trim());
            if (Files.exists(direct)) {
                return direct.toAbsolutePath().normalize();
            }
            Path backendRelative = Paths.get("backend").resolve(rawPath.trim());
            if (Files.exists(backendRelative)) {
                return backendRelative.toAbsolutePath().normalize();
            }
            return direct.toAbsolutePath().normalize();
        } catch (Exception ex) {
            return null;
        }
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

    private String buildModelKey(AiRuntimeProperties.Moderation.SceneClassifier cfg) {
        return safe(cfg.getModelPath()) + "|" + safe(cfg.getLabelsPath())
                + "|" + Math.max(32, cfg.getInputWidth())
                + "|" + Math.max(32, cfg.getInputHeight());
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private double clamp(double value, double min, double max, double fallback) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return fallback;
        }
        return Math.max(min, Math.min(max, value));
    }

    private void closeLoadedModel(LoadedModel model) {
        if (model == null) {
            return;
        }
        try {
            model.session().close();
        } catch (Exception ignored) {
            // best effort close
        }
    }

    private enum UrlValidationStatus {
        VALID,
        INVALID,
        BLOCKED_PRIVATE_NETWORK,
        BLOCKED_BY_ALLOWLIST
    }

    private record LoadedModel(
            String key,
            OrtSession session,
            String inputName,
            boolean nchw,
            List<String> labels
    ) {
    }

    private record InferenceOutput(String label, double confidence) {
    }

    private static class ModelUnavailableException extends Exception {
        ModelUnavailableException(String message) {
            super(message);
        }
    }

    private static class DaemonThreadFactory implements ThreadFactory {
        private final String threadName;

        private DaemonThreadFactory(String threadName) {
            this.threadName = threadName;
        }

        @Override
        public Thread newThread(Runnable runnable) {
            Thread thread = new Thread(runnable, threadName);
            thread.setDaemon(true);
            return thread;
        }
    }

    @Override
    public void destroy() {
        closeLoadedModel(loadedModel);
        loadedModel = null;
        inferenceExecutor.shutdownNow();
    }
}
