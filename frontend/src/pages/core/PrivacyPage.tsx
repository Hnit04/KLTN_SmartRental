import { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  FileText, 
  Server, 
  Globe, 
  UserCheck, 
  Download, 
  Printer,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('intro');
  const [showTocMobile, setShowTocMobile] = useState(false);

  // Hàm xử lý cuộn mượt khi click vào mục lục
  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setShowTocMobile(false); // Đóng mobile TOC khi click
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* ─── HEADER SECTION ─── */}
      <div className="bg-primary/5 border-b py-12">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Trung tâm bảo mật</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Chính sách bảo mật dữ liệu
              </h1>
              <p className="text-muted-foreground mt-3 text-lg">
                Cam kết của SmartRental về việc bảo vệ thông tin cá nhân của bạn.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2 bg-background" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> In
              </Button>
              <Button variant="outline" className="gap-2 bg-background">
                <Download className="h-4 w-4" /> Tải PDF
              </Button>
            </div>
          </div>
          
          <div className="mt-8 flex items-center text-sm text-muted-foreground bg-background/50 inline-flex px-4 py-2 rounded-full border">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            Hiệu lực từ: <strong>01/01/2024</strong> (Phiên bản 2.0)
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* ─── SIDEBAR NAVIGATION (STICKY) ─── */}
          <div className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <h3 className="font-semibold text-foreground mb-4 px-3">Mục lục</h3>
              {[
                { id: 'collection', label: '1. Thu thập thông tin' },
                { id: 'usage', label: '2. Phạm vi sử dụng' },
                { id: 'sharing', label: '3. Chia sẻ dữ liệu' },
                { id: 'storage', label: '4. Lưu trữ & Bảo mật' },
                { id: 'cookies', label: '5. Cookies & Tracking' },
                { id: 'rights', label: '6. Quyền của bạn' },
                { id: 'contact', label: '7. Liên hệ' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    activeSection === item.id 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── MAIN CONTENT ─── */}
          <div className="lg:col-span-9 space-y-12">
            
            {/* Giới thiệu */}
            <div className="prose prose-stone max-w-none dark:prose-invert">
              <p className="lead text-xl text-foreground/80">
                Tại <strong>SmartRental</strong>, chúng tôi hiểu rằng quyền riêng tư là vô cùng quan trọng. 
                Chính sách này mô tả chi tiết cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn 
                khi sử dụng nền tảng website và ứng dụng di động của chúng tôi.
              </p>
            </div>

            {/* 1. Thu thập thông tin */}
            <section id="collection" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Eye className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">1. Thông tin chúng tôi thu thập</h2>
              </div>
              <div className="bg-card border rounded-xl p-6 space-y-4 shadow-sm">
                <p className="text-muted-foreground">Chúng tôi thu thập các loại thông tin sau để cung cấp dịch vụ:</p>
                <ul className="grid sm:grid-cols-2 gap-4">
                  <li className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Thông tin định danh</strong>
                      <span className="text-sm text-muted-foreground">Họ tên, CCCD/CMND (cho quy trình KYC), Ảnh chân dung.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Thông tin liên lạc</strong>
                      <span className="text-sm text-muted-foreground">Email, Số điện thoại, Địa chỉ thường trú.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Dữ liệu thanh toán</strong>
                      <span className="text-sm text-muted-foreground">Lịch sử giao dịch, thông tin ví điện tử (được mã hóa).</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Dữ liệu thiết bị</strong>
                      <span className="text-sm text-muted-foreground">Địa chỉ IP, loại trình duyệt, hệ điều hành.</span>
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            {/* 2. Phạm vi sử dụng */}
            <section id="usage" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">2. Phạm vi sử dụng thông tin</h2>
              </div>
              <div className="prose prose-stone max-w-none text-muted-foreground">
                <p>Chúng tôi sử dụng thông tin của bạn cho các mục đích hợp pháp sau:</p>
                <ul className="space-y-2 list-none pl-0">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span><strong>Xác thực danh tính (KYC):</strong> Đảm bảo môi trường thuê phòng an toàn, loại bỏ các tài khoản ảo hoặc lừa đảo.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span><strong>Tạo hợp đồng điện tử:</strong> Điền tự động thông tin vào các mẫu hợp đồng thuê nhà có giá trị pháp lý.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span><strong>Xử lý thanh toán:</strong> Gửi hóa đơn điện/nước hàng tháng và xác nhận thanh toán tiền thuê.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span><strong>Hỗ trợ khách hàng:</strong> Liên hệ giải quyết tranh chấp hoặc sự cố kỹ thuật.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 3. Chia sẻ dữ liệu */}
            <section id="sharing" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Globe className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">3. Chia sẻ dữ liệu với bên thứ ba</h2>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-6">
                <p className="text-amber-800 dark:text-amber-200 font-medium mb-3">
                  ⚠️ Cam kết quan trọng: Chúng tôi KHÔNG bán dữ liệu cá nhân của bạn cho các bên quảng cáo.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Chúng tôi chỉ chia sẻ thông tin trong các trường hợp cần thiết sau:
                </p>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-background p-4 rounded-lg border">
                    <strong>Giữa Chủ trọ & Người thuê:</strong><br/>
                    Khi hai bên đồng ý ký hợp đồng, thông tin liên hệ cơ bản và CCCD sẽ được hiển thị trên hợp đồng.
                  </div>
                  <div className="bg-background p-4 rounded-lg border">
                    <strong>Cổng thanh toán (VNPay/Momo):</strong><br/>
                    Chỉ chia sẻ số tiền và mã đơn hàng để xử lý giao dịch.
                  </div>
                  <div className="bg-background p-4 rounded-lg border">
                    <strong>Cơ quan pháp luật:</strong><br/>
                    Khi có yêu cầu bằng văn bản để phục vụ điều tra theo luật pháp Việt Nam.
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Lưu trữ & Bảo mật */}
            <section id="storage" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <Lock className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">4. Lưu trữ & Bảo mật dữ liệu</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Hệ thống của chúng tôi áp dụng các tiêu chuẩn bảo mật công nghiệp cao nhất:
              </p>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-xl bg-card">
                  <div className="font-bold text-foreground mb-1">Mã hóa SSL/TLS</div>
                  <div className="text-xs text-muted-foreground">Toàn bộ dữ liệu truyền tải được mã hóa đầu cuối.</div>
                </div>
                <div className="text-center p-4 border rounded-xl bg-card">
                  <div className="font-bold text-foreground mb-1">Mã hóa AES-256</div>
                  <div className="text-xs text-muted-foreground">Dữ liệu nhạy cảm (CCCD, Mật khẩu) được mã hóa trong Database.</div>
                </div>
                <div className="text-center p-4 border rounded-xl bg-card">
                  <div className="font-bold text-foreground mb-1">Server tại Việt Nam</div>
                  <div className="text-xs text-muted-foreground">Tuân thủ Luật An ninh mạng về lưu trữ dữ liệu.</div>
                </div>
              </div>
            </section>

            {/* 5. Cookies */}
            <section id="cookies" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Server className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">5. Chính sách Cookies</h2>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                SmartRental sử dụng cookies để duy trì phiên đăng nhập của bạn và ghi nhớ các cài đặt ngôn ngữ/giao diện. 
                Chúng tôi cũng sử dụng Google Analytics để phân tích lưu lượng truy cập (dữ liệu được ẩn danh). 
                Bạn có thể tắt cookies trong cài đặt trình duyệt, nhưng một số tính năng (như Đăng nhập) có thể không hoạt động.
              </p>
            </section>

            {/* 6. Quyền của bạn */}
            <section id="rights" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">6. Quyền lợi của bạn</h2>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground">Bạn có toàn quyền đối với dữ liệu cá nhân của mình:</p>
                <div className="grid sm:grid-cols-2 gap-4">
                   <div className="p-4 rounded-lg bg-muted/50">
                     <h4 className="font-semibold text-foreground">Quyền truy cập & Chỉnh sửa</h4>
                     <p className="text-sm text-muted-foreground mt-1">Bạn có thể xem và sửa thông tin cá nhân bất cứ lúc nào trong trang "Cài đặt tài khoản".</p>
                   </div>
                   <div className="p-4 rounded-lg bg-muted/50">
                     <h4 className="font-semibold text-foreground">Quyền được lãng quên</h4>
                     <p className="text-sm text-muted-foreground mt-1">Bạn có quyền yêu cầu xóa vĩnh viễn tài khoản và dữ liệu liên quan (trừ các dữ liệu giao dịch phải lưu trữ theo luật kế toán).</p>
                   </div>
                </div>
              </div>
            </section>

            {/* 7. Liên hệ */}
            <section id="contact" className="bg-primary/5 rounded-2xl p-8 border border-primary/10 scroll-mt-28">
              <h2 className="text-2xl font-bold text-primary mb-4">7. Liên hệ bộ phận bảo mật</h2>
              <p className="text-muted-foreground mb-6">
                Nếu bạn có bất kỳ câu hỏi nào về chính sách này hoặc muốn thực hiện quyền riêng tư của mình, vui lòng liên hệ:
              </p>
              <div className="space-y-2 text-sm">
                <p><strong className="text-foreground">Email:</strong> privacy@smartrental.vn</p>
                <p><strong className="text-foreground">Địa chỉ:</strong> 12 Nguyễn Văn Bảo, Gò Vấp, TP.HCM</p>
                <p><strong className="text-foreground">Thời gian phản hồi:</strong> Trong vòng 48 giờ làm việc.</p>
              </div>
              <div className="mt-6">
                <Link to="/contact">
                  <Button>Gửi yêu cầu hỗ trợ</Button>
                </Link>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* ─── FLOATING TOC BUTTON (MOBILE) ─── */}
      <div className="lg:hidden fixed bottom-24 right-4 z-40">
        <button
          onClick={() => setShowTocMobile(!showTocMobile)}
          className="flex items-center justify-center h-14 w-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-110"
          aria-label="Mục lục"
        >
          {showTocMobile ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Floating TOC Dropdown */}
        {showTocMobile && (
          <div className="absolute bottom-20 right-0 bg-background border rounded-xl shadow-xl p-3 w-56 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <h3 className="font-semibold text-foreground mb-3 text-sm px-1">Mục lục</h3>
            <div className="space-y-1">
              {[
                { id: 'collection', label: '1. Thu thập thông tin' },
                { id: 'usage', label: '2. Phạm vi sử dụng' },
                { id: 'sharing', label: '3. Chia sẻ dữ liệu' },
                { id: 'storage', label: '4. Lưu trữ & Bảo mật' },
                { id: 'cookies', label: '5. Cookies & Tracking' },
                { id: 'rights', label: '6. Quyền của bạn' },
                { id: 'contact', label: '7. Liên hệ' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}