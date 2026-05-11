import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  User,
  Home,
  Shield,
  CreditCard,
  FileText,
  Settings,
  HelpCircle,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Dữ liệu bài viết giả lập để phục vụ tìm kiếm
const allArticles = [
  { id: 1, title: "Hướng dẫn đăng tin cho thuê phòng", category: "Dành cho Chủ trọ", preview: "Hướng dẫn từng bước cách đăng tin cho thuê phòng với ảnh chất lượng cao và thông tin chi tiết.", readTime: 5 },
  { id: 2, title: "Làm thế nào để nạp tiền vào ví?", category: "Thanh toán", preview: "SmartRental hỗ trợ nạp tiền qua thẻ ngân hàng, ví điện tử và chuyển khoản ngân hàng.", readTime: 3 },
  { id: 3, title: "Quy trình xác thực danh tính (KYC)", category: "Tài khoản", preview: "Xác thực danh tính bổ sung để tăng độ tin tưởng và mở khóa các tính năng cao cấp.", readTime: 4 },
  { id: 4, title: "Cách lấy lại mật khẩu đã quên", category: "Tài khoản", preview: "Hướng dẫn đặt lại mật khẩu thông qua email hoặc số điện thoại được đăng ký.", readTime: 2 },
  { id: 5, title: "Hủy hợp đồng thuê trước hạn", category: "Hợp đồng", preview: "Quy trình hủy hợp đồng, chính sách tiền phạt và xử lý hoàn cọc cho bên thuê.", readTime: 6 },
  { id: 6, title: "Báo cáo người dùng vi phạm", category: "An toàn & Bảo mật", preview: "Cách báo cáo người dùng có hành vi vi phạm quy tắc cộng đồng của SmartRental.", readTime: 3 },
  { id: 7, title: "Chính sách hoàn tiền cọc", category: "Thanh toán", preview: "Quy tắc hoàn cọc, thời gian xử lý và các trường hợp không hoàn cọc.", readTime: 5 },
  { id: 8, title: "Cách sửa thông tin cá nhân", category: "Tài khoản", preview: "Cập nhật thông tin tài khoản, ảnh đại diện và các trường thông tin cá nhân.", readTime: 2 },
];

const categories = [
  {
    icon: User,
    title: "Tài khoản & Xác thực",
    desc: "Đăng ký, đăng nhập, KYC và bảo mật tài khoản.",
    link: "#account"
  },
  {
    icon: Home,
    title: "Quản lý Bất động sản",
    desc: "Đăng tin, quản lý phòng trọ và cập nhật trạng thái.",
    link: "#property"
  },
  {
    icon: CreditCard,
    title: "Thanh toán & Ví",
    desc: "Nạp rút tiền, thanh toán hóa đơn và lịch sử giao dịch.",
    link: "#billing"
  },
  {
    icon: FileText,
    title: "Hợp đồng điện tử",
    desc: "Quy trình ký kết, gia hạn và thanh lý hợp đồng.",
    link: "#contracts"
  },
  {
    icon: Shield,
    title: "An toàn & Chính sách",
    desc: "Quy tắc cộng đồng, giải quyết tranh chấp.",
    link: "#safety"
  },
  {
    icon: Settings,
    title: "Cài đặt & Kỹ thuật",
    desc: "Lỗi ứng dụng, thông báo và cấu hình hệ thống.",
    link: "#tech"
  },
];

const popularArticles = [
  { title: "Hướng dẫn xác thực tài khoản (KYC) bước-từng-bước", readTime: 5, views: 12400 },
  { title: "Biểu phí dịch vụ dành cho Chủ trọ mới nhất 2024", readTime: 4, views: 8900 },
  { title: "Làm thế nào để đẩy tin lên top tìm kiếm?", readTime: 6, views: 15600 },
  { title: "Chính sách bảo vệ người thuê của SmartRental", readTime: 7, views: 7200 },
  { title: "Quy trình thanh toán tiền phòng qua cổng SmartPay", readTime: 4, views: 9800 },
  { title: "Mẫu hợp đồng thuê nhà chuẩn", readTime: 8, views: 11500 }
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  // Logic lọc bài viết theo từ khóa
  const searchResults = allArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* ─── HERO SEARCH SECTION ─── */}
      <div className="bg-primary/5 py-20 border-b animate-fade-in-up">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <HelpCircle className="h-4 w-4" />
            Trung tâm hỗ trợ SmartRental
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
            Chúng tôi có thể giúp gì cho bạn?
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Tìm kiếm hướng dẫn, câu trả lời và tài liệu kỹ thuật.
          </p>
          
          <div className="relative max-w-xl mx-auto shadow-lg rounded-xl">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="h-5 w-5" />
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập từ khóa (ví dụ: đổi mật khẩu, đăng tin...)"
              className="pl-12 h-14 text-base bg-background rounded-xl border-primary/20 focus-visible:ring-primary shadow-sm"
            />
            {/* Hiển thị kết quả tìm kiếm ngay bên dưới nếu có từ khóa */}
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-xl shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
                {searchResults.length > 0 ? (
                  <ul className="py-2 max-h-96 overflow-y-auto">
                    {searchResults.map((article) => (
                      <li key={article.id}>
                        <Link 
                          to="#" 
                          className="flex flex-col justify-between px-6 py-4 hover:bg-muted/50 transition-colors group border-b last:border-b-0"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3 flex-1">
                              <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-foreground font-medium group-hover:text-primary transition-colors">{article.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded whitespace-nowrap flex-shrink-0">
                              {article.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 ml-7 text-xs text-muted-foreground">
                            <span className="line-clamp-1">{article.preview}</span>
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <Clock className="h-3 w-3" /> {article.readTime} phút
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    Không tìm thấy kết quả phù hợp cho "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-16">
        {/* ─── MAIN CATEGORIES ─── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-2">
            <span className="w-1 h-8 bg-primary rounded-full mr-2"></span>
            Khám phá theo chủ đề
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, idx) => (
              <Link 
                key={idx} 
                to={cat.link}
                className="group bg-card p-6 rounded-2xl border hover:border-primary/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md transition-all duration-200">
                  <cat.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {cat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {cat.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* ─── POPULAR ARTICLES ─── */}
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Cột trái: Bài viết phổ biến */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-foreground mb-6">Bài viết được xem nhiều nhất</h2>
            <div className="bg-card border rounded-2xl shadow-sm divide-y">
              {popularArticles.map((article, idx) => (
                <Link 
                  key={idx} 
                  to="#" 
                  className="flex items-start justify-between p-5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors mb-2">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {article.readTime} phút đọc
                        </span>
                        <span className="flex items-center gap-1">
                          👁️ {article.views.toLocaleString()} views
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Cột phải: CTA Box */}
          <div className="lg:col-span-1">
            <div className="bg-primary text-primary-foreground rounded-2xl p-8 shadow-lg relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              
              <h3 className="text-xl font-bold mb-4 relative z-10">Bạn vẫn cần trợ giúp?</h3>
              <p className="text-primary-foreground/90 mb-8 text-sm leading-relaxed relative z-10">
                Nếu bạn không tìm thấy câu trả lời trong tài liệu hướng dẫn, đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng 24/7.
              </p>
              
              <div className="space-y-3 relative z-10">
                <Link to="/contact">
                  <Button variant="secondary" className="w-full justify-between group">
                    Liên hệ hỗ trợ
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/faq">
                  <Button variant="outline" className="w-full justify-between border-primary-foreground/20 hover:bg-primary-foreground/10 text-primary-foreground bg-transparent">
                    Xem FAQ
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-6 bg-card border rounded-2xl p-6">
              <h4 className="font-semibold mb-2">Trạng thái hệ thống</h4>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Tất cả hệ thống hoạt động bình thường
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}