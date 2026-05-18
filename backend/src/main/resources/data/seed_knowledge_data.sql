-- ================================================================
-- SEED: Knowledge Documents for RAG Pipeline
-- Tự động nạp khi bảng knowledge_documents trống
-- ================================================================

-- 1. Chính sách thuê phòng
INSERT INTO knowledge_documents (id, title, content, source, version, status, content_hash, created_at, updated_at)
VALUES (
    'policy-rental',
    'Chính sách thuê phòng SmartRental',
    'CHÍNH SÁCH THUÊ PHÒNG TRỌ SMARTRENTAL

1. QUY TRÌNH THUÊ PHÒNG:
- Bước 1: Tìm kiếm phòng trọ phù hợp trên ứng dụng SmartRental. Hệ thống hỗ trợ lọc theo khu vực, giá thuê, diện tích, tiện nghi.
- Bước 2: Xem chi tiết phòng, hình ảnh thực tế, đánh giá từ người thuê trước.
- Bước 3: Đặt lịch xem phòng trực tiếp qua tính năng Đặt lịch hẹn. Chủ trọ sẽ xác nhận trong vòng 24 giờ.
- Bước 4: Sau khi xem phòng và đồng ý, tiến hành ký hợp đồng điện tử trên ứng dụng.
- Bước 5: Thanh toán tiền cọc và tiền thuê tháng đầu qua hệ thống thanh toán tích hợp.

2. QUY ĐỊNH VỀ ĐẶT CỌC:
- Tiền cọc tiêu chuẩn bằng 1 tháng tiền thuê phòng.
- Tiền cọc được bảo vệ bằng hợp đồng thông minh (Smart Contract) trên blockchain Ethereum.
- Khi kết thúc hợp đồng đúng hạn và bàn giao phòng đầy đủ, tiền cọc sẽ được hoàn trả 100% trong vòng 7 ngày làm việc.
- Trường hợp chấm dứt hợp đồng trước hạn từ phía người thuê: Người thuê cần thông báo trước ít nhất 30 ngày. Tiền cọc sẽ bị khấu trừ theo thỏa thuận trong hợp đồng, thường là 50% đến 100% tiền cọc tùy thời điểm chấm dứt.
- Trường hợp chấm dứt hợp đồng trước hạn từ phía chủ trọ: Chủ trọ phải thông báo trước 60 ngày và hoàn trả 100% tiền cọc cùng khoản bồi thường tương đương 1 tháng tiền thuê.

3. QUY ĐỊNH VỀ GIA HẠN HỢP ĐỒNG:
- Trước khi hợp đồng hết hạn 30 ngày, hệ thống sẽ tự động gửi thông báo nhắc nhở cho cả chủ trọ và người thuê.
- Người thuê có thể gia hạn hợp đồng trực tiếp trên ứng dụng.
- Giá thuê khi gia hạn có thể được điều chỉnh theo thỏa thuận mới giữa hai bên.',
    'INTERNAL',
    'v1',
    'PUBLISHED',
    'seed-policy-rental-v1',
    NOW(),
    NOW()
);

-- 2. Chính sách thanh toán
INSERT INTO knowledge_documents (id, title, content, source, version, status, content_hash, created_at, updated_at)
VALUES (
    'policy-payment',
    'Chính sách thanh toán và hóa đơn',
    'CHÍNH SÁCH THANH TOÁN VÀ HÓA ĐƠN SMARTRENTAL

1. HÌNH THỨC THANH TOÁN:
- Chuyển khoản ngân hàng qua mã QR tích hợp trong ứng dụng.
- Thanh toán bằng tiền mã hóa (Cryptocurrency) qua ví MetaMask trên mạng Ethereum Sepolia.
- Tiền mặt (chủ trọ tự xác nhận trên hệ thống).

2. CHU KỲ THANH TOÁN:
- Tiền thuê phòng thanh toán hàng tháng, hạn chót vào ngày mùng 5 mỗi tháng.
- Hóa đơn điện nước được chủ trọ tạo trên hệ thống sau khi ghi chỉ số mới.
- Hệ thống tự động tính tiền điện, nước, dịch vụ dựa trên đơn giá đã cấu hình.

3. QUY ĐỊNH THANH TOÁN TRỄ HẠN:
- Sau ngày mùng 5, hóa đơn chuyển sang trạng thái LATE (Trễ hạn).
- Hệ thống AI sẽ tự động soạn tin nhắn nhắc nhở và gửi thông báo đến người thuê.
- Nếu quá 15 ngày chưa thanh toán, chủ trọ có quyền gửi cảnh báo và áp dụng biện pháp theo hợp đồng.

4. HÓA ĐƠN ĐIỆN TỬ:
- Tất cả hóa đơn được lưu trữ điện tử trên hệ thống và có thể tra cứu bất kỳ lúc nào.
- Người thuê có thể xem lịch sử thanh toán, chi tiết tiêu thụ điện nước theo tháng.
- Chủ trọ có thể xuất báo cáo doanh thu theo khu trọ, theo tháng, theo năm.',
    'INTERNAL',
    'v1',
    'PUBLISHED',
    'seed-policy-payment-v1',
    NOW(),
    NOW()
);

-- 3. Chính sách kiểm duyệt
INSERT INTO knowledge_documents (id, title, content, source, version, status, content_hash, created_at, updated_at)
VALUES (
    'policy-moderation',
    'Quy định đăng tin và kiểm duyệt AI',
    'QUY ĐỊNH ĐĂNG TIN VÀ KIỂM DUYỆT NỘI DUNG SMARTRENTAL

1. QUY ĐỊNH ĐĂNG TIN:
- Mỗi phòng trọ phải có ít nhất 3 hình ảnh thực tế, rõ nét.
- Mô tả phòng phải trung thực, đầy đủ thông tin: diện tích, giá thuê, tiện nghi, địa chỉ.
- Nghiêm cấm đăng hình ảnh không liên quan, hình ảnh phản cảm, hoặc hình ảnh gây nhầm lẫn.

2. KIỂM DUYỆT TỰ ĐỘNG BẰNG AI:
- Hệ thống sử dụng mô hình Gemini Vision (VLM) để kiểm duyệt tự động.
- AI sẽ so khớp hình ảnh với mô tả văn bản để đánh giá độ chính xác.
- Điểm kiểm duyệt từ 0-100. Phòng đạt điểm từ 70 trở lên sẽ được duyệt tự động.
- Phòng có điểm dưới 70 sẽ được đánh dấu cần xem xét bởi Admin.

3. VI PHẠM VÀ XỬ LÝ:
- Lần 1: Cảnh báo và yêu cầu chỉnh sửa.
- Lần 2: Tạm khóa tài khoản 7 ngày.
- Lần 3: Khóa vĩnh viễn tài khoản chủ trọ.
- Chủ trọ có quyền khiếu nại qua email hỗ trợ trong vòng 48 giờ.',
    'INTERNAL',
    'v1',
    'PUBLISHED',
    'seed-policy-moderation-v1',
    NOW(),
    NOW()
);

-- 4. Chính sách eKYC
INSERT INTO knowledge_documents (id, title, content, source, version, status, content_hash, created_at, updated_at)
VALUES (
    'policy-ekyc',
    'Quy trình xác minh danh tính eKYC',
    'QUY TRÌNH XÁC MINH DANH TÍNH (eKYC) SMARTRENTAL

1. MỤC ĐÍCH:
- Đảm bảo an toàn cho cả chủ trọ và người thuê.
- Ngăn chặn tài khoản giả mạo, lừa đảo.
- Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.

2. QUY TRÌNH XÁC MINH:
- Bước 1: Người dùng chụp ảnh CCCD/CMND mặt trước và mặt sau.
- Bước 2: Chụp ảnh selfie để đối chiếu khuôn mặt.
- Bước 3: Hệ thống AI tự động trích xuất thông tin từ giấy tờ và so khớp với ảnh selfie.
- Bước 4: Kết quả xác minh được trả về trong vòng 30 giây.

3. BẢO MẬT THÔNG TIN:
- Dữ liệu CCCD được mã hóa AES-256 trước khi lưu trữ.
- Ảnh selfie chỉ dùng để so khớp, không lưu trữ lâu dài.
- Người dùng có quyền yêu cầu xóa dữ liệu cá nhân theo quy định GDPR và NĐ 13/2023.
- Chỉ Admin hệ thống mới có quyền truy cập dữ liệu eKYC.',
    'INTERNAL',
    'v1',
    'PUBLISHED',
    'seed-policy-ekyc-v1',
    NOW(),
    NOW()
);

-- 5. Hướng dẫn khách thuê
INSERT INTO knowledge_documents (id, title, content, source, version, status, content_hash, created_at, updated_at)
VALUES (
    'guide-tenant',
    'Hướng dẫn sử dụng dành cho khách thuê',
    'HƯỚNG DẪN SỬ DỤNG SMARTRENTAL CHO KHÁCH THUÊ

1. TÌM PHÒNG TRỌ:
- Mở ứng dụng SmartRental, vào mục Tìm phòng.
- Sử dụng bộ lọc: Khu vực, Quận/Huyện, Khoảng giá, Diện tích, Loại phòng, Tiện nghi.
- Xem danh sách phòng được xếp hạng theo thuật toán AI (dựa trên giá cả, đánh giá, tiện nghi).
- Nhấn vào phòng để xem chi tiết, hình ảnh 360 độ, bản đồ vị trí.

2. ĐẶT LỊCH XEM PHÒNG:
- Trong trang chi tiết phòng, nhấn nút Đặt lịch hẹn.
- Chọn ngày giờ mong muốn.
- Chủ trọ sẽ xác nhận hoặc đề xuất thời gian khác trong vòng 24 giờ.
- Bạn sẽ nhận thông báo khi lịch hẹn được xác nhận.

3. KÝ HỢP ĐỒNG ĐIỆN TỬ:
- Sau khi thống nhất, chủ trọ sẽ tạo hợp đồng điện tử trên hệ thống.
- Bạn nhận thông báo và xem lại các điều khoản hợp đồng.
- Nhấn Đồng ý ký hợp đồng để xác nhận.
- Hợp đồng được lưu trên blockchain, đảm bảo minh bạch và không thể chỉnh sửa.

4. THANH TOÁN VÀ HÓA ĐƠN:
- Vào mục Hóa đơn để xem các khoản phải thanh toán.
- Nhấn Thanh toán và chọn hình thức: QR Code ngân hàng hoặc MetaMask.
- Sau khi thanh toán, hóa đơn tự động chuyển sang trạng thái ĐÃ THANH TOÁN.

5. SỬ DỤNG AI CHATBOT:
- Nhấn biểu tượng chat ở góc dưới màn hình.
- Hỏi bất kỳ câu hỏi nào: chính sách, hóa đơn, hợp đồng, tìm phòng.
- AI sẽ trả lời tức thì dựa trên dữ liệu thực từ hệ thống.',
    'INTERNAL',
    'v1',
    'PUBLISHED',
    'seed-guide-tenant-v1',
    NOW(),
    NOW()
);

-- 6. Hướng dẫn chủ trọ
INSERT INTO knowledge_documents (id, title, content, source, version, status, content_hash, created_at, updated_at)
VALUES (
    'guide-landlord',
    'Hướng dẫn sử dụng dành cho chủ trọ',
    'HƯỚNG DẪN SỬ DỤNG SMARTRENTAL CHO CHỦ TRỌ

1. ĐĂNG PHÒNG CHO THUÊ:
- Vào mục Quản lý khu trọ, nhấn Thêm khu trọ mới.
- Nhập thông tin: Tên khu trọ, Địa chỉ, Mô tả, Giá dịch vụ (điện, nước, internet).
- Thêm phòng: Tên phòng, Diện tích, Giá thuê, Tiện nghi, Hình ảnh.
- Hệ thống AI sẽ tự động kiểm duyệt hình ảnh và mô tả trước khi đăng công khai.
- Bạn có thể dùng AI để tự động viết mô tả phòng hấp dẫn.

2. QUẢN LÝ HỢP ĐỒNG:
- Vào mục Hợp đồng, tạo hợp đồng mới cho người thuê.
- Chọn phòng, người thuê (đã xác minh eKYC), thời hạn, giá thuê, điều khoản.
- Hợp đồng được deploy lên blockchain tự động khi cả hai bên đồng ý.
- Theo dõi trạng thái: DRAFT, PENDING, ACTIVE, EXPIRED, TERMINATED.

3. GHI HÓA ĐƠN ĐIỆN NƯỚC:
- Vào mục Hóa đơn, nhấn Tạo hóa đơn mới.
- Chọn phòng, nhập chỉ số điện mới và chỉ số nước mới.
- Hệ thống tự động tính tiền dựa trên đơn giá đã cấu hình cho khu trọ.
- Hóa đơn được gửi thông báo tự động đến người thuê.

4. XEM BÁO CÁO DOANH THU:
- Vào mục Thống kê, xem doanh thu theo tháng, theo khu trọ.
- Sử dụng AI chatbot với câu hỏi như: "Tháng này tôi thu được bao nhiêu?", "Phòng nào đang nợ tiền?".
- AI sẽ truy vấn dữ liệu thực và trả lời chính xác.

5. CÔNG CỤ AI HỖ TRỢ:
- Soạn tin nhắc nợ tự động: AI soạn tin nhắn lịch sự, cá nhân hóa theo từng phòng.
- Phát hiện bất thường điện nước: AI so sánh tiêu thụ giữa các phòng và cảnh báo đột biến.
- Gợi ý giá phòng: AI phân tích thị trường và gợi ý khoảng giá phù hợp.
- Phân tích hợp đồng: AI kiểm tra rủi ro pháp lý trong điều khoản hợp đồng.',
    'INTERNAL',
    'v1',
    'PUBLISHED',
    'seed-guide-landlord-v1',
    NOW(),
    NOW()
);

-- 7. Hướng dẫn sử dụng AI
INSERT INTO knowledge_documents (id, title, content, source, version, status, content_hash, created_at, updated_at)
VALUES (
    'guide-ai',
    'Hướng dẫn sử dụng AI Chatbot SmartRental',
    'HƯỚNG DẪN SỬ DỤNG AI CHATBOT SMARTRENTAL

1. CHATBOT TRỢ LÝ ẢO (POST /api/ai/chat):
- Hỏi đáp chung về chính sách, quy trình, hướng dẫn sử dụng.
- Phân tích và đánh giá khu trọ, phòng trọ.
- Tư vấn pháp lý liên quan đến thuê phòng.
- Ví dụ: "Chính sách hoàn cọc thế nào?", "Hướng dẫn thanh toán", "Quy trình ký hợp đồng".

2. TRA CỨU DỮ LIỆU THÔNG MINH (POST /api/ai/query-data):
- Tra cứu thông tin phòng trọ: "Tìm phòng dưới 3 triệu ở quận 12".
- Xem hóa đơn: "Hóa đơn tháng 10 của tôi bao nhiêu?".
- Xem doanh thu (chủ trọ): "Tổng doanh thu tháng này?", "Phòng nào đang nợ tiền?".
- Dữ liệu được truy vấn trực tiếp từ database, đảm bảo chính xác 100%.

3. CÂU HỎI MẪU CHO KHÁCH THUÊ:
- "Tìm phòng trọ giá rẻ ở Gò Vấp"
- "Hóa đơn tiền điện nước tháng này của tôi?"
- "Khi nào hợp đồng của tôi hết hạn?"
- "Chính sách hoàn cọc khi chuyển đi sớm?"

4. CÂU HỎI MẪU CHO CHỦ TRỌ:
- "Doanh thu khu trọ A tháng 10?"
- "Có phòng nào đang trống không?"
- "Phòng nào tiêu thụ điện bất thường?"
- "Soạn tin nhắc nợ cho phòng chưa thanh toán"

5. LƯU Ý QUAN TRỌNG:
- AI chỉ trả lời dựa trên dữ liệu thực từ hệ thống, không bịa đặt thông tin.
- Thông tin cá nhân được bảo vệ: Khách thuê chỉ xem được dữ liệu của mình, chủ trọ chỉ xem được khu trọ của mình.
- Khách vãng lai (chưa đăng nhập) chỉ có thể tra cứu thông tin phòng công khai.',
    'INTERNAL',
    'v1',
    'PUBLISHED',
    'seed-guide-ai-v1',
    NOW(),
    NOW()
);

-- 8. Chính sách VIP
INSERT INTO knowledge_documents (id, title, content, source, version, status, content_hash, created_at, updated_at)
VALUES (
    'policy-vip',
    'Gói VIP và quyền lợi chủ trọ',
    'GÓI VIP VÀ QUYỀN LỢI CHỦ TRỌ SMARTRENTAL

1. CÁC GÓI DỊCH VỤ:
- Gói Miễn phí: Đăng tối đa 5 phòng, 3 hình ảnh mỗi phòng, không có công cụ AI nâng cao.
- Gói Cơ bản (99.000đ/tháng): Đăng tối đa 20 phòng, 10 hình ảnh, AI soạn tin nhắc nợ.
- Gói Premium (199.000đ/tháng): Không giới hạn phòng, hình ảnh, đầy đủ công cụ AI, phân tích hợp đồng, phát hiện bất thường.

2. QUYỀN LỢI GÓI PREMIUM:
- Tin đăng được ưu tiên hiển thị trên đầu kết quả tìm kiếm.
- AI tự động viết mô tả phòng tối ưu SEO.
- Phát hiện bất thường tiêu thụ điện nước.
- Soạn tin nhắc nợ cá nhân hóa bằng AI.
- Gợi ý giá phòng theo thị trường.
- Phân tích rủi ro pháp lý hợp đồng.
- Báo cáo doanh thu nâng cao với biểu đồ.
- Hỗ trợ ưu tiên 24/7.

3. THANH TOÁN GÓI VIP:
- Thanh toán qua chuyển khoản ngân hàng hoặc ví điện tử.
- Tự động gia hạn hàng tháng, có thể hủy bất kỳ lúc nào.
- Hoàn tiền trong 7 ngày nếu không hài lòng (lần đầu đăng ký).',
    'INTERNAL',
    'v1',
    'PUBLISHED',
    'seed-policy-vip-v1',
    NOW(),
    NOW()
);
