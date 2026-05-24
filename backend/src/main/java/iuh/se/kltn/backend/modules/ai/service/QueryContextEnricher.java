package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.EnrichedQuery;
import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class QueryContextEnricher {

    private static final double FALLBACK_DEFAULT_RADIUS_KM = 5.0;
    private static final String SORT_PRICE_ASC = "PRICE_ASC";
    private static final String SORT_NEAREST_THEN_PRICE = "NEAREST_THEN_PRICE";
    private static final String SORT_PRICE_ASC_WITH_DISTANCE = "PRICE_ASC_WITH_DISTANCE";
    private static final Pattern STANDALONE_CHEAP_WORD_PATTERN = Pattern.compile("\\bre\\b");

    private final UserRepository userRepository;
    private final AiRuntimeProperties aiRuntimeProperties;

    public QueryContextEnricher(UserRepository userRepository, AiRuntimeProperties aiRuntimeProperties) {
        this.userRepository = userRepository;
        this.aiRuntimeProperties = aiRuntimeProperties;
    }

    public EnrichedQuery enrich(
            String question,
            SystemIntent intent,
            Map<String, Object> params,
            Long userId,
            String role,
            Double lat,
            Double lng
    ) {
        return enrich(question, intent, params, userId, role, lat, lng, null);
    }

    public EnrichedQuery enrich(
            String question,
            SystemIntent intent,
            Map<String, Object> params,
            Long userId,
            String role,
            Double lat,
            Double lng,
            iuh.se.kltn.backend.modules.ai.dto.request.AiPageContext validatedContext
    ) {
        SystemIntent safeIntent = intent == null ? SystemIntent.UNKNOWN : intent;
        Map<String, Object> enrichedParams = params == null ? new HashMap<>() : new HashMap<>(params);
        List<String> assumptions = new ArrayList<>();
        String normalizedQuestion = normalize(question);
        boolean hasGps = hasValidCoordinates(lat, lng);

        if (isDeicticReferenceWithoutContext(normalizedQuestion)) {
            if (validatedContext != null && validatedContext.getEntityId() != null) {
                String entityType = validatedContext.getEntityType();
                Long entityId = validatedContext.getEntityId();
                if ("ROOM".equals(entityType)) {
                    enrichedParams.put("roomId", entityId);
                    assumptions.add("(Dữ liệu phòng được tự động trích xuất từ màn hình hiện tại)");
                } else if ("PROPERTY".equals(entityType)) {
                    enrichedParams.put("propertyId", entityId);
                    assumptions.add("(Dữ liệu khu trọ được tự động trích xuất từ màn hình hiện tại)");
                } else if ("CONTRACT".equals(entityType)) {
                    enrichedParams.put("contractId", entityId);
                    assumptions.add("(Dữ liệu hợp đồng được tự động trích xuất từ màn hình hiện tại)");
                } else if ("BILL".equals(entityType)) {
                    enrichedParams.put("billId", entityId);
                    assumptions.add("(Dữ liệu hóa đơn được tự động trích xuất từ màn hình hiện tại)");
                }
            } else {
                return clarification(
                        safeIntent,
                        enrichedParams,
                        "Bạn muốn nói đến phòng, khu trọ, hóa đơn hay hợp đồng nào?",
                        assumptions,
                        "DEICTIC_REFERENCE_WITHOUT_CONTEXT"
                );
            }
        }

        if (isAmbiguousLandlordBillQuestion(normalizedQuestion, role)) {
            return clarification(
                    safeIntent,
                    enrichedParams,
                    "Bạn muốn xem doanh thu đã thu hay danh sách khách thuê chưa thanh toán?",
                    assumptions,
                    "LANDLORD_BILL_AMBIGUOUS"
            );
        }

        boolean nearMeCue = hasNearMeCue(normalizedQuestion);
        if (nearMeCue && (safeIntent == SystemIntent.SEARCH_ROOM || safeIntent == SystemIntent.LOCATION_SEARCH)) {
            if (!hasGps) {
                return clarification(
                    safeIntent,
                    enrichedParams,
                    "Bạn vui lòng bật quyền vị trí để mình tìm phòng gần bạn.",
                    assumptions,
                    "NEAR_ME_WITHOUT_GPS"
                );
            }
            putCurrentLocationParams(enrichedParams, lat, lng, SORT_NEAREST_THEN_PRICE);
            assumptions.add("Ưu tiên phòng gần vị trí hiện tại của bạn.");
        }

        switch (safeIntent) {
            case SEARCH_ROOM -> {
                handleSearchRoomEnrichment(normalizedQuestion, enrichedParams, userId, hasGps, lat, lng, assumptions);
                if (!hasLocationContext(enrichedParams)) {
                    return clarification(
                            safeIntent,
                            enrichedParams,
                            "Bạn muốn tìm phòng ở khu vực nào?",
                            assumptions,
                            "SEARCH_ROOM_MISSING_LOCATION"
                    );
                }
            }
            case LOCATION_SEARCH -> {
                if (!nearMeCue && !hasLocationContext(enrichedParams)) {
                    return clarification(
                            safeIntent,
                            enrichedParams,
                            "Bạn muốn tìm phòng ở khu vực nào?",
                            assumptions,
                            "LOCATION_SEARCH_MISSING_LOCATION"
                    );
                }
            }
            case VIEW_BILL -> handleViewBillEnrichment(enrichedParams, role, assumptions);
            case VIEW_DEBT -> {
                // Intentionally no-op: debt query should rely on current authenticated user in DQE.
            }
            case VIEW_CONTRACT -> {
                // Keep minimal in MVP. Do not guess contract from short-term conversation/page context.
            }
            default -> {
                // Keep original behavior for remaining intents.
            }
        }

        return EnrichedQuery.builder()
                .intent(safeIntent)
                .params(enrichedParams)
                .shouldAskClarification(false)
                .clarificationMessage(null)
                .assumptions(assumptions)
                .enrichmentReason(assumptions.isEmpty() ? "NO_ENRICHMENT" : "CONTEXT_ENRICHED")
                .build();
    }

    private EnrichedQuery clarification(
            SystemIntent intent,
            Map<String, Object> params,
            String message,
            List<String> assumptions,
            String reason
    ) {
        return EnrichedQuery.builder()
                .intent(intent)
                .params(params)
                .shouldAskClarification(true)
                .clarificationMessage(message)
                .assumptions(assumptions)
                .enrichmentReason(reason)
                .build();
    }

    private void handleSearchRoomEnrichment(
            String normalizedQuestion,
            Map<String, Object> params,
            Long userId,
            boolean hasGps,
            Double lat,
            Double lng,
            List<String> assumptions
    ) {
        boolean missingLocation = !hasLocationContext(params);

        if (missingLocation && hasGps) {
            putCurrentLocationParams(params, lat, lng, SORT_NEAREST_THEN_PRICE);
            assumptions.add("Ưu tiên phòng gần vị trí hiện tại của bạn.");
        }

        if (isCheapCue(normalizedQuestion) && !hasPriceBoundary(params)) {
            params.putIfAbsent("priceMode", "CHEAP");
            if (hasValidCoordinatesFromParams(params)) {
                params.put("sort", SORT_PRICE_ASC_WITH_DISTANCE);
                assumptions.add("Ưu tiên phòng giá thấp gần vị trí hiện tại của bạn.");
            } else {
                params.putIfAbsent("sort", SORT_PRICE_ASC);
                assumptions.add("Ưu tiên các phòng có giá thấp.");
            }
        }

        if (!hasLocationContext(params)) {
            Optional<LocationHint> locationHint = resolveProfileLocation(userId);
            if (locationHint.isPresent()) {
                LocationHint hint = locationHint.get();
                if (hint.city != null && !hint.city.isBlank()) {
                    params.putIfAbsent("city", hint.city);
                }
                if (hint.district != null && !hint.district.isBlank()) {
                    params.putIfAbsent("district", hint.district);
                }
                params.putIfAbsent("sort", SORT_PRICE_ASC);
                assumptions.add("Dang tam su dung khu vuc trong ho so cua ban de tim phong.");
            }
        }
    }

    private void handleViewBillEnrichment(Map<String, Object> params, String role, List<String> assumptions) {
        if (!"TENANT".equalsIgnoreCase(role)) {
            return;
        }
        boolean hasMonth = params.containsKey("month");
        boolean hasYear = params.containsKey("year");
        if (!hasMonth || !hasYear) {
            LocalDate now = LocalDate.now();
            params.putIfAbsent("month", now.getMonthValue());
            params.putIfAbsent("year", now.getYear());
            assumptions.add("Minh dang xem hoa don thang hien tai cua ban.");
        }
    }

    private Optional<LocationHint> resolveProfileLocation(Long userId) {
        if (userId == null || userId <= 0) {
            return Optional.empty();
        }
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }
        String currentAddress = userOpt.get().getCurrentAddress();
        if (currentAddress == null || currentAddress.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(parseLocationHintFromAddress(currentAddress));
    }

    private LocationHint parseLocationHintFromAddress(String rawAddress) {
        String normalized = normalize(rawAddress);
        String district = extractDistrict(normalized);
        String city = extractCity(normalized);
        if ((district == null || district.isBlank()) && (city == null || city.isBlank())) {
            return null;
        }
        return new LocationHint(district, city);
    }

    private String extractDistrict(String normalizedAddress) {
        Matcher numericDistrict = Pattern.compile("\\b(?:quan|q)\\s*(\\d{1,2})\\b").matcher(normalizedAddress);
        if (numericDistrict.find()) {
            return "Quan " + numericDistrict.group(1);
        }

        Map<String, String> districtAlias = Map.ofEntries(
                Map.entry("go vap", "Go Vap"),
                Map.entry("binh thanh", "Binh Thanh"),
                Map.entry("phu nhuan", "Phu Nhuan"),
                Map.entry("tan binh", "Tan Binh"),
                Map.entry("tan phu", "Tan Phu"),
                Map.entry("binh tan", "Binh Tan"),
                Map.entry("thu duc", "Thu Duc"),
                Map.entry("hoc mon", "Hoc Mon"),
                Map.entry("cu chi", "Cu Chi"),
                Map.entry("nha be", "Nha Be"),
                Map.entry("can gio", "Can Gio"),
                Map.entry("binh chanh", "Binh Chanh")
        );

        for (Map.Entry<String, String> entry : districtAlias.entrySet()) {
            if (normalizedAddress.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private String extractCity(String normalizedAddress) {
        if (containsAny(normalizedAddress, "tp hcm", "tphcm", "ho chi minh", "sai gon")) {
            return "TP.HCM";
        }
        if (containsAny(normalizedAddress, "ha noi")) {
            return "Ha Noi";
        }

        Matcher matcher = Pattern.compile("\\b(?:thanh pho|tp|tinh)\\s+([a-z0-9\\s]{2,40})\\b").matcher(normalizedAddress);
        if (matcher.find()) {
            return toTitleCase(matcher.group(1));
        }
        return null;
    }

    private String toTitleCase(String text) {
        if (text == null || text.isBlank()) {
            return text;
        }
        String[] parts = text.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(part.substring(0, 1).toUpperCase(Locale.ROOT))
                    .append(part.substring(1).toLowerCase(Locale.ROOT));
        }
        return sb.toString();
    }

    private void putCurrentLocationParams(Map<String, Object> params, Double lat, Double lng, String sortMode) {
        params.put("lat", lat);
        params.put("lng", lng);
        params.putIfAbsent("radiusKm", resolveDefaultRadiusKm());
        params.put("sort", sortMode);
    }

    private double resolveDefaultRadiusKm() {
        if (aiRuntimeProperties == null || aiRuntimeProperties.getSearch() == null) {
            return FALLBACK_DEFAULT_RADIUS_KM;
        }
        double configured = aiRuntimeProperties.getSearch().getDefaultRadiusKm();
        return configured > 0 ? configured : FALLBACK_DEFAULT_RADIUS_KM;
    }

    private boolean hasLocationContext(Map<String, Object> params) {
        if (params == null || params.isEmpty()) {
            return false;
        }
        if (params.containsKey("district") || params.containsKey("city") || params.containsKey("location")) {
            return true;
        }
        return hasValidCoordinatesFromParams(params);
    }

    private boolean hasValidCoordinatesFromParams(Map<String, Object> params) {
        Double lat = toDouble(params.get("lat"));
        Double lng = toDouble(params.get("lng"));
        return hasValidCoordinates(lat, lng);
    }

    private boolean hasPriceBoundary(Map<String, Object> params) {
        return params.containsKey("max_price") || params.containsKey("min_price");
    }

    private boolean hasNearMeCue(String normalizedQuestion) {
        return containsAny(
                normalizedQuestion,
                "gan toi",
                "o gan toi",
                "quanh toi",
                "gan day",
                "quanh day",
                "xung quanh day",
                "vi tri hien tai",
                "vi tri cua toi",
                "near me",
                "around me",
                "nearby"
        );
    }

    private boolean isCheapCue(String normalizedQuestion) {
        if (normalizedQuestion == null || normalizedQuestion.isBlank()) {
            return false;
        }
        if (containsAny(
                normalizedQuestion,
                "gia re",
                "re nhat",
                "phong re",
                "gia mem",
                "sinh vien",
                "tiet kiem"
        )) {
            return true;
        }
        return STANDALONE_CHEAP_WORD_PATTERN.matcher(normalizedQuestion).find();
    }

    private boolean isDeicticReferenceWithoutContext(String normalizedQuestion) {
        return containsAny(
                normalizedQuestion,
                "phong nay",
                "hoa don nay",
                "bill nay",
                "hop dong nay"
        );
    }

    private boolean isAmbiguousLandlordBillQuestion(String normalizedQuestion, String role) {
        if (!"LANDLORD".equalsIgnoreCase(role)) {
            return false;
        }
        boolean hasBillCue = containsAny(normalizedQuestion, "hoa don", "bill", "tien phong", "tien dien", "tien nuoc");
        if (!hasBillCue) {
            return false;
        }
        boolean hasRevenueCue = containsAny(normalizedQuestion, "doanh thu", "tong thu", "da thu", "thu nhap");
        boolean hasDebtorCue = containsAny(normalizedQuestion, "khach", "chua dong", "con no", "no tien", "qua han", "tre han");
        return !hasRevenueCue && !hasDebtorCue;
    }

    private boolean hasValidCoordinates(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return false;
        }
        if (latitude.isNaN() || longitude.isNaN() || latitude.isInfinite() || longitude.isInfinite()) {
            return false;
        }
        return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    }

    private Double toDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean containsAny(String text, String... tokens) {
        if (text == null || text.isBlank()) {
            return false;
        }
        for (String token : tokens) {
            if (token != null && !token.isBlank() && text.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String lower = text.toLowerCase(Locale.ROOT);
        String noAccent = Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return noAccent.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private static final class LocationHint {
        private final String district;
        private final String city;

        private LocationHint(String district, String city) {
            this.district = district;
            this.city = city;
        }
    }
}
