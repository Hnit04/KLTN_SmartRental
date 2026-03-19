package iuh.se.kltn.backend.modules.property.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.property.dto.response.CrawlerResultDto;
import iuh.se.kltn.backend.modules.property.dto.response.CrawlerResultListDto;
import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.enums.RoomType;
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.User;
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

    public List<CrawlerResultDto> crawlPhongTro123() {
        List<Map<String, String>> resultList = new ArrayList<>();
        String targetUrl = "https://phongtro123.com/";

        try {
            log.info("Bắt đầu cào dữ liệu từ: {}", targetUrl);
            Document doc = Jsoup.connect(targetUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .header("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
                    .timeout(10000) 
                    .get();

            log.info("=== DEBUG: Page Title = {} ===", doc.title());
            
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
            log.info("Cào thành công {} bài đăng thô.", resultList.size());

            if (!resultList.isEmpty()) {
                try {
                    List<Map<String, String>> subList = resultList.size() > 5 ? resultList.subList(0, 5) : resultList;
                    
                    for (Map<String, String> item : subList) {
                        String link = item.get("link");
                        if (link != null && !link.isEmpty()) {
                            try {
                                Document detailDoc = Jsoup.connect(link).timeout(10000).get();
                                Elements metaImages = detailDoc.select("meta[property=og:image]");
                                List<String> imageList = new ArrayList<>();
                                for (Element meta : metaImages) {
                                    String content = meta.attr("content");
                                    if (content != null && !content.isEmpty()) {
                                        imageList.add(content);
                                    }
                                }
                                if (!imageList.isEmpty()) {
                                    item.put("image", objectMapper.writeValueAsString(imageList));
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
            
            // Selector đặc thù của Nhatrovn.vn
            Elements postElements = doc.select("a.text-decoration-none:has(div.property-card)");
            
            if (postElements.isEmpty()) {
                log.warn("Không tìm thấy bài đăng nào trên Nhatrovn.vn. Preview: \n{}", 
                         doc.body().html().substring(0, Math.min(doc.body().html().length(), 500)));
            }

            for (Element post : postElements) {
                Map<String, String> data = new HashMap<>();

                String href = post.attr("href");
                if (href != null && !href.isEmpty() && href.contains("/chi-tiet/")) {
                    data.put("link", href.startsWith("http") ? href : "https://nhatrovn.vn" + href);
                    
                    Element imgElement = post.selectFirst("div.property-card-image img");
                    if (imgElement != null) {
                        data.put("title", imgElement.attr("alt"));
                        data.put("image", imgElement.attr("src"));
                    }
                    
                    Element addressElement = post.selectFirst("div.rn-property-address");
                    if (addressElement != null) {
                        data.put("address", addressElement.text());
                        data.put("location", addressElement.text()); 
                    }
                    
                    Element priceElement = post.selectFirst("div.property-card-price");
                    if (priceElement != null) {
                        data.put("price", priceElement.text());
                    }
                    
                    Element vacantBadge = post.selectFirst("div.rn-vacant-badge");
                    if (vacantBadge != null) {
                        data.put("summary", vacantBadge.text());
                    }

                    if (data.containsKey("title") && data.containsKey("price")) {
                        resultList.add(data);
                    }
                }
            }
            log.info("Cào thành công {} bài đăng thô từ Nhatrovn.", resultList.size());

            if (!resultList.isEmpty()) {
                try {
                    List<Map<String, String>> subList = resultList.size() > 5 ? resultList.subList(0, 5) : resultList;
                    
                    for (Map<String, String> item : subList) {
                        String link = item.get("link");
                        if (link != null && !link.isEmpty()) {
                            try {
                                Document detailDoc = Jsoup.connect(link).timeout(10000).get();
                                Elements carouselImgs = detailDoc.select(".property-carousel .carousel-main .carousel-slide img");
                                List<String> imageList = new ArrayList<>();
                                for (Element img : carouselImgs) {
                                    String src = img.attr("src");
                                    if (src != null && !src.isEmpty()) {
                                        imageList.add(src);
                                    }
                                }
                                if (!imageList.isEmpty()) {
                                    item.put("image", objectMapper.writeValueAsString(imageList));
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
            Property property = new Property();
            property.setName(dto.getName());
            property.setDistrict(dto.getDistrict());
            property.setCity(dto.getCity());
            property.setAddress(dto.getAddress());
            property.setDescription(dto.getDescription() != null ? dto.getDescription() + "\n\nNguồn gốc: " + dto.getOriginalLink() : "");
            property.setLandlord(defaultLandlord);
            
            // --- XỬ LÝ HÌNH ẢNH ---
            String imageUrl = dto.getImage();
            if (imageUrl == null || imageUrl.isEmpty()) {
                imageUrl = "[\"https://phongtro123.com/images/default-thumbnail.png\"]"; // Fallback an toàn hơn
            } else if (!imageUrl.startsWith("[")) {
                // Đảm bảo là dạng JSON array string
                imageUrl = "[\"" + imageUrl + "\"]";
            }
            
            // --- THÊM DỮ LIỆU MẶC ĐỊNH ĐỂ TRÁNH NULL TRÊN UI ---
            property.setLatitude(10.762622 + (Math.random() * 0.1 - 0.05)); // Quanh khu vực trung tâm HCM
            property.setLongitude(106.660172 + (Math.random() * 0.1 - 0.05));
            property.setIsAiGeneratedDescription(false);
            property.setElecPrice(3500.0);
            property.setWaterPrice(100000.0);
            property.setInternetPrice(100000.0);
            property.setImages(imageUrl);
            
            property = propertyRepository.save(property);

            Room room = new Room();
            room.setProperty(property);
            room.setName("Phòng 1");
            room.setPrice(dto.getPrice() != null ? dto.getPrice() : 1500000.0); // Fallback nếu AI thiếu giá
            room.setArea(dto.getArea() != null ? dto.getArea() : 20.0f);
            room.setStatus(RoomStatus.AVAILABLE);
            room.setType(RoomType.STUDIO);
            
            // --- THÊM DỮ LIỆU MẶC ĐỊNH CHO PHÒNG ---
            room.setMaxOccupants(2);
            room.setCurrentOccupants(0);
            room.setAmenities("[\"WIFI\", \"PARKING\", \"AIR_CONDITIONER\"]");
            room.setDefaultTerms("Tiền cọc 1 tháng, Hợp đồng tối thiểu 6 tháng");
            room.setImages(imageUrl);
            
            roomRepository.save(room);
            savedCount++;
        }
        log.info("✅ Đã lưu thành công {} bài cào (Khu trọ + Phòng) vào Database!", savedCount);
    }
}
