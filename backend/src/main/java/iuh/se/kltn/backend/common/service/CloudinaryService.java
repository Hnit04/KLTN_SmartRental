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
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(),
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
}