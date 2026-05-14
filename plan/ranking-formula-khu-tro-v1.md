# Ranking Formula V1 - Khám phá khu trọ

Ngày cập nhật: 2026-05-14
Mục tiêu: xếp hạng khu trọ phù hợp thực tế người dùng, cân bằng khoảng cách, uy tín và đánh giá.

## 1) Nguyên tắc xếp hạng
- Không chỉ dựa vào uy tín hoặc sao.
- Khoảng cách phải ảnh hưởng mạnh nếu người dùng bật vị trí.
- Chủ trọ mới không bị bất lợi quá mức do thiếu lịch sử.
- Rating phải chống nhiễu khi số lượng review còn ít.

## 2) Lớp lọc trước (Hard Filter)
1. Theo bộ lọc user chọn: khu vực, giá, còn phòng, tiện ích.
2. Nếu user bật "Gần tôi": loại kết quả có khoảng cách > `distanceCutoffKm` (mặc định 12km).

## 3) Lớp chấm điểm (Soft Ranking)

### 3.1 Distance score
```
distanceScore = 1 - min(distanceKm, 20) / 20
```
- `distanceKm`: khoảng cách giữa user và khu trọ (Haversine).
- Chuẩn hóa về 0..1.
- Nếu không có vị trí user hoặc khu trọ không có tọa độ: không dùng distance trong final score.

### 3.2 Trust hiệu dụng (giảm bias cho chủ trọ mới)
```
trustBase = reputationScore / 100

kycFactor = VERIFIED:1.0, PENDING:0.85, others:0.70
tenureFactor = clamp01(monthsActive / 24)
historyFactor = clamp01(log1p(completedContracts + 0.35 * onTimeBills) / log1p(120))

trustEvidence = clamp01(0.70 * historyFactor + 0.20 * tenureFactor + 0.10 * kycFactor)
trustEffective = clamp01(trustBase * (0.75 + 0.25 * trustEvidence))
```
- `trustEvidence` và `trustEffective` đều quy về 0..1 để chấm điểm.
- Chủ trọ mới vẫn có baseline, không bị kéo về quá thấp.

### 3.3 Rating Bayes (chống nhiễu ít review)
```
ratingBayesRaw = (v/(v+12)) * avgRating + (12/(v+12)) * C
ratingBayes = ratingBayesRaw / 5
```
- `v`: số review.
- `avgRating`: điểm sao trung bình của khu trọ.
- `C`: điểm sao trung bình toàn hệ thống (mặc định 4.2).
- Output chuẩn hóa: 0..1.

## 4) Final score

### 4.1 Khi có vị trí người dùng
```
finalScore = 100 * (0.40 * distanceScore + 0.35 * trustEffective + 0.25 * ratingBayes)
```

### 4.2 Khi không có vị trí người dùng
```
finalScore = 100 * (0.55 * trustEffective + 0.45 * ratingBayes)
```

## 5) Tie-breaker
1. `availableRooms` cao hơn xếp trước.
2. `minPrice` thấp hơn xếp trước.
3. `id` lớn hơn xếp trước (ưu tiên listing mới khi các chỉ số còn lại ngang nhau).

## 6) Tham số mặc định (config)
- `distanceMaxKm = 20`
- `ratingPriorCount = 12`
- `systemAvgRating = 4.2`
- `weightsWithLocation = [0.40, 0.35, 0.25]`
- `weightsNoLocation = [0.55, 0.45]`

## 7) Checklist validate trước khi bật production
- [ ] A/B test: v1 ranking vs current ranking.
- [ ] Theo dõi CTR card top 10, click map marker, booking_submit.
- [ ] So sánh conversion theo bucket khoảng cách (<3km, 3-8km, >8km).
- [ ] Kiểm tra fairness với landlord mới (0-3 tháng).
- [ ] Kiểm tra phân phối top results theo quận để tránh bias cục bộ.

## 8) Trạng thái triển khai
- [x] Backend ranking tại `PropertyService#getAllProperties(pageable, lat, lng)`.
- [x] API `/api/properties` nhận `lat`, `lng` optional.
- [x] Response có: `averageRating`, `reviewCount`, `trustEvidence`, `trustEffectiveScore`, `ratingBayesScore`, `distanceKm`, `distanceScore`, `rankScore`.
- [x] Frontend list truyền vị trí vào API và hiển thị `Uy tín`, `Rating`, `Khoảng cách` trên `PropertyCard`.
