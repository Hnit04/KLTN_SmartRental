import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PenTool, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { contractApi } from '@/api/contractApi';
import { useAuth } from '@/context/AuthContext';
import type { Contract } from '@/types';

interface EIP712SignButtonProps {
  contract: Contract;
  onSuccess: () => void;
  disabled?: boolean;
}

export default function EIP712SignButton({ contract, onSuccess, disabled }: EIP712SignButtonProps) {
  const [isSigning, setIsSigning] = useState(false);
  const { user } = useAuth();

  const handleSign = async () => {
    try {
      setIsSigning(true);

      if (!window.ethereum) {
        toast.error("Vui lòng cài đặt ví MetaMask để ký hợp đồng!");
        return;
      }

      // Connect to MetaMask
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];

      // Validate wallet matches registered profile wallet if applicable
      const registeredWallet = user?.walletAddress || "";
      if (registeredWallet && walletAddress.toLowerCase() !== registeredWallet.toLowerCase()) {
        toast.error(`Sai ví! Vui lòng sử dụng ví đã đăng ký (${registeredWallet.substring(0, 6)}...). Bạn đang chọn ${walletAddress.substring(0, 6)}...`);
        return;
      }

      if (!contract.contractHash) {
         toast.error("Thiếu thông tin Contract Hash, không thể ký bằng Web3.");
         return;
      }

      toast.info("Vui lòng xác nhận ký trên MetaMask...");
      
      // We use personal_sign for signing the contractHash since the smart contract isn't deployed yet.
      // Ethers/MetaMask requires the message to be hex-encoded for personal_sign if it's raw data, 
      // but contractHash is usually a hex string already (e.g. "cae3aa...").
      // Wait, in Java: if (message.length() == 64) recoverAddress(Numeric.hexStringToByteArray(message))
      // It means the backend expects the signature of the raw bytes of the 64-char hex string, OR the utf-8 string of it.
      // Usually, `eth_personalSign` prefixes the message.
      const messageToSign = "0x" + contract.contractHash.replace("0x", "");
      
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [messageToSign, walletAddress],
      });

      toast.info("Đang gửi chữ ký về hệ thống...");
      // Submit signature to backend
      await contractApi.signContract(contract.id, { 
          signMethod: 'BLOCKCHAIN',
          signature: signature
      });

      toast.success("Ký hợp đồng thành công!");
      onSuccess();

    } catch (error: any) {
      console.error("Signing error:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Lỗi khi ký hợp đồng.";
      if (error?.code === 4001 || error?.message?.includes("User denied")) {
        toast.error("Bạn đã hủy yêu cầu ký trên MetaMask.");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleSign}
        disabled={isSigning || disabled}
        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 w-full sm:w-auto"
      >
        {isSigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
        {isSigning ? "Đang xử lý..." : "Ký Hợp Đồng (Web3)"}
      </Button>
      <p className="text-[10px] text-gray-500 text-center max-w-xs leading-tight">
        Bằng việc ký, bạn đồng ý với các <a href="#" className="text-blue-500 hover:underline">Điều khoản giải quyết tranh chấp</a> của Nền tảng. 
        Tiền cọc sẽ được giữ an toàn bởi Smart Contract.
      </p>
    </div>
  );
}
