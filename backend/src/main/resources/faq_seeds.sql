-- Script Khởi tạo Kho tri thức FAQ cho SmartRental AI (Đã Chuẩn Hóa Theo Hệ Thống Thực Tế)
-- Phủ sóng chuyên sâu các module: Đặt hẹn, Hợp đồng thông minh (Blockchain), Hóa đơn (Web3/Chuyển khoản), Quản lý Phòng, Đánh giá.

INSERT INTO ai_sql_cache (question, generated_sql, type, answer, is_valid) VALUES 

-- ============================================
-- NHÓM 1: TÀI KHOẢN & VAI TRÒ (USER MODULE)
-- ============================================
('Làm sao để đăng ký tài khoản trên ứng dụng?', NULL, 'FAQ', 'Dạ, bạn có thể tải ứng dụng SmartRental, nhấn "Đăng ký" và điền các thông tin cá nhân cơ bản để có thể tra cứu thông tin và lưu phòng.', 1),
('Tôi quên mật khẩu thì lấy lại thế nào?', NULL, 'FAQ', 'Dạ, tại màn hình Đăng nhập, bạn chọn "Quên mật khẩu" và làm theo hướng dẫn của hệ thống để tiến hành khôi phục tài khoản.', 1),
('App này có thu phí sử dụng đối với người thuê phòng không?', NULL, 'FAQ', 'Dạ, SmartRental hoàn toàn miễn phí cho tài khoản Khách thuê (Tenant). Bạn có thể tự do tìm kiếm, đặt hẹn và nhắn tin với Chủ trọ.', 1),
('Làm sao để tôi đổi vai trò từ Khách thuê sang Chủ trọ (Landlord)?', NULL, 'FAQ', 'Dạ, mỗi tài khoản được gán một vai trò cố định khi đăng ký. Nếu bạn muốn kinh doanh cho thuê, hãy đăng ký một tài khoản mới với vai trò Chủ Trọ (Landlord) ngay từ đầu nhé.', 1),
('Đăng ký tài khoản Chủ trọ có mất phí không?', NULL, 'FAQ', 'Dạ, hiện tại ứng dụng không thu phí cấp tài khoản Chủ trọ. Tuy nhiên các bài đăng hoặc khu trọ (Property) của bạn cần được Admin hệ thống duyệt (Approve) trước khi hiển thị công khai.', 1),

-- ============================================
-- NHÓM 2: TÌM KIẾM, XEM PHÒNG & ĐẶT LỊCH HẸN (PROPERTY & APPOINTMENT MODULE)
-- ============================================
('Làm cách nào để tìm phòng trọ gần đây?', NULL, 'FAQ', 'Dạ, ứng dụng hỗ trợ chức năng quét vị trí địa lý (Reverse Geocode). Bạn có thể bật GPS để hệ thống ưu tiên đề xuất các khu trọ (Properties) đang ở gần bạn nhất.', 1),
('Làm sao để tôi xem phòng trực tiếp?', NULL, 'FAQ', 'Dạ, bạn có thể vào trang chi tiết phòng và sử dụng tính năng "Đặt lịch hẹn" (Appointment). Bạn sẽ chọn ngày giờ mong muốn, và hệ thống sẽ gửi yêu cầu trực tiếp đến Chủ trọ.', 1),
('Sau khi tôi đặt lịch hẹn, tôi phải làm gì tiếp theo?', NULL, 'FAQ', 'Dạ, bạn hãy chờ Chủ trọ Phê duyệt (Approve) hoặc Từ chối (Reject) lịch hẹn. Bạn sẽ nhận được Thông báo (Notification) ngay trên app khi trạng thái lịch hẹn thay đổi.', 1),
('Tôi có thể hủy lịch hẹn đã đặt không?', NULL, 'FAQ', 'Dạ, nếu lịch hẹn đang ở trạng thái Chờ duyệt (Pending), bạn có thể liên hệ ngay cho Chủ trọ qua Zalo để báo dời ngày hoặc hủy nhé.', 1),
('Làm sao để biết phòng nào đã có người thuê?', NULL, 'FAQ', 'Dạ, các khu trọ và phòng trọ hiển thị công khai trên ứng dụng đều có trạng thái rõ ràng (Còn trống hoặc Đã thuê). Hệ thống sẽ tự kiểm soát để khách không thể đặt hẹn vào các phòng đã cho thuê.', 1),

-- ============================================
-- NHÓM 3: KÝ KẾT HỢP ĐỒNG (CONTRACT MODULE)
-- ============================================
('Làm sao quá trình ký hợp đồng diễn ra?', NULL, 'FAQ', 'Dạ, sau khi thống nhất, Chủ trọ sẽ tạo "Hợp đồng thông minh" (Smart Contract) trên hệ thống. Hợp đồng này ghi rõ tiền cọc, tiền thuê, chu kỳ phí. Hai bên sẽ xác nhận chữ ký số của mình ngay trên app.', 1),
('Hợp đồng ký trên ứng dụng có an toàn không?', NULL, 'FAQ', 'Dạ, SmartRental tự hào tích hợp công nghệ Blockchain vào quá trình lưu trữ hợp đồng. Dữ liệu cam kết trên Hợp đồng thông minh không thể bị sửa chữa hoặc xóa bỏ trái phép, đảm bảo quyền lợi tuyệt đối cho bạn.', 1),
('Tiền đặt cọc được quy định thế nào?', NULL, 'FAQ', 'Dạ, số tiền cọc (Deposit Amount) sẽ do Chủ trọ thiết lập khi tạo hợp đồng. Mức tiền cọc sẽ hiển thị minh bạch trong chi tiết Hợp đồng trước khi bạn bấm chữ Tới bước xác nhận.', 1),
('Tôi muốn chuyển đi trước thời hạn hợp đồng thì có mất cọc không?', NULL, 'FAQ', 'Dạ, đối với hợp đồng thông minh, bạn cần tuân thủ kỳ hạn đã cam kết. Nếu dọn đi trước thời hạn (chấm dứt hợp đồng sớm), bạn có thể mất tiền đặt cọc tùy thuộc vào điều khoản đền bù được ghi trên hệ thống.', 1),
('Kết thúc thời hạn thuê phòng thì tiền cọc sẽ ra sao?', NULL, 'FAQ', 'Dạ, khi hết hạn hợp đồng hoặc hai bên đồng thuận thanh lý hợp đồng, Chủ trọ sẽ hoàn trả lại khoản "Deposit" cho bạn theo phương pháp thanh toán ngoài hoặc giao dịch bằng Crypto (nếu có thỏa thuận riêng).', 1),

-- ============================================
-- NHÓM 4: HÓA ĐƠN & THANH TOÁN (BILLING MODULE)
-- ============================================
('Làm sao để tôi nhận và xem hóa đơn điện nước hàng tháng?', NULL, 'FAQ', 'Dạ, hàng tháng Chủ trọ sẽ tiến hành "Lập Hóa đơn" (Create Bill) ngay trên hệ thống. Ứng dụng sẽ tự động tính tổng tiền phòng và gửi Thông báo đẩy (Push Notification) yêu cầu thanh toán cho bạn.', 1),
('Nếu tôi đóng trễ tiền phòng thì có bị phạt không?', NULL, 'FAQ', 'Dạ, hệ thống có tính năng Thống kê Hóa đơn quá hạn (Overdue Stats) đối với Chủ trọ. Nếu bạn đóng trễ, điều này có thể dẫn tới sự vi phạm hợp đồng và ảnh hưởng rủi ro uy tín (Reputation).', 1),
('Ứng dụng hỗ trợ các kênh thanh toán nào cho hóa đơn?', NULL, 'FAQ', 'Dạ, chúng tôi hỗ trợ 2 phương pháp: (1) Chuyển khoản ngân hàng truyền thống và (2) Thanh toán tự động qua cổng Tiền mã hóa (Crypto Web3).', 1),
('Để thanh toán bằng Chuyển khoản ngân hàng, tôi làm thế nào?', NULL, 'FAQ', 'Dạ, bạn tự chuyển khoản cho Chủ trọ. Sau đó, trên ứng dụng bạn nhấn nút "Đã thanh toán" (Tenant Notify Payment). Cuối cùng, Chủ trọ kiểm tra tài khoản và nhấn "Xác nhận nhận tiền" (Landlord Confirm) để chuyển hóa đơn sang dạng Đã thu.', 1),
('Thanh toán bằng công nghệ Web3 (Crypto) hoạt động ra sao?', NULL, 'FAQ', 'Dạ, bạn có thể thanh toán trực tiếp băng ví Crypto hỗ trợ chuẩn EVM. Sau khi giao dịch chuỗi khối hoàn tất, mã băm (txHash) sẽ được lưu lên hệ thống và Hóa đơn tự động sang trạng thái "Thành công" theo thời gian thực (Confirm Web3 Payment) mà không cần Chủ nhà bấm xác nhận!', 1),

-- ============================================
-- NHÓM 5: ĐÁNH GIÁ, BÁO CÁO & UY TÍN (REVIEW & SCORE MODULE)
-- ============================================
('Làm sao để tôi đánh giá một chủ trọ hoặc phòng trọ?', NULL, 'FAQ', 'Dạ, SmartRental cung cấp tính năng Phản hồi (Reviews). Khách thuê có thể truy cập để đánh giá chất lượng phòng ốc hoặc thái độ của Chủ trọ để cộng đồng cùng tham khảo.', 1),
('Cảnh cáo vi phạm hay Danh tiếng (Reputation) là gì?', NULL, 'FAQ', 'Dạ, tại SmartRental, các tài khoản có tích hợp hệ thống Điểm Uy Tín (Reputation History). Các hành động tiêu cực như: bùng lịch hẹn, bỏ phòng ngang, trễ hóa đơn liên tục sẽ làm điểm uy tín bị trừ, dẫn đến từ chối dịch vụ.', 1),
('Tôi muốn phản ánh thông tin Khu trọ sai sự thật thì làm sao?', NULL, 'FAQ', 'Dạ, mọi khu trọ đăng tải trên SmartRental (Pending Properties) đều phải đi vòng qua cửa duyệt của Admin trước khi Public rộng rãi. Tuy nhiên nếu bạn thấy có gian lận sau đó, bạn có thể liên hệ trực tiếp đội ngũ CSKH hoặc để lại đánh giá xấu để lưu vết uy tín.', 1),
('Tôi là Chủ trọ, tôi có thể xem các hóa đơn phân tích để quản lý tài chính không?', NULL, 'FAQ', 'Dạ, chắc chắn rồi! Phần mềm SmartRental có cung cấp màn hình Doanh thu với tính năng Biểu đồ 6 tháng gần nhất (Revenue Last 6 Months) cùng Thống kê quá hạn thông minh.', 1),

-- ============================================
-- NHÓM 6: SMARTRENTAL AI (CHATBOT MODULE)
-- ============================================
('SmartRental AI - bạn có thể làm được những nhiệm vụ gì?', NULL, 'FAQ', 'Dạ, tôi có thể trả lời nhanh 24/7 mọi thắc mắc của bạn về sử dụng ứng dụng. Trợ giúp tìm kiếm phòng, viết lại mô tả, tính toán và thống kê chi phí thuê hàng tháng (chỉ cho riêng cá nhân bạn thôi nhé)!', 1),

-- ============================================
-- NHÓM 7: DÀNH CHO CHỦ TRỌ (LANDLORD MODULE)
-- ============================================
('Làm sao để đăng tải một khu trọ mới lên ứng dụng?', NULL, 'FAQ', 'Dạ, ở vai trò Chủ trọ, bạn truy cập tab "Quản lý", chọn "Thêm khu trọ" (Create Property). Lưu ý khu trọ mới tạo sẽ nằm ở trạng thái Chờ duyệt (Pending) cho đến khi Ban quản trị thông qua.', 1),
('Tôi quản lý các lịch hẹn khách xin xem phòng ở đâu?', NULL, 'FAQ', 'Dạ, toàn bộ yêu cầu xem phòng sẽ đổ về mục "Lịch hẹn" của Chủ trọ. Tại đây bạn có toàn quyền bấm Phê duyệt (Approve) hoặc Từ chối (Reject) thời gian mà khách đề xuất.', 1),
('Làm sao để tôi xuất hóa đơn thu tiền mạng, điện nước hàng tháng?', NULL, 'FAQ', 'Dạ, khi tới kỳ thu phí, bạn truy cập vào Quản lý Hợp đồng, chọn "Tạo Hóa đơn" (Create Bill). Ứng dụng sẽ tự động gom các chi phí, tính biểu giá điện nước hiện tại và ép lệnh đẩy Thông báo đòi nợ tới máy Khách thuê.', 1),
('Làm sao để biết khách đã đóng tiền hay chưa mà quản lý?', NULL, 'FAQ', 'Dạ, nếu khách chuyển khoản ngân hàng thông thường, họ sẽ báo đã đóng trên app, bạn cần phải check lại tài khoản và bấm "Xác nhận nhận tiền" (Landlord Confirm) để chốt sổ. Còn nếu khách trả bằng Crypto Web3, Hóa đơn của bạn tự chuyển xanh "Thành công" lập tức nhờ hệ thống dò Smart Contract!', 1),
('Tôi muốn xem báo cáo lợi nhuận kinh doanh thì vào đâu?', NULL, 'FAQ', 'Dạ, SmartRental tự hào tối ưu hóa Doanh thu cho Chủ trọ. Bạn có thể xem Biểu đồ Doanh thu 6 tháng gần nhất, chỉ số Tăng trưởng tháng này so với tháng trước, và nắm bắt ngay danh sách các Hóa đơn vi phạm hạn chót đóng tiền (Overdue Stats).', 1),
('AI có bảo mật thông tin tài chính của Chủ trọ không?', NULL, 'FAQ', 'Dạ, có. Hệ thống AI trên SmartRental đã được cài cắm Lớp chặn bảo mật dữ liệu ở cấp độ Server. Khách thuê hoàn toàn không thể lừa AI để xem lén doanh thu hoặc danh sách Hợp đồng của người khác được.', 1);
