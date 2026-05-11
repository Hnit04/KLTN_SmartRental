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
import React, { useEffect, useState } from "react";
import StatusBadge from "@/components/shared/StatusBadge";

// Custom hook để animate số
const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / duration;

      if (progress < 1) {
        setCount(Math.floor(end * progress));
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
};

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

// Component để render stat với animation
const CountUpStat = ({ stat }: { stat: typeof stats[0] }) => {
  // Trích xuất số (giữ lại dấu chấm/phẩy nếu là số thập phân)
  const isDecimal = stat.value.includes('.');
  const numValue = isDecimal
    ? parseFloat(stat.value.replace(/[^0-9.]/g, ''))
    : parseInt(stat.value.replace(/\D/g, ''));

  const count = useCountUp(numValue, 2000);

  // Trích xuất hậu tố (ví dụ: "+", "/5")
  // Xóa số và dấu phân cách hàng nghìn/thập phân để lấy hậu tố sạch
  const suffix = stat.value.replace(/[0-9.,]/g, '');

  return (
    <div className="group relative rounded-2xl bg-card p-8 text-center border border-border/40 hover:shadow-card hover:-translate-y-1 transition-all duration-300 cursor-pointer">
      <div className="flex justify-center">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${stat.iconBg} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
          <stat.icon className={`h-7 w-7 stroke-[1.5] ${stat.iconColor}`} />
        </div>
      </div>
      <div className="text-4xl font-extrabold tracking-tight text-foreground mt-6 mb-2 transition-transform duration-300 group-hover:scale-105">
        {isDecimal ? count.toFixed(1) : count.toLocaleString()}{suffix}
      </div>
      <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{stat.label}</div>
    </div>
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
  { value: "10,000+", label: "Phòng trọ sẵn sàng", icon: MapPin, iconBg: "bg-blue-500/10", iconColor: "text-blue-600" },
  { value: "5,000+", label: "Chủ trọ tin dùng", icon: Building2, iconBg: "bg-green-500/10", iconColor: "text-green-600" },
  { value: "50,000+", label: "Người thuê đã kết nối", icon: Users, iconBg: "bg-orange-500/10", iconColor: "text-orange-600" },
  { value: "4.8/5", label: "Đánh giá hài lòng", icon: Star, iconBg: "bg-yellow-500/10", iconColor: "text-yellow-600" },
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 text-primary text-xs uppercase tracking-[0.15em] font-bold mb-6 border border-primary/10 shadow-sm backdrop-blur-sm">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>Nền tảng thuê phòng số 1 Việt Nam</span>
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.15]">
                Nâng tầm trải nghiệm <br />
                <span className="text-primary">thuê phòng trọ</span>
              </h1>
              <p className="mt-8 text-lg leading-relaxed text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Kết nối chủ trọ và người thuê thông qua công nghệ hiện đại.
                Đơn giản hóa mọi thủ tục giấy tờ, thanh toán minh bạch và an toàn tuyệt đối.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                {!isAuthenticated ? (
                  <Link to="/register">
                    <Button size="lg" className="w-full sm:w-auto gap-2 group">
                      Bắt đầu ngay
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                ) : null}
                <Link to="/properties">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/50 border-border/60 shadow-sm hover:bg-white hover:shadow-md transition-all duration-300">
                    Khám phá phòng trọ
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Image / Mockup Decoration */}
            <div className="relative w-full max-w-lg lg:max-w-none lg:flex-1 group cursor-default">
              <div className="relative rounded-3xl overflow-hidden shadow-card border-8 border-white/80 transition-transform duration-500 group-hover:scale-[1.01]">
                <img
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800"
                  alt="Modern Apartment"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur-md p-4 rounded-xl shadow-soft border border-border/40 group-hover:-translate-y-1 transition-all duration-500">
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <MapPin className="text-primary h-4 w-4 stroke-[1.5]" />
                    <span className="text-foreground">Quận 1, TP. Hồ Chí Minh</span>
                    <span className="ml-auto text-primary font-bold">Từ 3.5tr/tháng</span>
                  </div>
                </div>
              </div>
              {/* Floating Badge */}
              <div className="absolute -top-6 -right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-soft border border-border/40 hidden sm:block transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-card">
                <div className="flex items-center gap-3">
                  <StatusBadge label="Đã xác thực" tone="success" className="text-xs font-bold" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Trạng thái</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">Phòng đã xác thực</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-24 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <CountUpStat key={stat.label} stat={stat} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">Giải pháp toàn diện</h2>
            <h3 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Tại sao chọn SmartRental?
            </h3>
            <div className="h-1 w-16 bg-primary/30 mx-auto mt-6 rounded-full" />
            <p className="mt-6 text-lg text-muted-foreground">
              Chúng tôi không chỉ cung cấp nơi ở, chúng tôi mang lại một phong cách sống tiện nghi và cộng đồng tin cậy.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-3xl border border-border/40 bg-card transition-all duration-300 hover:shadow-card hover:-translate-y-2"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-7 w-7 stroke-[1.5]" />
                </div>
                <h4 className="mt-6 text-xl font-bold text-foreground">{feature.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
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
                <Link to="/register">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto gap-3 py-6 px-10">
                    <Users className="h-5 w-5" />
                    Đăng ký làm chủ trọ
                  </Button>
                </Link>

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


    </div>
  );
}