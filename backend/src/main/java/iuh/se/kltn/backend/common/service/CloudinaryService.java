package iuh.se.kltn.backend.common.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class CloudinaryService {

    @Autowired
    private Cloudinary cloudinary;

    // 1. Hàm gốc: Thêm tham số folderName để tái sử dụng linh hoạt
    public String uploadImage(MultipartFile file, String folderName) throws IOException {
        Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(),
                ObjectUtils.asMap(
                        "folder", folderName,
                        "resource_type", "auto"
                ));
        return uploadResult.get("secure_url").toString();
    }

    // 2. Cung cấp lại hàm cũ cho Avatar (để code chỗ upload Avatar của bạn không bị lỗi)
    public String uploadAvatar(MultipartFile file) throws IOException {
        return uploadImage(file, "smart-rental/avatars");
    }

    // 3. Hàm MỚI: Tải lên NHIỀU ẢNH cùng lúc (Dành cho Khu trọ, Phòng trọ)
    public List<String> uploadImages(List<MultipartFile> files, String folderName) throws IOException {
        List<String> imageUrls = new ArrayList<>();
        for (MultipartFile file : files) {
            // Chỉ xử lý nếu file không rỗng
            if (!file.isEmpty()) {
                String url = uploadImage(file, folderName);
                imageUrls.add(url);
            }
        }
        return imageUrls;
    }

    // 4. Hàm Upload RIÊNG TƯ (Dành cho KYC)
    public String uploadPrivateImage(MultipartFile file, String folderName) throws IOException {
        Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(),
                ObjectUtils.asMap(
                        "folder", folderName,
                        "resource_type", "auto",
                        "type", "authenticated" // Chỉ truy cập được qua Signed URL
                ));
        return uploadResult.get("secure_url").toString();
    }

    // 5. Tạo Signed URL (Hạn dùng 10 phút)
    public String generateSignedUrl(String publicId) {
        if (publicId == null || publicId.isEmpty()) return null;
        
        long expiresAt = System.currentTimeMillis() / 1000 + 600; // 10 phút
        return cloudinary.url()
                .type("authenticated")
                .signed(true)
                .generate(publicId) + "?token=" + expiresAt; 
        // Lưu ý: Tùy version SDK, có thể cần chỉnh lại format token
    }

    // 6. Xóa ảnh
    public void deleteImage(String url) throws IOException {
        if (url == null || url.isEmpty()) return;
        String publicId = extractPublicId(url);
        if (publicId != null) {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        }
    }

    public String extractPublicId(String url) {
        try {
            // VD: https://res.cloudinary.com/demo/image/authenticated/s--signature--/v1/folder/name.jpg
            // Chúng ta cần lấy "folder/name"
            String[] parts = url.split("/");
            String lastPart = parts[parts.length - 1];
            String fileName = lastPart.split("\\.")[0];
            
            // Tìm phần folder (ví dụ: smart-rental/kyc/...)
            int folderStartIndex = url.indexOf("smart-rental/");
            if (folderStartIndex != -1) {
                String folderAndFile = url.substring(folderStartIndex);
                return folderAndFile.split("\\.")[0];
            }
            return fileName;
        } catch (Exception e) {
            return null;
        }
    }
}