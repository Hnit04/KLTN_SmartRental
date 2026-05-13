import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, ChevronRight, FileText, Banknote } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { Contract } from "@/types";
import { featureFlags } from "@/config/featureFlags";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { canAccessContractSigningWizard } from "@/features/contract/utils/contractFlowGuards";

interface ContractItemProps {
  data: Contract;
}

export default function ContractItem({ data }: ContractItemProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const formatDate = (dateStr: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString("vi-VN") : "Chua xac dinh";

  const renderStatus = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <StatusBadge label="Hieu luc" tone="success" className="px-2.5 py-1 text-xs font-semibold" />;
      case "PENDING_SIGNATURE":
        return <StatusBadge label="Cho ky" tone="warning" className="px-2.5 py-1 text-xs font-semibold" />;
      case "AWAITING_DEPOSIT":
        return <StatusBadge label="Cho thanh toan" tone="warning" className="px-2.5 py-1 text-xs font-semibold" />;
      case "EXPIRED":
        return <StatusBadge label="Het han" tone="neutral" className="px-2.5 py-1 text-xs font-semibold" />;
      case "TERMINATED_EARLY":
        return <StatusBadge label="Cham dut som" tone="danger" className="px-2.5 py-1 text-xs font-semibold" />;
      case "CANCELLED":
        return <StatusBadge label="Da huy" tone="danger" className="px-2.5 py-1 text-xs font-semibold" />;
      default:
        return <StatusBadge label="Khong xac dinh" tone="neutral" className="px-2.5 py-1 text-xs font-semibold" />;
    }
  };

  const canUseSignAction = canAccessContractSigningWizard(data);
  const prefix = user?.role === "LANDLORD" ? "/landlord" : "/tenant";
  const detailPath = `${prefix}/contracts/${data.id}`;
  const signActionPath = featureFlags.contractSigningV2
    ? `${prefix}/contracts/${data.id}/sign`
    : detailPath;

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 transition-all duration-300 hover:border-primary hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-6"
      onClick={() => {
        navigate(detailPath);
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-500" />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4 md:w-1/4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-primary shadow-sm transition-all duration-300">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-base font-bold text-primary transition-colors">
              {data.roomName || `Phong #${data.roomId}`}
            </h3>
            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide text-slate-600">
              MA: {data.code || `#${data.id}`}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 text-sm text-slate-600 md:w-1/3">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            <span className="line-clamp-2 font-medium leading-relaxed text-slate-600">
              {data.propertyAddress || "Dia chi dang cap nhat..."}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="text-[13px] font-medium text-slate-500">
              {formatDate(data.startDate)} - {formatDate(data.endDate)}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center md:w-1/6">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Banknote className="h-3.5 w-3.5 text-slate-400" />
            <span>Gia thue thang</span>
          </div>
          <p className="text-xl font-black tracking-tight text-slate-900">{formatPrice(data.actualPrice || 0)}</p>
        </div>

        <div className="flex items-center justify-between gap-6 border-t border-slate-100/80 pt-4 md:w-1/4 md:justify-end md:border-t-0 md:pt-0">
          <div className="flex items-center gap-2">
            {renderStatus(data.status)}

            {canUseSignAction && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-primary/20 bg-primary/5 font-bold text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(signActionPath);
                }}
              >
                Ky & Thanh toan
              </Button>
            )}

            {(data.status === "EXPIRED" || data.status === "TERMINATED_EARLY") && data.depositStatus === "DEPOSITED" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-amber-200 bg-amber-50 font-bold text-amber-700 hover:bg-amber-100"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`${prefix}/contracts/${data.id}/settle`);
                }}
              >
                {user?.role === "LANDLORD" ? "Quyet toan ngay" : "Theo doi quyet toan"}
              </Button>
            )}
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-300">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
