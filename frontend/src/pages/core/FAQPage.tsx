import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Minus, 
  Search, 
  MessageCircle, 
  Wallet, 
  ShieldCheck, 
  Home, 
  Users
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn"; // Giả sử bạn có hàm cn để merge class, nếu không thì dùng string template

// Dữ liệu FAQ mẫu
const faqData = [
  {
    category: "general",
    q: "SmartRental hoạt động như thế nào?",
    a: "SmartRental là nền tảng kết nối trực tiếp giữa Chủ trọ và Người thuê. Chủ trọ đăng tin phòng, Người thuê tìm kiếm và đặt lịch xem. Toàn bộ quy trình ký hợp đồng và thanh toán hóa đơn đều có thể thực hiện online trên nền tảng.",
    views: 5200,
    isPopular: true
  },
  {
    category: "general",
    q: "SmartRental có thu phí người dùng không?",
    a: "Với Người thuê: Hoàn toàn miễn phí tìm kiếm và xem phòng. \nVới Chủ trọ: Chúng tôi miễn phí đăng tin cơ bản. Các gói tin VIP hoặc dịch vụ quản lý nâng cao sẽ có biểu phí riêng được niêm yết tại trang Bảng giá.",
    views: 3800,
    isPopular: false
  },
  {
    category: "account",
    q: "Quy trình xác thực KYC (eKYC) mất bao lâu?",
    a: "Quy trình xác thực danh tính diễn ra tự động bằng AI và thường hoàn tất trong 2-5 phút. Trong trường hợp hình ảnh không rõ nét, nhân viên của chúng tôi sẽ duyệt thủ công trong vòng tối đa 24 giờ làm việc.",
    views: 4100,
    isPopular: true
  },
  {
    category: "account",
    q: "Tôi có thể dùng một tài khoản vừa thuê vừa cho thuê không?",
    a: "Hiện tại, mỗi tài khoản được định danh là 'Chủ trọ' (Landlord) hoặc 'Người thuê' (Tenant) để tối ưu hóa giao diện quản lý. Nếu bạn có nhu cầu cả hai, vui lòng đăng ký 2 tài khoản với email khác nhau.",
    views: 2100,
    isPopular: false
  },
  {
    category: "tenant",
    q: "Làm sao để tôi tin tưởng phòng trọ này có thật?",
    a: "Các phòng trọ có tích xanh 'Verified' đều đã được đội ngũ SmartRental hoặc cộng tác viên đến kiểm tra thực tế. Ngoài ra, tiền cọc của bạn được giữ an toàn trên hệ thống cho đến khi bạn xác nhận đã nhận phòng thành công.",
    views: 6300,
    isPopular: true
  },
  {
    category: "tenant",
    q: "Tôi có thể hủy hợp đồng trước thời hạn không?",
    a: "Việc hủy hợp đồng phụ thuộc vào các điều khoản đã ký kết trong Hợp đồng điện tử. Thông thường, bạn sẽ cần báo trước 30 ngày và có thể mất tiền cọc tùy theo thỏa thuận với chủ trọ.",
    views: 3500,
    isPopular: false
  },
  {
    category: "landlord",
    q: "Làm thế nào để tin của tôi hiển thị lên đầu?",
    a: "Bạn có thể sử dụng gói 'Đẩy tin' hoặc đăng ký gói 'Tin VIP'. Ngoài ra, các phòng có hình ảnh đẹp, thông tin đầy đủ và phản hồi nhanh sẽ được thuật toán ưu tiên hiển thị.",
    views: 2800,
    isPopular: false
  },
  {
    category: "landlord",
    q: "Tôi nhận tiền thuê phòng như thế nào?",
    a: "Hệ thống hỗ trợ thanh toán qua Cổng thanh toán (QR Code, Thẻ, Ví điện tử). Tiền thuê sẽ được chuyển vào Ví SmartRental của bạn và bạn có thể rút về tài khoản ngân hàng bất cứ lúc nào.",
    views: 4700,
    isPopular: true
  },
];

const categories = [
  { id: "all", label: "Tất cả", icon: MessageCircle },
  { id: "general", label: "Chung", icon: Users },
  { id: "tenant", label: "Người thuê", icon: Home },
  { id: "landlord", label: "Chủ trọ", icon: Wallet },
  { id: "account", label: "Tài khoản", icon: ShieldCheck },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Lọc câu hỏi theo Category và Search Query
  const filteredFaqs = faqData.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch = item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* ─── HERO SECTION ─── */}
      <div className="bg-primary/5 py-16 border-b animate-fade-in-up">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold text-primary tracking-tight mb-4">
            Câu hỏi thường gặp
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Tìm kiếm nhanh câu trả lời cho những thắc mắc phổ biến nhất về SmartRental.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto shadow-sm hover:shadow-md transition-shadow duration-200">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Nhập từ khóa (ví dụ: thanh toán, hợp đồng...)" 
              className="pl-12 h-14 bg-background text-base rounded-full border-primary/20 focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-12">
        {/* ─── CATEGORY TABS ─── */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border",
                  isActive 
                    ? "bg-primary text-primary-foreground border-primary shadow-md" 
                    : "bg-background text-muted-foreground border-transparent hover:bg-card hover:border-border"
                )}
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ─── FAQ LIST ─── */}
        <div className="max-w-3xl mx-auto space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((item, index) => (
              <div 
                key={index} 
                className={cn(
                  "group border rounded-xl bg-card transition-all duration-200 overflow-hidden",
                  openIndex === index ? "ring-1 ring-primary/20 shadow-md" : "hover:border-primary/30"
                )}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="flex w-full cursor-pointer items-center justify-between p-6 text-left font-medium text-foreground"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{item.q}</span>
                      {item.isPopular && (
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-orange-100 text-orange-700 border border-orange-200">
                          🔥 Phổ biến
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        👁️ {item.views.toLocaleString()} views
                      </span>
                    </div>
                  </div>
                  <div className={cn(
                    "ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted transition-all duration-300",
                    openIndex === index && "bg-primary text-primary-foreground rotate-180"
                  )}>
                    {openIndex === index ? (
                      <Minus className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </div>
                </button>
                
                <div 
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-6 pt-0 text-muted-foreground leading-relaxed border-t border-dashed border-border/50 mt-2">
                      <div className="pt-4">
                        {item.a.split('\n').map((line, i) => (
                          <p key={i} className="mb-2 last:mb-0">{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Không tìm thấy kết quả</h3>
              <p className="text-muted-foreground">Thử tìm kiếm với từ khóa khác xem sao.</p>
            </div>
          )}
        </div>

        {/* ─── CONTACT CTA ─── */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 md:p-10 text-center">
            <h3 className="text-2xl font-bold text-foreground mb-3">Vẫn chưa tìm thấy câu trả lời?</h3>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Đừng lo lắng, đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc của bạn 24/7.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/contact">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <MessageCircle className="h-4 w-4" /> Liên hệ hỗ trợ
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-background hover:bg-muted/50">
                  Gửi email
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}