import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  Building2,
  Shield,
  FileText,
  Users,
  CheckCircle,
  ArrowRight,
  Home,
  Search,
  Star,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Tìm kiếm thông minh",
    description: "Lọc phòng theo giá, vị trí, tiện nghi phù hợp với nhu cầu của bạn",
  },
  {
    icon: Shield,
    title: "Xác thực KYC",
    description: "Đảm bảo an toàn với quy trình xác minh danh tính chặt chẽ",
  },
  {
    icon: FileText,
    title: "Hợp đồng điện tử",
    description: "Ký kết hợp đồng online, lưu trữ an toàn và minh bạch",
  },
  {
    icon: Building2,
    title: "Quản lý tài sản",
    description: "Công cụ quản lý phòng trọ, hóa đơn, thanh toán tiện lợi",
  },
];

const stats = [
  { value: "10,000+", label: "Phòng trọ" },
  { value: "5,000+", label: "Chủ trọ" },
  { value: "50,000+", label: "Người thuê" },
  { value: "4.8", label: "Đánh giá" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SmartRental</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className="text-sm font-medium text-foreground hover:text-primary">
              Trang chủ
            </Link>
            <Link to="/properties" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Tìm phòng
            </Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Giới thiệu
            </Link>
            <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Liên hệ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Đăng nhập
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Đăng ký</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/30 to-background" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Nền tảng thuê phòng{" "}
              <span className="text-primary">thông minh</span>
            </h1>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
              Kết nối chủ trọ và người thuê một cách dễ dàng, minh bạch và an toàn. 
              Quản lý hợp đồng, thanh toán và tất cả trong một nền tảng duy nhất.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register">
                <Button size="lg" className="gap-2">
                  Bắt đầu ngay
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/properties">
                <Button variant="outline" size="lg">
                  Khám phá phòng trọ
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-card p-6 text-center shadow-sm">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Tính năng nổi bật
            </h2>
            <p className="mt-4 text-muted-foreground">
              SmartRental cung cấp đầy đủ công cụ để việc thuê và cho thuê phòng trở nên đơn giản hơn
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-primary">
            <div className="px-8 py-16 sm:px-16">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                  Bạn là chủ trọ?
                </h2>
                <p className="mt-4 text-primary-foreground/80">
                  Đăng tin cho thuê miễn phí, quản lý phòng và hợp đồng dễ dàng với SmartRental
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link to="/register?role=landlord">
                    <Button variant="secondary" size="lg" className="gap-2">
                      <Users className="h-4 w-4" />
                      Đăng ký làm chủ trọ
                    </Button>
                  </Link>
                </div>
                <div className="mt-8 flex items-center justify-center gap-6 text-sm text-primary-foreground/80">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Miễn phí đăng tin
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Hỗ trợ 24/7
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Home className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">SmartRental</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Nền tảng thuê phòng thông minh, kết nối chủ trọ và người thuê.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Sản phẩm</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link to="/properties" className="hover:text-primary">Tìm phòng</Link></li>
                <li><Link to="/pricing" className="hover:text-primary">Bảng giá</Link></li>
                <li><Link to="/features" className="hover:text-primary">Tính năng</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Hỗ trợ</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link to="/help" className="hover:text-primary">Trung tâm trợ giúp</Link></li>
                <li><Link to="/contact" className="hover:text-primary">Liên hệ</Link></li>
                <li><Link to="/faq" className="hover:text-primary">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Pháp lý</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-primary">Chính sách bảo mật</Link></li>
                <li><Link to="/terms" className="hover:text-primary">Điều khoản sử dụng</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              2024 SmartRental. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span>4.8/5 trên 1,000+ đánh giá</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
