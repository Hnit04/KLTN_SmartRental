import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle,
  FileText,
  MapPin,
  Search,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import StatusBadge from "@/components/shared/StatusBadge";
import { useAuth } from "@/context/AuthContext";

type HeroStat = {
  endValue: number;
  decimals?: number;
  suffix?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
};

const features = [
  {
    icon: Search,
    title: "Tìm kiếm thông minh",
    description: "Bộ lọc rõ ràng, thao tác nhanh để chốt phòng phù hợp chỉ trong vài phút.",
  },
  {
    icon: Shield,
    title: "Xác thực KYC",
    description: "Tăng mức độ an toàn giữa Chủ trọ và Người thuê bằng quy trình xác thực minh bạch.",
  },
  {
    icon: FileText,
    title: "Hợp đồng linh hoạt",
    description: "Dùng hợp đồng truyền thống hoặc blockchain theo nhu cầu, không ép người dùng.",
  },
  {
    icon: Building2,
    title: "Quản lý tập trung",
    description: "Theo dõi phòng, hóa đơn, lịch hẹn và tỉ lệ lấp đầy trên một dashboard dễ nhìn.",
  },
];

const stats: HeroStat[] = [
  { endValue: 10000, suffix: "+", label: "Phòng sẵn sàng", icon: MapPin, iconBg: "bg-primary/10", iconColor: "text-primary" },
  { endValue: 5000, suffix: "+", label: "Chủ trọ tin dùng", icon: Building2, iconBg: "bg-success/10", iconColor: "text-success" },
  { endValue: 50000, suffix: "+", label: "Người thuê kết nối", icon: Users, iconBg: "bg-trust/10", iconColor: "text-trust" },
  { endValue: 4.8, decimals: 1, suffix: "/5", label: "Đánh giá hài lòng", icon: Star, iconBg: "bg-warning/15", iconColor: "text-warning" },
];

const trustHighlights = [
  {
    icon: Shield,
    title: "Không bắt buộc blockchain",
    description: "Bạn có thể bắt đầu hoàn toàn với flow truyền thống. Blockchain chỉ dùng khi bạn cần thêm lớp xác minh.",
  },
  {
    icon: FileText,
    title: "Hợp đồng minh bạch",
    description: "Mọi lần cập nhật hợp đồng đều được hiển thị rõ trạng thái để dễ theo dõi và đối soát.",
  },
  {
    icon: CheckCircle,
    title: "Thanh toán có kiểm chứng",
    description: "Tiến trình thanh toán luôn có trạng thái cụ thể: khởi tạo, chờ xác nhận, hoàn tất hoặc cần xử lý lại.",
  },
];

const onboardingSteps = [
  {
    step: "01",
    title: "Tìm phòng phù hợp",
    description: "Dùng bộ lọc theo khu vực, ngân sách và tiện nghi để rút ngắn thời gian lựa chọn.",
    cta: "Xem danh sách phòng",
    to: "/properties",
  },
  {
    step: "02",
    title: "Đặt lịch và xác minh",
    description: "Đặt lịch xem phòng, xác minh thông tin Chủ trọ và nhận gợi ý AI để quyết định nhanh hơn.",
    cta: "Bắt đầu tạo tài khoản",
    to: "/register",
  },
  {
    step: "03",
    title: "Ký và thanh toán",
    description: "Chọn ký hợp đồng truyền thống hoặc blockchain, sau đó thanh toán theo tiến trình rõ ràng.",
    cta: "Tìm hiểu quy trình ký",
    to: "/help",
  },
];

const useCountUp = (end: number, duration = 1800) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | undefined;
    let rafId = 0;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(end * progress));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [duration, end]);

  return count;
};

function CountUpStat({ stat }: { stat: HeroStat }) {
  const decimals = stat.decimals ?? 0;
  const scale = decimals > 0 ? 10 ** decimals : 1;
  const animatedCount = useCountUp(Math.round(stat.endValue * scale), 1800);
  const displayValue = (animatedCount / scale).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div className="group relative cursor-default rounded-2xl border border-white/15 bg-white/5 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-lg sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconBg} ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105`}
        >
          <stat.icon className={`h-5 w-5 stroke-[1.6] ${stat.iconColor}`} />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            {displayValue}
            {stat.suffix ?? ""}
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">{stat.label}</div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden pb-10 pt-6 sm:pb-14 sm:pt-8">
        <div className="absolute left-1/2 top-0 -z-10 h-full w-full -translate-x-1/2">
          <div className="absolute right-[-8%] top-[-20%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-[-12%] left-[-10%] h-[420px] w-[420px] rounded-full bg-trust/12 blur-3xl" />
        </div>

        <div className="page-shell">
          <div className="relative overflow-hidden rounded-[2rem] border border-border/70 shadow-xl shadow-black/10">
            <img
              src="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&q=80&w=1800"
              alt="Không gian phòng trọ hiện đại"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
            <div className="absolute inset-0 bg-black/10" />

            <div className="relative z-10 flex min-h-[460px] flex-col justify-between p-5 sm:p-7 lg:min-h-[560px] lg:p-10">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>SmartRental - Thuê phòng dễ hơn</span>
                </div>

                <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-6xl">
                  Thuê phòng nhanh hơn
                  <br />
                  với trải nghiệm đáng tin cậy
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                  Tập trung vào điều quan trọng nhất: phòng phù hợp, hợp đồng rõ ràng, thanh toán minh bạch.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <StatusBadge label="Đã xác thực" tone="success" className="text-xs font-bold shadow-sm" />
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
                    <Shield className="h-3.5 w-3.5" />
                    Không bắt buộc blockchain
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
                    <FileText className="h-3.5 w-3.5" />
                    Hợp đồng minh bạch
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/25 bg-white/10 p-3 shadow-xl backdrop-blur-md sm:p-4">
                <div className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/20 bg-black/15 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-white/70">Trust Score</p>
                      <p className="mt-1 text-xl font-bold text-white">92/100</p>
                      <p className="mt-0.5 text-xs text-white/80">Phòng đã xác thực</p>
                    </div>
                    <div className="rounded-xl border border-white/20 bg-black/15 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-white/70">Tốc độ</p>
                      <p className="mt-1 text-xl font-bold text-white">&lt; 24h</p>
                      <p className="mt-0.5 text-xs text-white/80">Từ xem phòng đến chốt cọc</p>
                    </div>
                    <div className="rounded-xl border border-white/20 bg-black/15 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-white/70">Ký hợp đồng</p>
                      <p className="mt-1 text-xl font-bold text-white">2 lựa chọn</p>
                      <p className="mt-0.5 text-xs text-white/80">Truyền thống hoặc blockchain</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-2 rounded-xl border border-white/20 bg-black/15 p-3">
                    <p className="text-sm font-semibold text-white">Bắt đầu ngay</p>
                    <p className="text-xs leading-relaxed text-white/80">
                      Đi thẳng vào luồng rõ ràng, ít thao tác và hoàn tất nhanh cho cả người thuê lẫn chủ trọ.
                    </p>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                      <Link to="/properties" className="flex-1">
                        <Button className="h-10 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                          Khám phá phòng
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={isAuthenticated ? "/dashboard" : "/register"} className="flex-1">
                        <Button variant="outline" className="h-10 w-full border-white/35 bg-white/10 text-white hover:bg-white/20">
                          {isAuthenticated ? "Vào bảng điều khiển" : "Tạo tài khoản"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-white/15 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 p-3 shadow-xl shadow-slate-900/20 sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              {stats.map((stat) => (
                <CountUpStat key={stat.label} stat={stat} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-8 sm:pb-12">
        <div className="page-shell">
          <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 text-white shadow-xl shadow-slate-900/30 sm:p-7 lg:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(hsl(var(--primary)/0.16)_1px,transparent_1px)] [background-size:22px_22px] opacity-60" />

            <div className="relative mb-6 flex flex-col gap-2 text-left sm:mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/70">Trust-first experience</p>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Thiết kế để dễ dùng và dễ tin tưởng</h2>
              <p className="max-w-3xl text-sm text-white/75 sm:text-base">
                Blockchain là lớp bảo chứng bổ sung, không phải rào cản. Người dùng phổ thông vẫn hoàn tất toàn bộ hành trình một cách quen thuộc.
              </p>
            </div>

            <div className="relative grid gap-3 sm:grid-cols-3 sm:gap-4">
              {trustHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition-all duration-200 hover:border-primary/45 hover:bg-white/15"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-primary-foreground ring-1 ring-white/20">
                    <item.icon className="h-5 w-5 stroke-[1.6]" />
                  </div>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/80">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-14 pt-2 sm:pb-16">
        <div className="page-shell">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-slate-100 via-white to-slate-100 p-5 shadow-inner sm:p-7 lg:p-8">
            <div className="pointer-events-none absolute -left-14 top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-8 h-28 w-28 rounded-full bg-trust/10 blur-3xl" />

            <div className="relative mb-8 text-left">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Bắt đầu nhanh</h2>
              <h3 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Hoàn tất trong 3 bước</h3>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Mỗi bước chỉ có một mục tiêu chính, giúp giảm nhiễu thao tác và tăng tỉ lệ hoàn tất booking, ký hợp đồng và thanh toán.
              </p>
            </div>

            <div className="relative grid gap-4 lg:grid-cols-3">
              {onboardingSteps.map((item) => (
                <div
                  key={item.step}
                  className="group rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground ring-4 ring-primary/15">
                    {item.step}
                  </span>
                  <h4 className="mt-4 text-lg font-bold text-foreground">{item.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  <Link
                    to={item.to}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    {item.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-16 sm:py-20">
        <div className="page-shell">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-white p-5 shadow-sm sm:p-7 lg:p-8">
            <div className="mb-10 text-center sm:mb-14">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Giải pháp toàn diện</h2>
              <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Tại sao chọn SmartRental?</h3>
              <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-primary/30" />
              <p className="mx-auto mt-5 max-w-3xl text-base text-muted-foreground sm:text-lg">
                Từ tìm phòng, hẹn lịch xem, ký hợp đồng đến thanh toán: mọi thứ được thiết kế để dễ hiểu, dễ thao tác và hoàn tất nhanh.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6 stroke-[1.5]" />
                  </div>
                  <h4 className="mt-5 text-lg font-bold text-foreground">{feature.title}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-4 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-800 px-6 py-12 shadow-xl shadow-slate-900/30 sm:px-10 sm:py-16 lg:px-16">
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(hsl(var(--primary)/0.4)_1px,transparent_1px)] [background-size:18px_18px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Tối ưu doanh thu
                <br className="hidden sm:block" />
                từ tài sản của bạn
              </h2>
              <p className="mt-6 text-lg text-white/80">
                Gia nhập cộng đồng Chủ trọ đang tăng trưởng nhanh và quản lý phòng trọ theo chuẩn SaaS hiện đại.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-6">
                <Link to="/register">
                  <Button size="lg" className="w-full gap-3 px-10 py-6 sm:w-auto">
                    <Users className="h-5 w-5" />
                    Đăng ký làm chủ trọ
                  </Button>
                </Link>

                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-white/75">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Không phí ẩn
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Hợp đồng mẫu chuẩn
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
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
