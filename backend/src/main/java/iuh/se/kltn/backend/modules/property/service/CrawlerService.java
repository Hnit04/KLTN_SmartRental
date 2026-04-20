package iuh.se.kltn.backend.modules.property.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.property.dto.response.CrawlerResultDto;
import iuh.se.kltn.backend.modules.property.dto.response.CrawlerResultListDto;
import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.enums.RoomType;
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.ai.dto.ModerationResult;
import iuh.se.kltn.backend.modules.ai.service.ModerationService;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class CrawlerService {

    private final CrawlerAi crawlerAi;
    private final ObjectMapper objectMapper;
    private final PropertyRepository propertyRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final ModerationService moderationService;

    /**
     * Cào dữ liệu từ PhongTro123.com bằng cách parse JSON-LD Schema.org nhúng trong trang.
     * JSON-LD chứa đầy đủ: name, price, address, image, telephone — chính xác hơn CSS selectors.
     */
    public List<CrawlerResultDto> crawlPhongTro123() {
        List<Map<String, String>> resultList = new ArrayList<>();
        String targetUrl = "https://phongtro123.com/";

        try {
            log.info("Bắt đầu cào dữ liệu từ: {}", targetUrl);
            Document doc = Jsoup.connect(targetUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .header("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
                    .timeout(15000)
                    .get();

            log.info("=== DEBUG: Page Title = {} ===", doc.title());

            // === PHƯƠNG PHÁP 1: Parse JSON-LD Schema.org (ưu tiên - chính xác nhất) ===
            Elements jsonLdScripts = doc.select("script[type=application/ld+json]");
            for (Element script : jsonLdScripts) {
                try {
                    String jsonText = script.html().trim();
                    if (jsonText.isEmpty()) continue;

                    JsonNode node = objectMapper.readTree(jsonText);
                    // Chỉ lấy loại Hostel/LodgingBusiness (phòng trọ)
                    String type = node.has("@type") ? node.get("@type").asText() : "";
                    if (!"Hostel".equals(type) && !"LodgingBusiness".equals(type)) continue;

                    Map<String, String> data = new HashMap<>();
                    data.put("title", getJsonText(node, "name"));
                    data.put("summary", getJsonText(node, "description"));
                    data.put("link", getJsonText(node, "url"));
                    data.put("image", getJsonText(node, "image"));
                    data.put("price", getJsonText(node, "priceRange")); // Đã là số VD: "1100000"
                    data.put("phone", getJsonText(node, "telephone"));

                    // Parse address từ JSON-LD
                    if (node.has("address")) {
                        JsonNode addr = node.get("address");
                        String street = getJsonText(addr, "streetAddress");
                        String locality = getJsonText(addr, "addressLocality");
                        // Loại bỏ markdown link syntax khỏi streetAddress
                        // VD: "34 đường 36, Phường Tân Quy, [Quận 7, Hồ Chí Minh](https://...)"
                        if (street != null) {
                            street = street.replaceAll("\\[([^\\]]+)\\]\\([^)]+\\)", "$1");
                        }
                        data.put("address", street);
                        data.put("city", locality);
                    }

                    if (data.containsKey("title") && !data.get("title").isEmpty()) {
                        resultList.add(data);
                    }
                } catch (Exception e) {
                    log.debug("Bỏ qua JSON-LD block không hợp lệ: {}", e.getMessage());
                }
            }

            // === PHƯƠNG PHÁP 2: Fallback dùng CSS Selectors nếu JSON-LD trống ===
            if (resultList.isEmpty()) {
                log.info("JSON-LD trống, fallback sang CSS selectors...");
                Elements postElements = doc.select("ul.post__listing > li");

                if (postElements.isEmpty()) {
                    log.warn("Không tìm thấy bài đăng nào. Có thể Selector đã bị đổi. Preview: \n{}",
                            doc.body().html().substring(0, Math.min(doc.body().html().length(), 500)));
                }

                for (Element post : postElements) {
                    Map<String, String> data = new HashMap<>();

                    Element titleElement = post.selectFirst("h3 a");
                    if (titleElement != null) {
                        data.put("title", titleElement.text());
                        String href = titleElement.attr("href");
                        data.put("link", href.startsWith("http") ? href : "https://phongtro123.com" + href);
                    }

                    Element priceElement = post.selectFirst("span.text-green");
                    if (priceElement != null) {
                        data.put("price", priceElement.text());
                    }

                    Element acreageElement = post.selectFirst("span:has(sup)");
                    if (acreageElement != null) {
                        data.put("acreage", acreageElement.text());
                    }

                    Element locationElement = post.selectFirst("a.text-body");
                    if (locationElement != null) {
                        data.put("location", locationElement.text());
                    }

                    Element summaryElement = post.selectFirst("p.line-clamp-2");
                    if (summaryElement != null) {
                        data.put("summary", summaryElement.text());
                    }

                    Element imgElement = post.selectFirst("img");
                    if (imgElement != null) {
                        String src = imgElement.attr("data-src");
                        if (src == null || src.isEmpty()) src = imgElement.attr("src");
                        data.put("image", src);
                    }

                    if (!data.isEmpty()) {
                        resultList.add(data);
                    }
                }
            }

            log.info("Cào thành công {} bài đăng thô từ PhongTro123.", resultList.size());

            if (!resultList.isEmpty()) {
                try {
                    List<Map<String, String>> subList = resultList.size() > 5 ? resultList.subList(0, 5) : resultList;

                    // Lấy thêm ảnh từ trang chi tiết
                    for (Map<String, String> item : subList) {
                        String link = item.get("link");
                        if (link != null && !link.isEmpty()) {
                            try {
                                Document detailDoc = Jsoup.connect(link)
                                        .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                                        .timeout(10000)
                                        .get();
                                Elements metaImages = detailDoc.select("meta[property=og:image]");
                                List<String> imageList = new ArrayList<>();
                                for (Element meta : metaImages) {
                                    String content = meta.attr("content");
                                    if (content != null && !content.isEmpty()) {
                                        imageList.add(content);
                                    }
                                }
                                // Fallback: nếu đã có ảnh đơn từ JSON-LD, thêm vào list
                                if (imageList.isEmpty() && item.containsKey("image") && !item.get("image").startsWith("[")) {
                                    imageList.add(item.get("image"));
                                }
                                if (!imageList.isEmpty()) {
                                    item.put("image", objectMapper.writeValueAsString(imageList));
                                }

                                // Lấy thêm diện tích từ chi tiết nếu chưa có
                                if (!item.containsKey("acreage")) {
                                    Element areaEl = detailDoc.selectFirst("span:has(sup)");
                                    if (areaEl != null) {
                                        item.put("acreage", areaEl.text());
                                    }
                                }
                            } catch (Exception e) {
                                log.warn("Không thể lấy ảnh từ trang chi tiết Phongtro123: {}", link);
                            }
                        }
                    }

                    String rawJsonList = objectMapper.writeValueAsString(subList);

                    log.info("Bắt đầu gửi dữ liệu cho AI phân tích ({}) items...", subList.size());
                    CrawlerResultListDto parsedDataWrapper = crawlerAi.parseCrawlerData(rawJsonList);
                    List<CrawlerResultDto> parsedData = parsedDataWrapper != null && parsedDataWrapper.getResults() != null ? parsedDataWrapper.getResults() : new ArrayList<>();
                    log.info("AI phân tích thành công {} kết quả", parsedData.size());

                    // SAVE TO DATABASE
                    saveCrawledDataToDatabase(parsedData);

                    return parsedData;
                } catch (Exception e) {
                    log.error("Lỗi khi AI phân tích dữ liệu: ", e);
                }
            }

        } catch (IOException e) {
            log.error("Lỗi khi kết nối tới website để cào dữ liệu: ", e);
        }

        return new ArrayList<>();
    }

    /**
     * Cào dữ liệu từ NhaTroVn.vn
     */
    public List<CrawlerResultDto> crawlNhaTroVn() {
        List<Map<String, String>> resultList = new ArrayList<>();
        String targetUrl = "https://nhatrovn.vn/";

        try {
            log.info("Bắt đầu cào dữ liệu từ Nhatrovn: {}", targetUrl);
            Document doc = Jsoup.connect(targetUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .header("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
                    .timeout(15000)
                    .get();

            log.info("=== DEBUG: Page Title = {} ===", doc.title());

            // Selector: các thẻ <a> chứa property-card và link có /chi-tiet/
            Elements postElements = doc.select("a[href*=/chi-tiet/]");

            if (postElements.isEmpty()) {
                // Fallback selector
                postElements = doc.select("a.text-decoration-none:has(div.property-card)");
            }

            if (postElements.isEmpty()) {
                log.warn("Không tìm thấy bài đăng nào trên Nhatrovn.vn. Preview: \n{}",
                        doc.body().html().substring(0, Math.min(doc.body().html().length(), 500)));
            }

            for (Element post : postElements) {
                Map<String, String> data = new HashMap<>();

                String href = post.attr("href");
                if (href == null || href.isEmpty() || !href.contains("/chi-tiet/")) continue;

                data.put("link", href.startsWith("http") ? href : "https://nhatrovn.vn" + href);

                // Lấy nội dung text đầy đủ của card
                String fullText = post.text();

                // Ảnh: thử nhiều selector
                Element imgElement = post.selectFirst("img");
                if (imgElement != null) {
                    String imgSrc = imgElement.attr("src");
                    if (imgSrc == null || imgSrc.isEmpty()) imgSrc = imgElement.attr("data-src");
                    data.put("image", imgSrc);
                    // Alt text thường chứa tên
                    String alt = imgElement.attr("alt");
                    if (alt != null && !alt.isEmpty()) {
                        data.put("title", alt);
                    }
                }

                // Địa chỉ: tìm theo class hoặc theo pattern text
                Element addressElement = post.selectFirst("[class*=address], [class*=Address]");
                if (addressElement != null) {
                    data.put("address", addressElement.text());
                    data.put("location", addressElement.text());
                } else {
                    // Fallback: lấy text dài nhất chứa "Phường" hoặc "Quận"
                    extractAddressFromText(fullText, data);
                }

                // Giá: tìm theo class hoặc text pattern
                Element priceElement = post.selectFirst("[class*=price], [class*=Price]");
                if (priceElement != null) {
                    data.put("price", priceElement.text());
                } else {
                    extractPriceFromText(fullText, data);
                }

                // Vacant badge + Tổng phòng
                Element vacantBadge = post.selectFirst("[class*=vacant], [class*=Vacant]");
                if (vacantBadge != null) {
                    data.put("summary", vacantBadge.text());
                }

                // Parse tổng phòng từ text: "Tổng: 7 phòng"
                if (fullText.contains("Tổng:")) {
                    String totalStr = fullText.replaceAll(".*Tổng:\\s*(\\d+)\\s*phòng.*", "$1");
                    if (totalStr.matches("\\d+")) {
                        data.put("totalRooms", totalStr);
                    }
                }

                // Chỉ thêm nếu có link và ít nhất 1 data field
                if (data.containsKey("link") && data.size() > 1) {
                    resultList.add(data);
                }
            }
            log.info("Cào thành công {} bài đăng thô từ Nhatrovn.", resultList.size());

            if (!resultList.isEmpty()) {
                try {
                    List<Map<String, String>> subList = resultList.size() > 5 ? resultList.subList(0, 5) : resultList;

                    // Lấy thêm ảnh từ trang chi tiết
                    for (Map<String, String> item : subList) {
                        String link = item.get("link");
                        if (link != null && !link.isEmpty()) {
                            try {
                                Document detailDoc = Jsoup.connect(link)
                                        .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                                        .timeout(10000)
                                        .get();
                                // Lấy nhiều ảnh từ carousel hoặc gallery
                                Elements carouselImgs = detailDoc.select(".property-carousel img, .carousel-slide img, .swiper-slide img, img[class*=property]");
                                List<String> imageList = new ArrayList<>();
                                for (Element img : carouselImgs) {
                                    String src = img.attr("src");
                                    if (src == null || src.isEmpty()) src = img.attr("data-src");
                                    if (src != null && !src.isEmpty() && !src.contains("placeholder") && !src.contains("logo")) {
                                        imageList.add(src);
                                    }
                                }
                                if (!imageList.isEmpty()) {
                                    item.put("image", objectMapper.writeValueAsString(imageList));
                                }

                                // Nếu chưa có title, lấy từ trang chi tiết
                                if (!item.containsKey("title") || item.get("title").isEmpty()) {
                                    Element titleEl = detailDoc.selectFirst("h1, .property-title, title");
                                    if (titleEl != null) {
                                        item.put("title", titleEl.text().replace(" - Nhatrovn", ""));
                                    }
                                }
                            } catch (Exception e) {
                                log.warn("Không thể lấy ảnh từ trang chi tiết Nhatrovn: {}", link);
                            }
                        }
                    }

                    String rawJsonList = objectMapper.writeValueAsString(subList);

                    log.info("Bắt đầu gửi dữ liệu cho AI phân tích ({}) items...", subList.size());
                    CrawlerResultListDto parsedDataWrapper = crawlerAi.parseCrawlerData(rawJsonList);
                    List<CrawlerResultDto> parsedData = parsedDataWrapper != null && parsedDataWrapper.getResults() != null ? parsedDataWrapper.getResults() : new ArrayList<>();
                    log.info("AI phân tích thành công {} kết quả", parsedData.size());

                    // SAVE TO DATABASE
                    saveCrawledDataToDatabase(parsedData);

                    return parsedData;
                } catch (Exception e) {
                    log.error("Lỗi khi AI phân tích dữ liệu Nhatrovn: ", e);
                }
            }
        } catch (IOException e) {
            log.error("Lỗi khi kết nối tới website Nhatrovn để cào dữ liệu: ", e);
        }

        return new ArrayList<>();
    }

    /**
     * Lưu dữ liệu đã cào vào Database.
     * Đồng bộ đầy đủ với entity Property và Room.
     */
    @Transactional
    public void saveCrawledDataToDatabase(List<CrawlerResultDto> dtos) {
        if (dtos == null || dtos.isEmpty()) return;

        List<User> landlords = userRepository.findAllByRole(Role.LANDLORD);
        if (landlords.isEmpty()) {
            log.warn("Không tìm thấy Landlord (Chủ trọ) nào để gán cho Property cào về! Hủy thao tác lưu.");
            return;
        }
        Landlord defaultLandlord = (Landlord) landlords.get(0);

        int savedCount = 0;
        for (CrawlerResultDto dto : dtos) {
            try {
                // === TẠO PROPERTY ===
                Property property = new Property();
                property.setName(dto.getName());
                property.setDistrict(dto.getDistrict());
                property.setCity(dto.getCity());
                property.setAddress(dto.getAddress());
                property.setDescription(buildPropertyDescription(dto));
                property.setLandlord(defaultLandlord);

                // Tọa độ random quanh HCM
                property.setLatitude(10.762622 + (Math.random() * 0.1 - 0.05));
                property.setLongitude(106.660172 + (Math.random() * 0.1 - 0.05));
                property.setIsAiGeneratedDescription(false);

                // Giá dịch vụ mặc định
                property.setElecPrice(3500.0);
                property.setWaterPrice(100000.0);
                property.setInternetPrice(100000.0);

                // Hình ảnh
                String imageUrl = normalizeImageUrl(dto.getImage());
                property.setImages(imageUrl);

                // ✅ QUAN TRỌNG: Set status APPROVED để hiển thị trên UI
                property.setStatus(PropertyStatus.APPROVED);

                // Kiểm duyệt AI
                ModerationResult modResult = moderationService.checkContent(
                        (property.getName() != null ? property.getName() : "") + "\n" +
                        (property.getDescription() != null ? property.getDescription() : "")
                );
                property.setSafetyScore(modResult.getScore());
                property.setModerationReason(modResult.getReason());

                property = propertyRepository.save(property);

                // === TẠO ROOM(S) ===
                int totalRooms = (dto.getTotalRooms() != null && dto.getTotalRooms() > 0) ? Math.min(dto.getTotalRooms(), 5) : 1;
                RoomType roomType = parseRoomType(dto.getRoomType());
                boolean hasMezzanine = Boolean.TRUE.equals(dto.getHasMezzanine());
                boolean hasBalcony = Boolean.TRUE.equals(dto.getHasBalcony());
                String amenitiesJson = buildAmenitiesJson(dto.getAmenitiesList());

                for (int i = 1; i <= totalRooms; i++) {
                    Room room = new Room();
                    room.setProperty(property);
                    room.setName("Phòng " + i);
                    room.setPrice(dto.getPrice() != null ? dto.getPrice() : 2000000.0);
                    room.setArea(dto.getArea() != null ? dto.getArea() : 20.0f);

                    // ✅ Set status phù hợp: phòng đầu available, phòng sau ngẫu nhiên
                    if (i == 1) {
                        room.setStatus(RoomStatus.AVAILABLE);
                    } else {
                        room.setStatus(Math.random() > 0.5 ? RoomStatus.AVAILABLE : RoomStatus.RENTED);
                    }

                    // ✅ Loại phòng suy luận từ dữ liệu
                    room.setType(roomType);

                    // ✅ Thông tin gác lửng, ban công
                    room.setHasMezzanine(hasMezzanine);
                    room.setHasBalcony(hasBalcony);

                    // ✅ Số người
                    room.setMaxOccupants(roomType == RoomType.SHARED_ROOM ? 4 : 2);
                    room.setCurrentOccupants(room.getStatus() == RoomStatus.RENTED ? 1 : 0);

                    // ✅ Tiện ích thực tế từ AI parse
                    room.setAmenities(amenitiesJson);

                    // ✅ Mô tả phòng
                    room.setDescription(dto.getDescription());

                    // ✅ Điều khoản
                    room.setDefaultTerms("Tiền cọc 1 tháng, Hợp đồng tối thiểu 6 tháng");

                    // ✅ Ảnh phòng = ảnh property
                    room.setImages(imageUrl);

                    // ✅ QUAN TRỌNG: approvalStatus APPROVED
                    room.setApprovalStatus(PropertyStatus.APPROVED);

                    // Điểm kiểm duyệt
                    room.setSafetyScore(modResult.getScore());
                    room.setModerationReason(modResult.getReason());

                    roomRepository.save(room);
                }
                savedCount++;
            } catch (Exception e) {
                log.error("Lỗi khi lưu bài cào '{}': {}", dto.getName(), e.getMessage());
            }
        }
        log.info("✅ Đã lưu thành công {} bài cào (Khu trọ + Phòng) vào Database!", savedCount);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Lấy text từ JsonNode an toàn
     */
    private String getJsonText(JsonNode node, String field) {
        if (node == null || !node.has(field)) return null;
        JsonNode value = node.get(field);
        if (value.isNull()) return null;
        return value.asText();
    }

    /**
     * Chuẩn hóa URL ảnh thành JSON array string
     */
    private String normalizeImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return "[\"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400\"]";
        }
        if (imageUrl.startsWith("[")) {
            return imageUrl; // Đã là JSON array
        }
        return "[\"" + imageUrl + "\"]";
    }

    /**
     * Build mô tả Property từ DTO
     */
    private String buildPropertyDescription(CrawlerResultDto dto) {
        StringBuilder sb = new StringBuilder();
        if (dto.getDescription() != null && !dto.getDescription().isEmpty()) {
            sb.append(dto.getDescription());
        }
        if (dto.getOriginalLink() != null && !dto.getOriginalLink().isEmpty()) {
            if (sb.length() > 0) sb.append("\n\n");
            sb.append("Nguồn gốc: ").append(dto.getOriginalLink());
        }
        if (dto.getPhone() != null && !dto.getPhone().isEmpty()) {
            if (sb.length() > 0) sb.append("\n");
            sb.append("Liên hệ: ").append(dto.getPhone());
        }
        return sb.length() > 0 ? sb.toString() : "Phòng trọ cho thuê";
    }

    /**
     * Parse RoomType từ chuỗi string (AI trả về)
     */
    private RoomType parseRoomType(String type) {
        if (type == null || type.isEmpty()) return RoomType.SINGLE_ROOM;
        try {
            return RoomType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            // Fallback: match theo keyword
            String lower = type.toLowerCase();
            if (lower.contains("mezzanine") || lower.contains("gác")) return RoomType.MEZZANINE_ROOM;
            if (lower.contains("shared") || lower.contains("ghép") || lower.contains("ktx")) return RoomType.SHARED_ROOM;
            if (lower.contains("studio") || lower.contains("duplex")) return RoomType.STUDIO;
            if (lower.contains("one") || lower.contains("1_bed")) return RoomType.ONE_BEDROOM;
            if (lower.contains("two") || lower.contains("2_bed")) return RoomType.TWO_BEDROOM;
            return RoomType.SINGLE_ROOM;
        }
    }

    /**
     * Build JSON array string cho amenities từ list AI trả về
     */
    private String buildAmenitiesJson(List<String> amenitiesList) {
        if (amenitiesList == null || amenitiesList.isEmpty()) {
            // Mặc định tối thiểu
            return "[\"WIFI\"]";
        }
        try {
            return objectMapper.writeValueAsString(amenitiesList);
        } catch (Exception e) {
            return "[\"WIFI\"]";
        }
    }

    /**
     * Trích xuất địa chỉ từ text (fallback cho NhaTroVn)
     */
    private void extractAddressFromText(String text, Map<String, String> data) {
        if (text == null) return;
        // Tìm đoạn text chứa "Phường" hoặc "Quận"
        String[] parts = text.split("\n");
        for (String part : parts) {
            part = part.trim();
            if ((part.contains("Phường") || part.contains("Quận") || part.contains("Thành phố")) && part.length() > 15) {
                data.put("address", part);
                data.put("location", part);
                return;
            }
        }
    }

    /**
     * Trích xuất giá từ text (fallback cho NhaTroVn)
     */
    private void extractPriceFromText(String text, Map<String, String> data) {
        if (text == null) return;
        // Pattern: "Giá: X triệu" hoặc "Giá từ: X đến Y triệu"
        if (text.contains("Giá")) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("Giá[^:]*:\\s*([\\d.,]+)").matcher(text);
            if (m.find()) {
                data.put("price", m.group(1) + " triệu");
            }
        }
    }
}
