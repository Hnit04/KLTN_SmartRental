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
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/Button";
import StatusBadge from "@/components/shared/StatusBadge";

type HeroStat = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
};

const features = [
  {
    icon: Search,
    title: "Tim kiem thong minh",
    description: "Loc nang cao giup ban tim phong phu hop trong vai giay.",
  },
  {
    icon: Shield,
    title: "Xac thuc KYC",
    description: "Xac minh danh tinh ro rang de tang an toan cho ca chu tro va nguoi thue.",
  },
  {
    icon: FileText,
    title: "Hop dong dien tu",
    description: "Ky ket va luu tru hop dong minh bach, de theo doi va de doi soat.",
  },
  {
    icon: Building2,
    title: "Quan ly tai san",
    description: "Theo doi phong, hoa don, doanh thu tren mot dashboard gon va de dung.",
  },
];

const stats: HeroStat[] = [
  { value: "10,000+", label: "Phong san sang", icon: MapPin, iconBg: "bg-primary/10", iconColor: "text-primary" },
  { value: "5,000+", label: "Chu tro tin dung", icon: Building2, iconBg: "bg-success/10", iconColor: "text-success" },
  { value: "50,000+", label: "Nguoi thue ket noi", icon: Users, iconBg: "bg-trust/10", iconColor: "text-trust" },
  { value: "4.8/5", label: "Danh gia hai long", icon: Star, iconBg: "bg-warning/15", iconColor: "text-warning" },
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
  const isDecimal = stat.value.includes(".");
  const rawNumber = isDecimal
    ? Number.parseFloat(stat.value.replace(/[^0-9.]/g, ""))
    : Number.parseInt(stat.value.replace(/\D/g, ""), 10);

  const count = useCountUp(rawNumber, 1800);
  const suffix = stat.value.replace(/[0-9.,]/g, "");

  return (
    <div className="group relative cursor-default rounded-2xl border border-border/50 bg-card p-7 text-center transition-all duration-page hover:-translate-y-1 hover:shadow-card">
      <div className="flex justify-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${stat.iconBg} transition-transform duration-page group-hover:scale-110`}
        >
          <stat.icon className={`h-7 w-7 stroke-[1.6] ${stat.iconColor}`} />
        </div>
      </div>
      <div className="mb-2 mt-6 text-4xl font-extrabold tracking-tight text-foreground">
        {isDecimal ? count.toFixed(1) : count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden pb-24 pt-16 sm:pb-32 sm:pt-24">
        <div className="absolute left-1/2 top-0 -z-10 h-full w-full -translate-x-1/2">
          <div className="absolute right-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-[-5%] left-[-5%] h-[400px] w-[400px] rounded-full bg-trust/15 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-12 lg:flex-row">
            <div className="max-w-2xl text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-primary shadow-soft">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>Nen tang thue phong thong minh</span>
              </div>

              <h1 className="text-5xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Don gian hoa hanh trinh <br />
                <span className="text-primary">tim va thue phong tro</span>
              </h1>

              <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
                Smart Rental ket noi chu tro va nguoi thue tren mot trai nghiem minh bach, an toan, va toi uu cho mobile.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                {!isAuthenticated && (
                  <Link to="/register">
                    <Button size="lg" className="w-full gap-2 sm:w-auto">
                      Bat dau ngay
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                )}

                <Link to="/properties">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-border/60 bg-card/70 shadow-soft transition-all duration-hover hover:bg-card hover:shadow-card sm:w-auto"
                  >
                    Kham pha phong tro
                  </Button>
                </Link>
              </div>
            </div>

            <div className="group relative w-full max-w-lg cursor-default lg:max-w-none lg:flex-1">
              <div className="relative overflow-hidden rounded-3xl border-8 border-card/80 shadow-card transition-transform duration-page group-hover:scale-[1.01]">
                <img
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800"
                  alt="Modern apartment"
                  className="h-[400px] w-full object-cover"
                />

                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border/40 bg-background/85 p-4 shadow-soft backdrop-blur-md transition-all duration-page group-hover:-translate-y-1">
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <MapPin className="h-4 w-4 stroke-[1.5] text-primary" />
                    <span className="text-foreground">Quan 1, TP. Ho Chi Minh</span>
                    <span className="ml-auto font-bold text-primary">Tu 3.5tr/thang</span>
                  </div>
                </div>
              </div>

              <div className="absolute -right-6 -top-6 hidden rounded-2xl border border-border/40 bg-card/90 p-4 shadow-soft backdrop-blur-md transition-all duration-page group-hover:-translate-y-2 group-hover:shadow-card sm:block">
                <div className="flex items-center gap-3">
                  <StatusBadge label="Da xac thuc" tone="success" className="text-xs font-bold" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trang thai</p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">Phong da xac thuc</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-24 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <CountUpStat key={stat.label} stat={stat} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">Giai phap toan dien</h2>
            <h3 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Tai sao chon Smart Rental?</h3>
            <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-primary/30" />
            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground">
              Tu tim phong, hen lich xem, den ky hop dong va thanh toan, tat ca duoc thiet ke de de hieu va de hoan tat.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-3xl border border-border/40 bg-card p-8 transition-all duration-page hover:-translate-y-2 hover:shadow-card"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-7 w-7 stroke-[1.5]" />
                </div>
                <h4 className="mt-6 text-xl font-bold text-foreground">{feature.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[3rem] bg-secondary px-8 py-20 sm:px-16">
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(hsl(var(--primary))_1px,transparent_1px)] [background-size:20px_20px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-secondary-foreground sm:text-5xl">
                Toi uu hoa doanh thu
                <br className="hidden sm:block" />
                tu tai san cua ban
              </h2>
              <p className="mt-6 text-lg text-secondary-foreground/80">
                Gia nhap cong dong chu tro dang tang truong nhanh va quan ly phong tro theo chuan SaaS hien dai.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-6">
                <Link to="/register">
                  <Button variant="secondary" size="lg" className="w-full gap-3 px-10 py-6 sm:w-auto">
                    <Users className="h-5 w-5" />
                    Dang ky lam chu tro
                  </Button>
                </Link>

                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-secondary-foreground/70">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Khong phi an
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Hop dong mau chuan
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Ho tro phap ly
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
