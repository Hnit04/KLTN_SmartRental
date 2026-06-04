import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { contractApi } from '@/api/contractApi';
import ConfirmActionDialog from '@/components/shared/ConfirmActionDialog';

interface CancelContractButtonProps {
  contractId: number;
  onSuccess: () => void;
  disabled?: boolean;
}

export default function CancelContractButton({ contractId, onSuccess, disabled }: CancelContractButtonProps) {
  const [isCanceling, setIsCanceling] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleCancel = async () => {
    try {
      setIsCanceling(true);
      await contractApi.cancelContract(contractId);
      toast.success("Hủy hợp đồng thành công!");
      setIsConfirmOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Cancel contract error:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi hủy hợp đồng.");
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isCanceling || disabled}
        className="flex items-center gap-2"
      >
        <XCircle className="w-5 h-5" />
        Hủy Hợp Đồng
      </Button>

      <ConfirmActionDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Xác nhận hủy hợp đồng"
        description="Bạn có chắc chắn muốn hủy hợp đồng này không? Thao tác này không thể hoàn tác."
        onConfirm={handleCancel}
        isLoading={isCanceling}
        confirmText="Đồng ý, Hủy ngay"
        cancelText="Đóng"
        variant="danger"
      />
    </>
  );
}
