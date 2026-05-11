import { useState } from 'react';
import { 
  Scale, 
  FileSignature, 
  UserCog, 
  Gavel, 
  AlertTriangle, 
  CreditCard, 
  Home, 
  Printer, 
  Download,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* ─── HEADER SECTION ─── */}
      <div className="bg-primary/5 border-b py-12 animate-fade-in-up">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Scale className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Pháp lý</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Điều khoản sử dụng dịch vụ
              </h1>
              <p className="text-muted-foreground mt-3 text-lg">
                Quy định về quyền và nghĩa vụ khi tham gia nền tảng SmartRental.
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
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
            Hiệu lực từ: <strong>01/12/2026</strong> (Phiên bản 1.0)
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* ─── SIDEBAR NAVIGATION ─── */}
          <div className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <h3 className="font-semibold text-foreground mb-4 px-3">Mục lục</h3>
              {[
                { id: 'general', label: '1. Quy định chung' },
                { id: 'account', label: '2. Tài khoản & Xác thực' },
                { id: 'responsibilities', label: '3. Trách nhiệm các bên' },
                { id: 'payment', label: '4. Thanh toán & Cọc' },
                { id: 'content', label: '5. Quy chuẩn nội dung' },
                { id: 'termination', label: '6. Vi phạm & Xử lý' },
                { id: 'disclaimer', label: '7. Miễn trừ trách nhiệm' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 ${
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
            
            {/* Intro Text */}
            <div className="prose prose-stone max-w-none text-muted-foreground leading-relaxed">
              <p>
                Chào mừng bạn đến với <strong>SmartRental</strong>. Đây là thỏa thuận pháp lý giữa bạn (Người dùng) và Công ty Cổ phần Công nghệ SmartRental. 
                Bằng việc đăng ký tài khoản hoặc sử dụng bất kỳ dịch vụ nào của chúng tôi, bạn đồng ý tuân thủ tuyệt đối các điều khoản dưới đây.
                Nếu bạn không đồng ý, vui lòng ngừng sử dụng dịch vụ ngay lập tức.
              </p>
            </div>

            {/* 1. Quy định chung */}
            <section id="general" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FileSignature className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">1. Quy định chung</h2>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                  <span><strong>Độ tuổi:</strong> Bạn phải đủ 18 tuổi và có đầy đủ năng lực hành vi dân sự để tham gia ký kết hợp đồng thuê nhà.</span>
                </li>
                <li className="flex gap-3">
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                  <span><strong>Luật áp dụng:</strong> Mọi hoạt động trên SmartRental tuân thủ Luật Nhà ở, Luật Kinh doanh Bất động sản và Luật An ninh mạng của nước CHXHCN Việt Nam.</span>
                </li>
                <li className="flex gap-3">
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                  <span><strong>Thay đổi:</strong> Chúng tôi có quyền sửa đổi điều khoản bất cứ lúc nào và sẽ thông báo trước 07 ngày qua email.</span>
                </li>
              </ul>
            </section>

            {/* 2. Tài khoản */}
            <section id="account" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <UserCog className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">2. Tài khoản & Xác thực (KYC)</h2>
              </div>
              <div className="bg-card border rounded-xl p-6">
                <p className="mb-4 text-foreground font-medium">Để đảm bảo an toàn giao dịch, SmartRental yêu cầu xác thực danh tính:</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-bold text-foreground mb-2">Đối với Chủ trọ</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                      <li>Cung cấp CCCD/CMND chính chủ.</li>
                      <li>Giấy chứng nhận quyền sở hữu đất (Sổ đỏ) hoặc Hợp đồng ủy quyền cho thuê.</li>
                      <li>Giấy phép kinh doanh (nếu là doanh nghiệp).</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-bold text-foreground mb-2">Đối với Người thuê</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                      <li>Cung cấp CCCD/CMND.</li>
                      <li>Số điện thoại chính chủ để nhận mã OTP khi ký hợp đồng điện tử.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Trách nhiệm */}
            <section id="responsibilities" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Gavel className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">3. Trách nhiệm của các bên</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2 border-l-4 border-primary pl-3">Trách nhiệm của SmartRental</h3>
                  <p className="text-muted-foreground">
                    Chúng tôi là đơn vị trung gian cung cấp nền tảng công nghệ. Chúng tôi chịu trách nhiệm vận hành hệ thống ổn định, bảo mật dữ liệu và cung cấp công cụ hợp đồng điện tử. Chúng tôi <strong>không</strong> sở hữu bất kỳ phòng trọ nào trên hệ thống.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2 border-l-4 border-green-500 pl-3">Trách nhiệm của Chủ trọ</h3>
                  <p className="text-muted-foreground">
                    Đảm bảo phòng trọ đúng như mô tả hình ảnh. Chịu trách nhiệm pháp lý về PCCC và đăng ký tạm trú cho người thuê. Hoàn trả tiền cọc đúng hạn nếu người thuê không vi phạm hợp đồng.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Thanh toán */}
            <section id="payment" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">4. Chính sách Thanh toán & Cọc</h2>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-foreground font-semibold">
                    <tr>
                      <th className="p-4">Loại phí</th>
                      <th className="p-4">Mô tả</th>
                      <th className="p-4">Chính sách hoàn tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-muted-foreground">
                    <tr>
                      <td className="p-4 font-medium text-foreground">Phí đặt cọc giữ chỗ</td>
                      <td className="p-4">Số tiền người thuê trả để giữ phòng trước khi ký hợp đồng.</td>
                      <td className="p-4">Hoàn 100% nếu chủ trọ hủy. Mất 100% nếu người thuê đổi ý không thuê.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-foreground">Tiền thuê hàng tháng</td>
                      <td className="p-4">Thanh toán định kỳ qua cổng SmartPay hoặc chuyển khoản.</td>
                      <td className="p-4">Không hoàn lại trừ khi có sự cố nghiêm trọng từ phía nhà trọ.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-foreground">Phí dịch vụ nền tảng</td>
                      <td className="p-4">Phí giao dịch khi thanh toán online (nếu có).</td>
                      <td className="p-4">Không hoàn lại trong mọi trường hợp.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. Nội dung */}
            <section id="content" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                  <Home className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">5. Quy chuẩn nội dung đăng tin</h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Hình ảnh phải là ảnh thực tế, không được lấy ảnh trên mạng hoặc ảnh render 3D (trừ dự án chưa hoàn thiện).</li>
                <li>Giá thuê phải minh bạch, ghi rõ đã bao gồm điện nước hay chưa.</li>
                <li>Nghiêm cấm đăng tin sai sự thật, tin rác (spam), hoặc các nội dung vi phạm thuần phong mỹ tục.</li>
                <li>Nghiêm cấm lôi kéo người dùng giao dịch ngoài nền tảng để trốn tránh nghĩa vụ bảo đảm.</li>
              </ul>
            </section>

            {/* 6. Vi phạm */}
            <section id="termination" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">6. Xử lý vi phạm</h2>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-xl p-6">
                <p className="text-muted-foreground mb-2">SmartRental có quyền thực hiện các biện pháp sau tùy theo mức độ vi phạm:</p>
                <ol className="list-decimal pl-5 space-y-1 font-medium text-foreground/80">
                  <li>Cảnh báo nhắc nhở lần đầu.</li>
                  <li>Khóa tính năng đăng khu trọ/phòng hoặc bình luận trong 7 ngày- vĩnh viễn.</li>
                  <li>Khóa tài khoản vĩnh viễn và đưa vào danh sách đen (Blacklist).</li>
                  <li>Chuyển hồ sơ sang cơ quan công an nếu có dấu hiệu lừa đảo chiếm đoạt tài sản.</li>
                </ol>
              </div>
            </section>

            {/* 7. Miễn trừ */}
            <section id="disclaimer" className="scroll-mt-28 mb-8">
               <h3 className="font-bold text-lg mb-2">7. Miễn trừ trách nhiệm</h3>
               <p className="text-muted-foreground text-sm leading-relaxed">
                 SmartRental không chịu trách nhiệm về bất kỳ thiệt hại trực tiếp, gián tiếp nào phát sinh từ việc sử dụng dịch vụ. 
                 Chúng tôi không đảm bảo tính chính xác tuyệt đối của thông tin do người dùng đăng tải, mặc dù chúng tôi luôn nỗ lực kiểm duyệt. 
                 Mọi tranh chấp về hợp đồng thuê nhà là vấn đề dân sự giữa Chủ trọ và Người thuê, SmartRental sẽ hỗ trợ cung cấp bằng chứng (log hệ thống) nhưng không đóng vai trò là tòa án phán xử.
               </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}