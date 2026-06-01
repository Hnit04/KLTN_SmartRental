import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { contractApi } from '@/api/contractApi';

interface AdminDisputeResolutionPanelProps {
  contractId: number;
  onSuccess: () => void;
}

export default function AdminDisputeResolutionPanel({ contractId, onSuccess }: AdminDisputeResolutionPanelProps) {
  const [tenantRefundAmount, setTenantRefundAmount] = useState<number>(0);
  const [landlordDeductionAmount, setLandlordDeductionAmount] = useState<number>(0);
  const [resolutionNote, setResolutionNote] = useState('');
  const [terminateContract, setTerminateContract] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNote) {
      toast.warning("Vui lòng nhập ghi chú giải quyết tranh chấp.");
      return;
    }

    try {
      setIsResolving(true);
      await contractApi.resolveDispute(contractId, {
        tenantRefundAmount,
        landlordDeductionAmount,
        resolutionNote,
        terminateContract
      });
      toast.success("Đã giải quyết tranh chấp thành công!");
      onSuccess();
    } catch (error: any) {
      console.error("Resolve dispute error:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi giải quyết tranh chấp.");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="mt-4 p-4 border-2 border-indigo-500 bg-indigo-50 rounded-xl space-y-4">
      <h3 className="font-bold text-indigo-900 flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-indigo-600" /> Bảng Điều Khiển Giải Quyết Tranh Chấp (Admin)
      </h3>
      <p className="text-sm text-indigo-700">
        Là Quản trị viên, bạn có quyền phân xử số tiền bồi thường/phạt và quyết định xem có chấm dứt hợp đồng hay không. Quyết định này sẽ được ghi nhận lên Blockchain nếu hợp đồng là Web3.
      </p>

      <form onSubmit={handleResolve} className="space-y-4 bg-white p-4 rounded-lg border border-indigo-100">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tenantRefundAmount">Hoàn tiền cho khách thuê (VNĐ)</Label>
            <Input 
              id="tenantRefundAmount" 
              type="number"
              min="0"
              value={tenantRefundAmount}
              onChange={(e) => setTenantRefundAmount(Number(e.target.value))}
              disabled={isResolving}
            />
          </div>
          <div>
            <Label htmlFor="landlordDeductionAmount">Phạt chủ nhà (VNĐ)</Label>
            <Input 
              id="landlordDeductionAmount" 
              type="number"
              min="0"
              value={landlordDeductionAmount}
              onChange={(e) => setLandlordDeductionAmount(Number(e.target.value))}
              disabled={isResolving}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="resolutionNote">Biên bản giải quyết (Ghi chú)</Label>
          <Textarea 
            id="resolutionNote" 
            placeholder="Ghi rõ lý do phân xử..."
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            disabled={isResolving}
            className="h-24"
          />
        </div>

        <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
          <input 
            type="checkbox" 
            id="terminateContract" 
            checked={terminateContract}
            onChange={(e) => setTerminateContract(e.target.checked)}
            disabled={isResolving}
            className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
          />
          <Label htmlFor="terminateContract" className="cursor-pointer font-bold text-red-600">
            Chấm dứt hợp đồng ngay lập tức sau khi giải quyết
          </Label>
        </div>

        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" isLoading={isResolving}>
          Xác Nhận Giải Quyết Tranh Chấp
        </Button>
      </form>
    </div>
  );
}
