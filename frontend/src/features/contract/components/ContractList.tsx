import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { contractApi } from "@/api/contractApi";
import type { Contract } from "@/types";
import ContractItem from "./ContractItem";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";

export default function ContractList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setIsLoading(true);
        const res = await contractApi.getMyContracts();
        // Xử lý dữ liệu tùy vào format response của bạn (res.data hoặc res)
        setContracts(Array.isArray(res) ? res : (res as any).data || []);
      } catch (error) {
        console.error("Lỗi tải hợp đồng:", error);
        toast.error("Không thể tải danh sách hợp đồng");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
          <FileText className="h-8 w-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Chưa có hợp đồng nào</h3>
        <p className="text-sm text-gray-500 max-w-xs text-center mt-1">
          Bạn chưa thuê phòng nào hoặc hợp đồng chưa được tạo. Hãy tìm phòng và đăng ký thuê ngay.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {contracts.map((contract) => (
        <ContractItem key={contract.id} data={contract} />
      ))}
    </div>
  );
}