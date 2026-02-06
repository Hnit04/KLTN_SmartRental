import {
  Building2,
  Shield,
  FileText,
  Search,
  ArrowRight,
  CheckCircle,
  Users,
  MapPin,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import React from "react";

// 1. Định nghĩa Interface cho Button để fix lỗi "implicitly any"
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost"; // Giới hạn các giá trị cho phép
  size?: "sm" | "md" | "lg";
  className?: string;
}

// 2. Áp dụng Interface vào Component
const Button = ({ 
  children, 
  variant = "primary", 
  size = "md", 
  className = "", 
  ...props 
}: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  
  const variants = {
    primary: "bg-[#8B5E3C] text-white hover:bg-[#724D31] shadow-lg shadow-[#8B5E3C]/20",
    secondary: "bg-white text-[#8B5E3C] hover:bg-[#FDF8F3] shadow-md",
    outline: "border-2 border-[#8B5E3C] text-[#8B5E3C] hover:bg-[#FDF8F3]",
    ghost: "text-[#8B5E3C] hover:bg-[#FDF8F3]"
  };

  const sizes = {
    sm: "px-4 py-1.5 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-3.5 text-lg"
  };

  return (
    <button 
      // TypeScript giờ đã biết variant và size chắc chắn nằm trong danh sách key của variants/sizes
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const features = [
  {
    icon: Search,
    title: "Tìm kiếm thông minh",
    description: "Hệ thống lọc nâng cao giúp bạn tìm thấy căn phòng lý tưởng chỉ trong vài giây.",
  },
  {
    icon: Shield,
    title: "Xác thực KYC",
    description: "Môi trường an toàn tuyệt đối với quy trình xác minh danh tính người dùng chặt chẽ.",
  },
  {
    icon: FileText,
    title: "Hợp đồng điện tử",
    description: "Ký kết và quản lý hợp đồng pháp lý ngay trên điện thoại, minh bạch và nhanh chóng.",
  },
  {
    icon: Building2,
    title: "Quản lý tài sản",
    description: "Tự động hóa quản lý hóa đơn, lịch đóng tiền và báo cáo doanh thu cho chủ trọ.",
  },
];

const stats = [
  { value: "10,000+", label: "Phòng trọ sẵn sàng" },
  { value: "5,000+", label: "Chủ trọ tin dùng" },
  { value: "50,000+", label: "Người thuê đã kết nối" },
  { value: "4.9/5", label: "Đánh giá hài lòng" },
];

export default function App() {
    const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#FDF8F3] font-sans text-[#4A3728]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#EBD9C8]/40 blur-3xl" />
          <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[#DBC1AC]/30 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="max-w-2xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5E3C]/10 text-[#8B5E3C] text-sm font-semibold mb-6">
                <Star className="h-4 w-4 fill-current" />
                <span>Một trong số các nền tảng thuê phòng số 1 Việt Nam</span>
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight text-[#2D1F15] sm:text-6xl lg:text-7xl leading-[1.1]">
                Nâng tầm trải nghiệm <br />
                <span className="text-[#8B5E3C]">thuê phòng trọ</span>
              </h1>
              <p className="mt-8 text-lg leading-relaxed text-[#6D5D50] max-w-xl mx-auto lg:mx-0">
                Kết nối chủ trọ và người thuê thông qua công nghệ hiện đại. 
                Đơn giản hóa mọi thủ tục giấy tờ, thanh toán minh bạch và an toàn tuyệt đối.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                {!isAuthenticated && (
                  <Link to="/register">
                    <Button size="lg" className="w-full sm:w-auto gap-2 group">
                      Bắt đầu ngay
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                )}
                <Link to="/properties">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Khám phá phòng trọ
                </Button> 
              </Link>
              </div>
            </div>

            {/* Hero Image / Mockup Decoration */}
            <div className="relative w-full max-w-lg lg:max-w-none lg:flex-1">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
                <img 
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800" 
                  alt="Modern Apartment" 
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-[#EBD9C8]">
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <MapPin className="text-[#8B5E3C] h-4 w-4" />
                    <span>Quận 1, TP. Hồ Chí Minh</span>
                    <span className="ml-auto text-[#8B5E3C]">Từ 3.5tr/tháng</span>
                  </div>
                </div>
              </div>
              {/* Floating Badge */}
              <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl hidden sm:block animate-bounce">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Trạng thái</p>
                    <p className="text-sm font-bold">Phòng đã xác thực</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-24 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="group relative rounded-2xl bg-white/60 backdrop-blur-sm p-8 text-center border border-white/50 hover:bg-white transition-all shadow-sm">
                <div className="text-4xl font-black text-[#8B5E3C] mb-2">{stat.value}</div>
                <div className="text-xs uppercase tracking-widest font-bold text-[#6D5D50]/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-sm font-bold text-[#8B5E3C] uppercase tracking-[0.2em] mb-4">Giải pháp toàn diện</h2>
            <h3 className="text-4xl font-bold tracking-tight text-[#2D1F15] sm:text-5xl">
              Tại sao chọn SmartRental?
            </h3>
            <div className="h-1.5 w-24 bg-[#DBC1AC] mx-auto mt-6 rounded-full" />
            <p className="mt-6 text-lg text-[#6D5D50]">
              Chúng tôi không chỉ cung cấp nơi ở, chúng tôi mang lại một phong cách sống tiện nghi và cộng đồng tin cậy.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-3xl border border-[#EBD9C8] bg-[#FDF8F3]/30 transition-all duration-300 hover:bg-white hover:shadow-xl hover:-translate-y-2"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B5E3C]/10 text-[#8B5E3C] transition-colors group-hover:bg-[#8B5E3C] group-hover:text-white">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h4 className="mt-6 text-xl font-bold text-[#2D1F15]">{feature.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-[#6D5D50]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[3rem] bg-[#2D1F15] py-20 px-8 sm:px-16">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#8B5E3C_1px,transparent_1px)] [background-size:20px_20px]" />
            </div>
            
            <div className="relative z-10 mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Tối ưu hóa nguồn thu <br className="hidden sm:block" /> từ căn hộ của bạn
              </h2>
              <p className="mt-6 text-lg text-[#DBC1AC]">
                Gia nhập cộng đồng hơn 5,000 chủ trọ thông thái. Đăng tin hoàn toàn miễn phí và bắt đầu quản lý chuyên nghiệp ngay hôm nay.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-6">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto gap-3 py-6 px-10">
                  <Users className="h-5 w-5" />
                  Đăng ký làm chủ trọ
                </Button>
                
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-[#DBC1AC]/60">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#8B5E3C]" />
                    Không phí ẩn
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#8B5E3C]" />
                    Hợp đồng mẫu chuẩn
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#8B5E3C]" />
                    Hỗ trợ pháp lý
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="py-12 border-t border-[#EBD9C8] text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-8 w-8 bg-[#8B5E3C] rounded-lg flex items-center justify-center text-white font-bold">S</div>
          <span className="text-xl font-bold tracking-tight text-[#2D1F15]">SmartRental</span>
        </div>
        <p className="text-[#6D5D50] text-sm">© 2025 SmartRental. Thiết kế bởi sự tinh tế và công nghệ hiện đại.</p>
      </footer>
    </div>
  );
}