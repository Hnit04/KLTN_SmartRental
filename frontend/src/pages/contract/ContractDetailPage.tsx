import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText, Download, PenTool, CheckCircle, Calendar,
  MapPin, ArrowLeft, Blocks, Receipt,
  AlertCircle, Clock, CheckCircle2, Loader2, Star, Users,
  MessageSquare, XCircle, Check, Sparkles, User, LogOut, TrendingUp, QrCode, Trash2, ShieldCheck,
  AlertTriangle, Banknote, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { contractApi } from "@/api/contractApi";
import { billApi } from "@/api/billApi";
import { residentRequestApi } from "@/api/residentRequestApi";
import { paymentApi } from "@/api/paymentApi";
import { 
  getSmartContract, 
  depositContract, 
  payBill as web3PayBill, 
  payExternalBill as web3PayExternalBill,
  proposeDeduction as web3ProposeDeduction,
  consentEndContract as web3ConsentEndContract,
  executeEndContract as web3ExecuteEndContract,
  withdrawFunds as web3WithdrawFunds
} from "@/utils/contractHelper";
import StatusBadge from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl, type SegmentItem } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { DashboardPanel } from "@/components/dashboard";
import {
  AttentionBanner,
  StatusSummaryStrip,
  OperationalTimeline,
  type AttentionTone,
  type SummaryStripItem,
  type OperationalTimelineEvent,
} from "@/components/detail";
import { Bot } from "lucide-react";
import type {
  Contract,
  ContractChangeRequest,
  RequestType,
  ContractMemberResponse,
  ResidentRequestResponse
} from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useSystemConfig } from "@/context/SystemConfigContext";
import ReviewModal from "@/features/interaction/components/ReviewModal";
import html2pdf from "html2pdf.js";
import { ethers } from "ethers";
import RiskNotice from "@/components/shared/RiskNotice";
import ConfirmActionDialog from "@/components/shared/ConfirmActionDialog";
import {
  getBlockchainRuntimeConfig,
  isWalletOnExpectedChain,
} from "@/config/blockchainConfig";

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  PENDING_SIGNATURE: "Chờ ký",
  AWAITING_DEPOSIT: "Chờ cọc",
  ACTIVE: "Đang hiệu lực",
  EXPIRED: "Hết hạn",
  TERMINATED_EARLY: "Chấm dứt sớm",
  CANCELLED: "Đã hủy",
};

const CHANGE_TYPE_LABELS: Record<RequestType, string> = {
  RENT_INCREASE: "Điều chỉnh giá thuê",
  EXTENSION: "Gia hạn hợp đồng",
  TERMINATION: "Chấm dứt trước hạn",
  CHANGE_TERMS: "Điều khoản / nội quy",
  CHANGE_SIGN_METHOD: "Phương thức ký",
};

const REQUEST_STATUS_SHORT: Record<string, string> = {
  PENDING: "Chờ xử lý",
  ACCEPTED: "Đã chấp nhận",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

interface ContractDetail extends Contract {
  roomName?: string;
  propertyAddress?: string;
  landlordName?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantCccd?: string;
  additionalTerms?: string;
  elecPrice?: number;
  waterPrice?: number;
  internetPrice?: number;
  tenantWalletAddress?: string;
  tenantBankName?: string;
  tenantBankAccountNumber?: string;
  tenantBankAccountHolder?: string;
  tenantBankQrUrl?: string;
  landlordWalletAddress?: string;
  landlordBankName?: string;
  landlordBankAccountNumber?: string;
  landlordBankAccountHolder?: string;
  landlordBankQrUrl?: string;
  cancelReason?: string;
}

export default function ContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefix = user?.role === 'LANDLORD' ? '/landlord' : '/tenant';
  const { config } = useSystemConfig();
  const runtimeBlockchainConfig = useMemo(
    () => getBlockchainRuntimeConfig(config),
    [config]
  );

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chainRiskMessage, setChainRiskMessage] = useState<string | null>(null);

  const [isSigning, setIsSigning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  // --- TRADITIONAL PAYMENT STATE ---
  const [isTraditionalPaymentModalOpen, setIsTraditionalPaymentModalOpen] = useState(false);
  const [selectedBillToPay, setSelectedBillToPay] = useState<any>(null);
  const [isNotifyingPayment, setIsNotifyingPayment] = useState(false);

  // --- SEPAY DEPOSIT QR STATE ---
  const [isDepositQrModalOpen, setIsDepositQrModalOpen] = useState(false);
  const [depositQrData, setDepositQrData] = useState<any>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const [activeTab, setActiveTab] = useState<'INFO' | 'BILLS'>('INFO');
  const [bills, setBills] = useState<any[]>([]);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [changeRequests, setChangeRequests] = useState<ContractChangeRequest[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // AI Legal Advisor State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzingRequest, setIsAnalyzingRequest] = useState(false);
  const [requestAnalysisResult, setRequestAnalysisResult] = useState<string | null>(null);

  // Roommate / Resident requests
  const [members, setMembers] = useState<ContractMemberResponse[]>([]);

  // --- SETTLEMENT STATE ---
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);
  const [settleForm, setSettleForm] = useState({ deductionAmount: 0, earlyTermination: false });
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isConsenting, setIsConsenting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [residentRequests, setResidentRequests] = useState<ResidentRequestResponse[]>([]);
  const [isUpdatingResident, setIsUpdatingResident] = useState(false);
  const [isApprovingRequest, setIsApprovingRequest] = useState<number | null>(null);

  const [isRemovalOpen, setIsRemovalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ContractMemberResponse | null>(null);

  const [isRejecting, setIsRejecting] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRefundConfirmOpen, setIsRefundConfirmOpen] = useState(false);
  const [isConfirmingRefund, setIsConfirmingRefund] = useState(false);
  const [removalReason, setRemovalReason] = useState("");

  // --- WITHDRAWABLE BALANCE STATE ---
  const [withdrawableBalance, setWithdrawableBalance] = useState<number>(0);

  // Xác nhận thanh toán Cọc
  const [isDepositPaid, setIsDepositPaid] = useState(false);

  const [changeForm, setChangeForm] = useState<{ type: RequestType, newValue: string, reason: string }>({
    type: 'RENT_INCREASE',
    newValue: '',
    reason: ''
  });

  const LANDLORD_SUGGESTED_TERMS = [
    "Không nuôi thú cưng (chó, mèo...).",
    "Giữ yên tĩnh chung sau 22h00 đêm.",
    "Báo trước 30 ngày trước khi trả phòng.",
    "Bồi thường 100% nếu làm hỏng tài sản phòng.",
    "Chậm tiền nhà quá 5 ngày phạt 5%."
  ];

  const TENANT_SUGGESTED_TERMS = [
    "Yêu cầu dọn vệ sinh phòng trước khi bàn giao.",
    "Cấp thêm 1 chìa khóa cổng/phòng.",
    "Hỗ trợ sửa chữa thiết bị hỏng trước khi dọn vào.",
    "Miễn phí gửi xe cho 1 xe máy.",
    "Xin phép nuôi thú cưng nhỏ (mèo/chuột hamster)."
  ];

  const handleAddTerm = (term: string) => {
    if (changeForm.newValue.includes(term)) {
      toast.info("Điều khoản này đã được thêm rồi!");
      return;
    }
    setChangeForm(prev => ({
      ...prev,
      newValue: prev.newValue
        ? `${prev.newValue}\n- ${term}`
        : `- ${term}`
    }));
  };

  useEffect(() => {
    const envChainId =
      (import.meta.env.VITE_BLOCKCHAIN_CHAIN_ID as string | undefined)?.toLowerCase() || "";
    if (envChainId && envChainId !== runtimeBlockchainConfig.chainIdHex.toLowerCase()) {
      setChainRiskMessage(
        `Mạng blockchain frontend (${envChainId}) khác backend (${runtimeBlockchainConfig.chainIdHex}). Vui lòng đồng bộ cấu hình trước khi ký hoặc thanh toán.`
      );
      return;
    }
    setChainRiskMessage(null);
  }, [runtimeBlockchainConfig.chainIdHex]);

  const ensureWalletNetworkReady = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("Vui lòng cài đặt ví MetaMask để tiếp tục.");
      return false;
    }
    if (chainRiskMessage) return false;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: runtimeBlockchainConfig.chainIdHex }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: runtimeBlockchainConfig.chainIdHex,
              chainName: runtimeBlockchainConfig.chainName,
              nativeCurrency: runtimeBlockchainConfig.nativeCurrency,
              rpcUrls: [runtimeBlockchainConfig.rpcUrl],
              blockExplorerUrls: [runtimeBlockchainConfig.explorerUrl],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }

    const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    if (!isWalletOnExpectedChain(chainIdHex, runtimeBlockchainConfig)) {
      setChainRiskMessage(
        `Ví đang ở mạng ${chainIdHex}. Hệ thống yêu cầu ${runtimeBlockchainConfig.chainName} (${runtimeBlockchainConfig.chainIdHex}).`
      );
      return false;
    }

    setChainRiskMessage(null);
    return true;
  }, [chainRiskMessage, runtimeBlockchainConfig]);

  const fetchContractData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const contractRes = await contractApi.getDetail(Number(id));
      setContract(contractRes.data);

      try {
        const reqRes = await contractApi.getChangeRequests(Number(id));
        setChangeRequests((reqRes as any).data || reqRes);
      } catch (err) {
        console.log("Chưa có đề xuất nào hoặc lỗi tải lịch sử");
      }

      // Parallel fetch Roommate data
      try {
        const [memRes, resReqRes] = await Promise.all([
          residentRequestApi.getMembersByContract(Number(id)),
          residentRequestApi.getRequestsByContract(Number(id))
        ]);
        setMembers((memRes as any).data || memRes);
        setResidentRequests((resReqRes as any).data || resReqRes);
      } catch (err) {
        console.log("Không thể tải thông tin thành viên cùng phòng");
      }


      if (isSilent) toast.success("Dữ liệu hợp đồng đã được cập nhật mới nhất! ✨", { duration: 2000 });
    } catch (error) {
      if (!isSilent) toast.error("Không thể tải thông tin hợp đồng.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // ── Load dữ liệu lần đầu + Lắng nghe sự kiện refresh từ WebSocket
  useEffect(() => {
    if (id) fetchContractData();

    const handleRefresh = (e: any) => {
      console.log("🔄 [Realtime] RECEIVED EVENT in ContractDetailPage:", e.detail);
      fetchContractData(true);
      if (activeTab === 'BILLS') {
        billApi.getBillsByContract(Number(id)).then(res => setBills(res.data));
      }
      
      // Đóng modal thanh toán cọc/bill nếu đang mở (vì tiền đã vào và trạng thái đã cập nhật)
      setIsDepositQrModalOpen(false);
      setIsTraditionalPaymentModalOpen(false);
    };

    window.addEventListener('app:refresh-data', handleRefresh);
    return () => window.removeEventListener('app:refresh-data', handleRefresh);
  }, [id, activeTab, fetchContractData]);

  // ── Auto-poll khi Smart Contract đang deploy (chưa có address) ──
  useEffect(() => {
    if (!contract) return;
    // Chỉ poll nếu: đã ký blockchain + chưa có smartContractAddress
    const needsPoll = contract.signMethod === 'BLOCKCHAIN' && !contract.smartContractAddress;
    if (!needsPoll) return;

    console.log("⏳ [Auto-poll] Smart Contract đang deploy, poll mỗi 10s...");
    const interval = setInterval(() => {
      fetchContractData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [contract?.signMethod, contract?.smartContractAddress, fetchContractData]);

  // ── Fetch Withdrawable Balance from Smart Contract
  useEffect(() => {
    if (!contract?.smartContractAddress || !window.ethereum) return;
    
    const fetchBalance = async () => {
      try {
        const smartContract = await getSmartContract(contract.smartContractAddress as string);
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          const balance = await smartContract.pendingWithdrawals(accounts[0]);
          const ethValue = Number(ethers.formatEther(balance));
          // Convert back to VND based on the current rate
          setWithdrawableBalance(ethValue * config.vndEthRate);
        }
      } catch (err) {
        console.error("Lỗi lấy số dư chờ rút:", err);
      }
    };
    
    fetchBalance();
  }, [contract?.smartContractAddress, config.vndEthRate]);

  // ── POLLING FALLBACK: kiểm tra thay đổi hợp đồng mỗi 10 giây (đề phòng WebSocket không hoạt động)
  const lastDataHash = useRef<string>('');
  useEffect(() => {
    if (!id) return;

    const pollForChanges = async () => {
      try {
        const contractRes = await contractApi.getDetail(Number(id));
        let reqData: any[] = [];
        try {
          const reqRes = await contractApi.getChangeRequests(Number(id));
          reqData = (reqRes as any).data || reqRes;
        } catch { /* no change requests */ }

        // Tạo fingerprint đơn giản từ dữ liệu quan trọng
        const newHash = JSON.stringify({
          status: contractRes.data?.status,
          isTenantSigned: contractRes.data?.isTenantSigned,
          isLandlordSigned: contractRes.data?.isLandlordSigned,
          signMethod: contractRes.data?.signMethod,
          additionalTerms: contractRes.data?.additionalTerms,
          changeCount: reqData.length,
          latestChangeStatus: reqData[0]?.status,
          latestChangeId: reqData[0]?.id,
        });

        if (lastDataHash.current && lastDataHash.current !== newHash) {
          console.log("🔄 [Polling] Detected contract change! Updating UI...");
          setContract(contractRes.data);
          setChangeRequests(reqData);
          toast.success("Dữ liệu hợp đồng đã được cập nhật! ✨", { duration: 2000 });
        }
        lastDataHash.current = newHash;
      } catch { /* silent */ }
    };

    // Chạy 1 lần ngay để thiết lập hash ban đầu
    pollForChanges();
    const interval = setInterval(pollForChanges, 10_000); // Mỗi 10 giây
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    // Nếu hợp đồng đã được cọc thành công qua Polling hoặc WebSockets
    if (contract?.depositStatus === 'DEPOSITED') {
      setIsDepositQrModalOpen(false);
      setIsSignModalOpen(false);
    }
  }, [contract?.depositStatus]);

  useEffect(() => {
    if (activeTab === 'BILLS' && bills.length === 0 && id) {
      const fetchBills = async () => {
        setIsLoadingBills(true);
        try {
          const res = await billApi.getBillsByContract(Number(id));
          setBills(res.data);
        } catch (error) {
          toast.error("Không thể tải lịch sử hóa đơn.");
        } finally {
          setIsLoadingBills(false);
        }
      };
      fetchBills();
    }
  }, [activeTab, id, bills.length]);

  const handleDownloadPDF = () => {
    const element = document.getElementById('contract-pdf-content');
    if (!element) return;

    setIsDownloading(true);
    toast.info("Đang tạo file PDF, vui lòng đợi...");

    const opt: any = {
      margin: 15,
      filename: `HopDong_Phong_${contract?.roomName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsDownloading(false);
      toast.success("Tải bản PDF thành công!");
    }).catch(() => {
      setIsDownloading(false);
      toast.error("Lỗi khi xuất PDF.");
    });
  };
  const handleApproveContract = async () => {
    setIsApproving(true);
    try {
      const result = await contractApi.approveContract(Number(id));
      setContract(result.data);
      toast.success("Đã chọn khách thuê thành công!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi duyệt yêu cầu.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleSignContract = async () => {

    setIsSigning(true);
    try {
      if (contract?.isCompromised) {
        toast.error("Không thể ký hợp đồng đang bị cảnh báo bảo mật!");
        setIsSigning(false);
        return;
      }
      let signature = "";
      if (contract?.signMethod === 'BLOCKCHAIN') {
        if (!window.ethereum) {
          toast.error("Vui lòng cài đặt ví MetaMask để ký Smart Contract!");
          setIsSigning(false);
          return;
        }
        if (chainRiskMessage) {
          toast.error(chainRiskMessage);
          setIsSigning(false);
          return;
        }
        const isNetworkReady = await ensureWalletNetworkReady();
        if (!isNetworkReady) {
          if (chainRiskMessage) toast.error(chainRiskMessage);
          setIsSigning(false);
          return;
        }
        
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const walletAddress = accounts[0];
        
        // KIỂM TRA VÍ TRƯỚC KHI KÝ: Đảm bảo ví đang dùng trên MetaMask khớp với ví đã đăng ký trong hồ sơ
        const registeredWallet = user?.walletAddress || "";
        if (contract?.signMethod === 'BLOCKCHAIN' && registeredWallet && walletAddress.toLowerCase() !== registeredWallet.toLowerCase()) {
          toast.error(`Sai ví! Vui lòng sử dụng ví đã đăng ký (${registeredWallet.substring(0, 6)}...). Bạn đang chọn ${walletAddress.substring(0, 6)}...`);
          setIsSigning(false);
          return;
        }

        toast.info("Vui lòng xác nhận ký hợp đồng trong ví MetaMask...");
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [contract?.contractHash || "", walletAddress],
        });

        if (!signature) {
          throw new Error("Người dùng từ chối ký hợp đồng.");
        }
        toast.success("Đã ký xác nhận bằng ví thành công!");
      }

        // Gọi API ký hợp đồng (Backend sẽ xác minh chữ ký này nếu dùng BLOCKCHAIN)
        const signResult = await contractApi.signContract(Number(id), { 
          signMethod: contract?.signMethod || 'TRADITIONAL',
          signature: signature 
        });

        // Sau khi deploy thành công (Cả 2 bên đã ký) -> Tenant đặt cọc on-chain qua hàm deposit()
        if (signResult.data?.smartContractAddress && user?.role === 'TENANT' && contract?.signMethod === 'BLOCKCHAIN') {
          try {
            toast.info("Smart Contract đã triển khai! Đang đặt cọc on-chain...");
            const smartContract = await getSmartContract(signResult.data.smartContractAddress);
            
            // ĐỌC TRỰC TIẾP TỪ CONTRACT ĐỂ TRÁNH SAI LỆCH LÀM TRÒN
            const depositWeiOnChain = await smartContract.depositAmount();
            
            const tx = await smartContract.deposit({ value: depositWeiOnChain });
            toast.info(`Đang chờ xác nhận đặt cọc... (Hash: ${tx.hash.substring(0, 10)}...)`);
            await tx.wait();
            toast.info("Giao dịch Blockchain thành công! Đang đồng bộ hóa trạng thái hệ thống...");

          // Gọi API xác nhận tiền cọc lên Backend
          await contractApi.confirmWeb3Deposit(Number(id), tx.hash);

          toast.success("Đặt cọc thành công và hợp đồng đã chính thức có hiệu lực!");
        } catch (depositError: any) {
          console.error("Lỗi đặt cọc on-chain:", depositError);
          toast.warning("Hợp đồng đã ký nhưng quá trình nạp cọc bị gián đoạn. Bạn có thể nạp lại ở trang quản lý.");
        }
      }

      toast.success("Ký hợp đồng thành công!");
      setIsSignModalOpen(false);
      fetchContractData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.reason || error.message || "Lỗi khi ký hợp đồng.";
      toast.error(errorMsg);
    } finally {
      setIsSigning(false);
    }
  };

  const handleRejectContract = async () => {
    if (!contract || !rejectionReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối!");
      return;
    }
    
    setIsRejecting(true);
    try {
      await contractApi.rejectContract(contract.id, rejectionReason.trim());
      toast.success("Đã từ chối yêu cầu và giải phóng phòng thành công!");
      setIsRejectModalOpen(false);
      navigate("/contracts/mine"); 
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lỗi khi từ chối hợp đồng!");
    } finally {
      setIsRejecting(false);
    }
  };

  const handlePayWeb3 = async (bill: any) => {
    if (contract?.isCompromised) {
      toast.error("Không thể thanh toán hợp đồng đang bị cảnh báo bảo mật!");
      return;
    }
    if (!window.ethereum) {
      toast.error("Vui lòng cài đặt ví MetaMask để thanh toán!");
      return;
    }
    if (!contract?.smartContractAddress) {
      toast.error("Hợp đồng này chưa được triển khai trên Blockchain.");
      return;
    }
    setIsPaying(true);
    try {
      if (chainRiskMessage) {
        toast.error(chainRiskMessage);
        return;
      }
      const isNetworkReady = await ensureWalletNetworkReady();
      if (!isNetworkReady) {
        if (chainRiskMessage) toast.error(chainRiskMessage);
        return;
      }

      // Kết nối MetaMask
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Quy đổi VND sang ETH rồi convert ra WEI (Dùng tỷ giá cấu hình từ SystemConfig)
      const ethAmount = (bill.totalAmount / config.vndEthRate).toFixed(18);
      const billAmountOnChain = ethers.parseEther(ethAmount);

      // Đồng bộ hóa đơn lên Blockchain (nếu chưa có trên chain)
      try {
        toast.info("Đang đồng bộ hóa đơn lên Blockchain...");
        await billApi.syncToBlockchain(bill.id);
      } catch (syncError: any) {
        // Nếu bill đã tồn tại trên chain → bỏ qua lỗi "Exists" / "Already registered"
        const syncMsg = syncError.response?.data?.message || syncError.message || "";
        if (!syncMsg.includes("Exists") && !syncMsg.includes("Already") && !syncMsg.includes("already")) {
          console.warn("Sync warning:", syncMsg);
        }
      }

      toast.info("Đang gọi Smart Contract...");

      // Kết nối Smart Contract và gọi hàm payExternalBill
      // Hàm này: Nhận tiền -> Chuyển thẳng cho chủ trọ -> Ghi log on-chain
      const smartContract = await getSmartContract(contract.smartContractAddress);
      const tx = await smartContract.payExternalBill(bill.id, { value: billAmountOnChain });

      toast.info(`Giao dịch đã gửi! Đang chờ xác nhận... (Hash: ${tx.hash.substring(0, 10)}...)`);

      // Chờ blockchain xác nhận
      const receipt = await tx.wait();
      const txHash = receipt.hash;

      toast.info("Giao dịch đã được xác nhận trên Blockchain. Đang cập nhật hệ thống...");

      // Cập nhật trạng thái ở Backend
      await billApi.confirmWeb3Payment(bill.id, txHash);

      toast.success("Thanh toán thành công! Tiền đã chuyển vào ví chủ trọ.");

      // Refresh danh sách hóa đơn
      const res = await billApi.getBillsByContract(Number(id));
      setBills(res.data);

    } catch (error: any) {
      const reason = error.reason || error.message || "Thanh toán bị hủy hoặc thất bại.";
      if (reason.includes("da duoc thanh toan")) {
        toast.error("Hóa đơn này đã được thanh toán trên Blockchain!");
      } else {
        toast.error(reason);
      }
    } finally {
      setIsPaying(false);
    }
  };

  const [isConfirmingDeposit, setIsConfirmingDeposit] = useState(false);

  const handleConfirmWeb3Deposit = async () => {
    if (!contract?.smartContractAddress) {
      toast.info("Smart Contract đang được triển khai trên Blockchain. Trang sẽ tự động cập nhật khi hoàn tất, bạn không cần tải lại trang.");
      return;
    }
    if (!window.ethereum) {
      toast.error("Vui lòng cài đặt ví MetaMask!");
      return;
    }
    if (chainRiskMessage) {
      toast.error(chainRiskMessage);
      return;
    }
    const isNetworkReady = await ensureWalletNetworkReady();
    if (!isNetworkReady) {
      if (chainRiskMessage) toast.error(chainRiskMessage);
      return;
    }
    setIsConfirmingDeposit(true);
    try {
      toast.info("Đang bật MetaMask để nạp cọc...");
      const smartContract = await getSmartContract(contract.smartContractAddress);
      
      // ĐỌC TRỰC TIẾP TỪ CONTRACT ĐỂ TRÁNH SAI LỆCH LÀM TRÒN
      const depositWeiOnChain = await smartContract.depositAmount();

      const tx = await smartContract.deposit({ value: depositWeiOnChain });
      toast.info("Đang chờ xác nhận giao dịch...");
      await tx.wait();

      await contractApi.confirmWeb3Deposit(Number(id), tx.hash);
      toast.success("Kích hoạt hợp đồng thành công!");
      fetchContractData();
    } catch (error: any) {
      toast.error(error.reason || error.message || "Không thể thực hiện nạp cọc.");
    } finally {
      setIsConfirmingDeposit(false);
    }
  };

  const handleOpenDepositQrModal = async () => {
    if (contract?.isCompromised) {
      toast.error("Không thể nạp cọc hợp đồng đang bị cảnh báo bảo mật!");
      return;
    }
    setIsLoadingQr(true);
    setIsDepositQrModalOpen(true);
    try {
      const res = await paymentApi.getContractQrCode(Number(id));
      setDepositQrData(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể tạo mã QR lúc này.");
      setIsDepositQrModalOpen(false);
    } finally {
      setIsLoadingQr(false);
    }
  };


  const [billQrData, setBillQrData] = useState<any>(null);

  const openTraditionalPaymentModal = async (bill: any) => {
    if (contract?.isCompromised) {
      toast.error("Không thể thanh toán hợp đồng đang bị cảnh báo bảo mật!");
      return;
    }
    setSelectedBillToPay(bill);
    setIsTraditionalPaymentModalOpen(true);
    setBillQrData(null);
    try {
      const res = await paymentApi.getBillQrCode(bill.id);
      setBillQrData(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể tạo mã QR lúc này.");
    }
  };

  const handleNotifyTraditionalPayment = async () => {
    if (!selectedBillToPay) return;
    setIsNotifyingPayment(true);
    try {
      await billApi.tenantNotifyPayment(selectedBillToPay.id);
      toast.success("Đã thông báo thanh toán cho Chủ trọ!");
      setBills(bills.map(b => b.id === selectedBillToPay.id ? { ...b, status: 'PENDING' } : b));
      setIsTraditionalPaymentModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi giao dịch, thử lại sau!");
    } finally {
      setIsNotifyingPayment(false);
    }
  };

  const handleConfirmDepositRefund = async () => {
    if (!contract) return;
    setIsConfirmingRefund(true);
    try {
      const res = await contractApi.confirmDepositRefund(contract.id);
      setContract((prev) => prev ? { ...prev, depositStatus: (res as any).depositStatus || 'REFUNDED' } : prev);
      toast.success('Đã xác nhận hoàn cọc thành công!');
      setIsRefundConfirmOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra!');
    } finally {
      setIsConfirmingRefund(false);
    }
  };

  const handleSubmitChangeRequest = async () => {
    if (!changeForm.newValue || !changeForm.reason) {
      toast.warning("Vui lòng nhập đầy đủ giá trị mới và lý do!");
      return;
    }
    setIsSubmittingRequest(true);
    try {
      await contractApi.requestChange(Number(id), changeForm);
      toast.success("Đã gửi yêu cầu chỉnh sửa!");
      setIsRequestModalOpen(false);
      setChangeForm({ type: 'RENT_INCREASE', newValue: '', reason: '' });
      fetchContractData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi gửi yêu cầu.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleApproveRequest = async (reqId: number) => {
    setIsApprovingRequest(reqId);
    try {
      await contractApi.approveChangeRequest(reqId);
      toast.success("Đã phê duyệt yêu cầu. Hợp đồng đã được cập nhật!");
      fetchContractData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi phê duyệt.");
    } finally {
      setIsApprovingRequest(null);
    }
  };

  const handleRejectRequest = async (reqId: number) => {
    try {
      await contractApi.rejectChangeRequest(reqId);
      toast.success("Đã từ chối yêu cầu.");
      fetchContractData();
    } catch (error: any) {
      toast.error("Lỗi khi từ chối.");
    }
  };
  const handleCounterPropose = async (req: ContractChangeRequest) => {
    try {
      await contractApi.rejectChangeRequest(req.id);
      setChangeForm({
        type: req.type,
        newValue: req.newValue,
        reason: "Tôi đồng ý một phần, xin đề xuất lại như sau..."
      });
      setIsRequestModalOpen(true);
      fetchContractData();
    } catch (error) {
      toast.error("Lỗi khi tạo thương lượng mới.");
    }
  };

  const handleUpdateResidentStatus = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    setIsUpdatingResident(true);
    try {
      await residentRequestApi.updateStatus(requestId, status);
      toast.success(status === 'APPROVED' ? "Đã phê duyệt thành công!" : "Đã từ chối yêu cầu.");
      fetchContractData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi xử lý yêu cầu");
    } finally {
      setIsUpdatingResident(false);
    }
  };

  // --- SETTLEMENT HANDLERS ---
  const handleProposeSettlement = async () => {
    if (!contract || !contract.smartContractAddress) return;
    if (settleForm.deductionAmount < 0) {
      toast.error("Số tiền khấu trừ không hợp lệ!");
      return;
    }
    
    setIsSubmittingSettle(true);
    try {
      // 1. Propose on-chain
      toast.info("Đang gửi đề xuất lên Blockchain...");
      await web3ProposeDeduction(
        contract.smartContractAddress, 
        settleForm.deductionAmount.toString(), 
        settleForm.earlyTermination
      );
      
      // 2. Sync with Backend
      await contractApi.proposeSettlement(Number(id), settleForm);
      
      toast.success("Đã gửi đề xuất quyết toán thành công!");
      setIsSettleModalOpen(false);
      fetchContractData(true);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi đề xuất quyết toán");
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const handleConsentSettlement = async () => {
    if (!contract || !contract.smartContractAddress) return;
    setIsConsenting(true);
    try {
      toast.info("Đang xác nhận đồng thuận lên Blockchain...");
      await web3ConsentEndContract(contract.smartContractAddress);
      
      await contractApi.consentSettlement(Number(id));
      
      toast.success("Bạn đã đồng ý quyết toán thành công!");
      fetchContractData(true);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi đồng ý quyết toán");
    } finally {
      setIsConsenting(false);
    }
  };

  const handleExecuteSettlement = async () => {
    if (!contract || !contract.smartContractAddress) return;
    setIsExecuting(true);
    try {
      toast.info("Đang thực thi kết thúc hợp đồng trên Blockchain...");
      await web3ExecuteEndContract(contract.smartContractAddress);
      
      await contractApi.executeSettlement(Number(id));
      
      toast.success("Hợp đồng đã được kết thúc thành công! Tiền cọc đã được giải ngân.");
      fetchContractData(true);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi thực thi kết thúc");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleWithdrawFunds = async () => {
    if (!contract || !contract.smartContractAddress) return;
    
    // Check balance first to avoid confusing blockchain revert errors
    if (withdrawableBalance <= 0) {
      toast.info("Hiện tại chưa có khoản tiền nào chờ rút. Số dư sẽ cập nhật sau khi hợp đồng được quyết toán hoàn tất.");
      return;
    }
    
    setIsWithdrawing(true);
    try {
      toast.info("Đang thực hiện rút tiền từ Smart Contract về ví...");
      await web3WithdrawFunds(contract.smartContractAddress);
      toast.success("Rút tiền thành công! Vui lòng kiểm tra ví MetaMask của bạn.");
      setWithdrawableBalance(0);
    } catch (err: any) {
      const reason = err.reason || err.message || "";
      if (reason.includes("Nothing")) {
        toast.info("Chưa có khoản tiền nào chờ rút trong Smart Contract. Số dư sẽ cập nhật sau khi quyết toán hoàn tất trên Blockchain.");
      } else {
        toast.error(reason || "Lỗi khi rút tiền");
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleAnalyzeTerms = async () => {
    if (!contract?.additionalTerms) {
      toast.error("Không có điều khoản bổ sung để phân tích.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      // Vì controller sẽ báo lỗi 429 nếu hết quota, ta bọc ở đây hoặc API Axios đã xử lý toast.error
      const res = await contractApi.analyzeTerms(Number(id), { terms: contract.additionalTerms });
      setAnalysisResult(res.data.result);
      toast.success("AI đã phân tích xong hợp đồng.");
    } catch (error: any) {
      if (error.response?.status === 429) {
        toast.error("AI đang hết lượt phản hồi hoặc quá tải, vui lòng quay lại sau ít phút!");
      } else {
        toast.error("AI không thể phân tích lúc này.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };



  const handleRequestRemoval = async (member: ContractMemberResponse) => {
    setSelectedMember(member);
    setRemovalReason("");
    setIsRemovalOpen(true);
  };

  const confirmRemoval = async () => {
    if (!selectedMember || !contract) return;

    setIsUpdatingResident(true);
    try {
      await residentRequestApi.requestRemoval({
        contractId: Number(id),
        userId: selectedMember.userId,
        message: removalReason || "Yêu cầu xóa thành viên"
      });
      toast.success(`Đã gửi yêu cầu xóa ${selectedMember.fullName} đến Chủ trọ!`);
      setIsRemovalOpen(false);
      fetchContractData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi gửi yêu cầu xóa.");
    } finally {
      setIsUpdatingResident(false);
    }
  };

  const handleAnalyzeChangeRequest = async (req: ContractChangeRequest) => {
    setIsAnalyzingRequest(true);
    setRequestAnalysisResult(null);
    try {
      const prompt = `So sánh và đánh giá rủi ro của đề xuất từ đối tác:\n\n- NỘI DUNG GỐC: \n${req.oldValue || 'Trống'}\n\n- NỘI DUNG ĐỀ XUẤT MỚI: \n${req.newValue}\n\n- LÝ DO ĐỀ XUẤT: ${req.reason}\n\nĐề xuất này thay đổi thế nào? Có gài rủi ro bất lợi nào cho người tiếp nhận so với bản gốc không? Đừng nhận xét chung chung, hãy đi thẳng vào sự thay đổi. Trả lời dưới 150 chữ.`;
      const res = await contractApi.analyzeTerms(Number(id), { terms: prompt });
      setRequestAnalysisResult(res.data.result);
      toast.success("AI đã đánh giá xong đề xuất.");
    } catch (error: any) {
      if (error.response?.status === 429) {
        toast.error("AI đang quá tải (Rate limit), vui lòng chờ chút xíu!");
      } else {
        toast.error("Lỗi khi kết nối tới trợ lý AI.");
      }
    } finally {
      setIsAnalyzingRequest(false);
    }
  };

  const renderMarkdown = (text: string) => {
    let html = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/\n/g, '<br/>');
    return { __html: html };
  };

  type AttentionItem = {
    id: string;
    tone: AttentionTone;
    title: string;
    description?: string;
    icon: LucideIcon;
  };

  const contractOperational = useMemo(() => {
    if (!contract) {
      return {
        attention: [] as AttentionItem[],
        summaryItems: [] as SummaryStripItem[],
        timelineEvents: [] as OperationalTimelineEvent[],
        sortedBills: [] as typeof bills,
      };
    }

    const now = Date.now();
    let overdueCount = 0;
    let overdueAmount = 0;
    let unpaidNotOverdue = 0;
    const upcomingUnpaid: { bill: (typeof bills)[number]; t: number }[] = [];

    for (const b of bills) {
      const dl = new Date(b.deadline).getTime();
      const overdue = b.status !== "PAID" && (b.status === "LATE" || dl < now);
      if (overdue) {
        overdueCount += 1;
        overdueAmount += Number(b.totalAmount || 0);
      } else if (b.status !== "PAID") {
        unpaidNotOverdue += 1;
        upcomingUnpaid.push({ bill: b, t: dl });
      }
    }
    upcomingUnpaid.sort((a, b) => a.t - b.t);
    const nextUnpaid = upcomingUnpaid[0];

    const daysToEnd = contract.endDate
      ? Math.ceil((new Date(contract.endDate).getTime() - now) / 86400000)
      : null;

    const pendingResident = residentRequests.filter((r) => r.status === "PENDING").length;

    const sortedBills = [...bills].sort((a, b) => {
      const rank = (x: (typeof bills)[number]) => {
        if (x.status === "PAID") return 2_000_000_000_000 + new Date(x.deadline).getTime();
        const d = new Date(x.deadline).getTime();
        if (x.status === "LATE" || d < now) return d;
        return 1_000_000_000_000 + d;
      };
      return rank(a) - rank(b);
    });

    const timelineEvents: OperationalTimelineEvent[] = [];
    if (contract.startDate) {
      timelineEvents.push({
        id: "mile-start",
        at: contract.startDate,
        title: "Ngày bắt đầu hiệu lực",
        tone: "muted",
      });
    }
    if (contract.endDate) {
      timelineEvents.push({
        id: "mile-end",
        at: contract.endDate,
        title: "Ngày kết thúc theo hợp đồng",
        tone:
          daysToEnd !== null && daysToEnd <= 0 ? "danger" : daysToEnd !== null && daysToEnd <= 30 ? "warning" : "muted",
      });
    }
    if (contract.signDate) {
      timelineEvents.push({
        id: "mile-sign",
        at: contract.signDate,
        title: "Ngày ký hợp đồng",
        tone: "success",
      });
    }
    for (const cr of changeRequests) {
      timelineEvents.push({
        id: `cr-${cr.id}`,
        at: cr.requestDate,
        title: `${CHANGE_TYPE_LABELS[cr.type] || cr.type} · ${REQUEST_STATUS_SHORT[cr.status] || cr.status}`,
        detail: cr.reason?.slice(0, 140),
        tone: cr.status === "REJECTED" ? "danger" : cr.status === "PENDING" ? "warning" : "success",
      });
    }

    const attention: AttentionItem[] = [];

    const needMySign =
      contract.status === "PENDING_SIGNATURE" &&
      user &&
      ((user.role === "TENANT" && !contract.isTenantSigned) || (user.role === "LANDLORD" && !contract.isLandlordSigned));
    if (needMySign) {
      attention.push({
        id: "sign-me",
        tone: "warning",
        title: "Cần chữ ký của bạn",
        description: "Hoàn tất ký để chuyển các bước cọc / hiệu lực theo quy trình.",
        icon: PenTool,
      });
    }

    if (
      user?.role === "TENANT" &&
      contract.depositStatus !== "DEPOSITED" &&
      contract.isTenantSigned &&
      contract.isLandlordSigned &&
      !["EXPIRED", "CANCELLED", "TERMINATED_EARLY"].includes(contract.status)
    ) {
      attention.push({
        id: "dep",
        tone: "warning",
        title: "Tiền cọc chưa hoàn tất",
        description: `Số tiền cọc ${Number(contract.depositAmount || 0).toLocaleString("vi-VN")} đ — nạp sớm để kích hoạt hiệu lực.`,
        icon: Banknote,
      });
    }

    if (user?.role === "TENANT" && overdueCount > 0) {
      attention.push({
        id: "bill-late-tenant",
        tone: "danger",
        title: `${overdueCount} hóa đơn quá hạn`,
        description: "Ưu tiên thanh toán trong tab Hóa đơn để tránh tranh chấp hoặc phạt.",
        icon: AlertTriangle,
      });
    }

    if (user?.role === "LANDLORD" && overdueCount > 0) {
      attention.push({
        id: "bill-late-landlord",
        tone: "warning",
        title: `${overdueCount} kỳ chưa thanh toán đúng hạn`,
        description: overdueAmount
          ? `Tổng dư nợ hiển thị khoảng ${overdueAmount.toLocaleString("vi-VN")} đ — xem tab Hóa đơn.`
          : "Kiểm tra tab Hóa đơn và liên hệ khách nếu cần.",
        icon: Receipt,
      });
    }

    if (contract.status === "ACTIVE" && daysToEnd !== null && daysToEnd > 0 && daysToEnd <= 30) {
      attention.push({
        id: "exp",
        tone: daysToEnd <= 14 ? "warning" : "info",
        title: "Hợp đồng sắp kết thúc",
        description: `Còn khoảng ${daysToEnd} ngày đến ${new Date(contract.endDate!).toLocaleDateString("vi-VN")}.`,
        icon: Calendar,
      });
    }

    if (user?.role === "LANDLORD" && pendingResident > 0) {
      attention.push({
        id: "resident",
        tone: "info",
        title: `${pendingResident} yêu cầu thành viên phòng`,
        description: "Duyệt hoặc từ chối để giữ danh sách cư trú minh bạch.",
        icon: UserPlus,
      });
    }

    const summaryItems: SummaryStripItem[] = [
      {
        id: "status",
        label: "Trạng thái",
        value: CONTRACT_STATUS_LABEL[contract.status] || contract.status,
        subline: contract.signMethod === "BLOCKCHAIN" ? "On-chain" : "Ký điện tử",
      },
      {
        id: "rent",
        label: "Giá thuê",
        value: `${Number(contract.actualPrice || 0).toLocaleString("vi-VN")} đ`,
        subline: "Mỗi tháng",
      },
      {
        id: "deposit",
        label: "Cọc",
        value: contract.depositStatus === "DEPOSITED" ? "Đã nạp" : "Chưa nạp",
        tone: contract.depositStatus === "DEPOSITED" ? "success" : "warning",
      },
      {
        id: "pay-health",
        label: "Thanh toán",
        value:
          overdueCount > 0
            ? `${overdueCount} quá hạn`
            : unpaidNotOverdue > 0
              ? `${unpaidNotOverdue} chờ thanh toán`
              : bills.length
                ? "Không có quá hạn"
                : "—",
        subline: nextUnpaid
          ? `Hạn gần nhất: ${new Date(nextUnpaid.bill.deadline).toLocaleDateString("vi-VN")}`
          : undefined,
        tone: overdueCount > 0 ? "danger" : unpaidNotOverdue > 0 ? "warning" : bills.length ? "success" : "muted",
      },
      {
        id: "trust",
        label: "Trust layer",
        value: contract.smartContractAddress ? "Smart contract" : "Không neo chain",
        subline: contract.contractHash ? "Đã có hash" : contract.signMethod === "BLOCKCHAIN" ? "Theo dõi xác minh" : "",
        tone: contract.smartContractAddress ? "success" : "muted",
      },
    ];

    return {
      attention: attention.slice(0, 4),
      summaryItems,
      timelineEvents,
      sortedBills,
    };
  }, [contract, bills, changeRequests, residentRequests, user]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-8 w-64 max-w-full rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-11 w-full max-w-md rounded-xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl md:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (!contract) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState icon={FileText} title="Không tìm thấy hợp đồng" description="Mã hợp đồng không tồn tại hoặc bạn không có quyền xem." />
      </div>
    );
  }

  const pendingRequest = changeRequests.find(req => req.status === 'PENDING');

  // ✅ KIỂM TRA TRẠNG THÁI KÝ
  const isMeSigned = user?.role === 'TENANT' ? contract.isTenantSigned : contract.isLandlordSigned;
  const isPartnerSigned = user?.role === 'TENANT' ? contract.isLandlordSigned : contract.isTenantSigned;
  const bothSigned = contract.isTenantSigned && contract.isLandlordSigned;

  const timelineSteps = [
    {
      key: 'SIGN',
      label: 'Ký hợp đồng',
      done: bothSigned || ['AWAITING_DEPOSIT', 'ACTIVE', 'EXPIRED', 'TERMINATED_EARLY'].includes(contract.status),
    },
    {
      key: 'DEPOSIT',
      label: 'Nạp cọc',
      done: contract.depositStatus === 'DEPOSITED' || ['ACTIVE', 'EXPIRED', 'TERMINATED_EARLY'].includes(contract.status),
    },
    {
      key: 'ACTIVE',
      label: 'Hiệu lực',
      done: ['ACTIVE', 'EXPIRED', 'TERMINATED_EARLY'].includes(contract.status),
    },
    {
      key: 'BILLS',
      label: 'Hóa đơn',
      done: (bills?.length || 0) > 0 || ['ACTIVE', 'EXPIRED', 'TERMINATED_EARLY'].includes(contract.status),
    },
  ];

  const durationMonths = contract.endDate
    ? (new Date(contract.endDate).getFullYear() - new Date(contract.startDate).getFullYear()) * 12 + (new Date(contract.endDate).getMonth() - new Date(contract.startDate).getMonth())
    : '...';

  const contractTabItems: SegmentItem[] = [
    { id: 'INFO', label: 'Thông tin & hợp đồng' },
    { id: 'BILLS', label: user?.role === 'LANDLORD' ? 'Hóa đơn' : 'Hóa đơn & thanh toán' },
  ];

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6 overflow-x-hidden px-3 py-4 sm:px-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="shrink-0 rounded-full" aria-label="Quay lại">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          className="mb-0 min-w-0 flex-1 border-0 pb-0"
          title="Không gian làm việc hợp đồng"
          description={
            [ `#${contract.id}`, contract.roomName || 'Phòng', contract.propertyAddress ].filter(Boolean).join(' · ')
          }
        />
      </div>

      {contract.isCompromised && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3 animate-in fade-in">
          <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-600" />
          <div>
            <h3 className="font-bold">⚠️ CẢNH BÁO BẢO MẬT</h3>
            <p className="text-sm mt-1">Hợp đồng này bị phát hiện sai lệch dữ liệu so với gốc trên Blockchain. Vui lòng ngưng mọi giao dịch và liên hệ Admin ngay lập tức.</p>
          </div>
        </div>
      )}

      {chainRiskMessage && (
        <RiskNotice
          description={chainRiskMessage}
          onRetry={() => {
            setChainRiskMessage(null);
            fetchContractData(true);
          }}
        />
      )}

      {contractOperational.attention.length > 0 ? (
        <div className="space-y-2">
          {contractOperational.attention.map((a) => (
            <AttentionBanner key={a.id} tone={a.tone} title={a.title} description={a.description} icon={a.icon} />
          ))}
        </div>
      ) : null}

      <StatusSummaryStrip items={contractOperational.summaryItems} />

      <div className="grid gap-4 lg:grid-cols-2">
        <OperationalTimeline
          events={contractOperational.timelineEvents}
          description="Mốc hợp đồng và đề xuất thay đổi — mới nhất ở trên."
        />
        <div className="section-card p-4 md:p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tiến độ quy trình</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {timelineSteps.map((step, index) => {
              const nextDone = timelineSteps[index + 1]?.done;
              return (
                <div key={step.key} className="relative rounded-xl border border-border/60 bg-background px-2.5 py-2.5 sm:px-3 sm:py-3">
                  {index < timelineSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-6 -right-1.5 w-3 h-[2px]">
                      <div className={cn("h-full w-full rounded-full", nextDone || step.done ? "bg-emerald-400/80" : "bg-border")} />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                        step.done
                          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                          : "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {step.done ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-xs font-semibold", step.done ? "text-foreground" : "text-muted-foreground")}>{step.label}</p>
                      <p className={cn("text-[11px]", step.done ? "text-emerald-800" : "text-muted-foreground")}>
                        {step.done ? "Hoàn thành" : "Đang chờ"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SegmentedControl
        aria-label="Khu vực hợp đồng"
        items={contractTabItems}
        value={activeTab}
        onChange={(id) => setActiveTab(id as 'INFO' | 'BILLS')}
        className="w-full sm:w-auto"
      />

      {activeTab === 'INFO' && (
        <div className="grid md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="md:col-span-2 space-y-6">

            {/* QUYẾT TOÁN ON-CHAIN - VỊ TRÍ MỚI (TOP) */}
            {contract.smartContractAddress && 
             contract.status !== 'PENDING_SIGNATURE' && 
             contract.status !== 'AWAITING_DEPOSIT' && 
             contract.status !== 'CANCELLED' && (
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-md mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="text-xl font-black text-indigo-900 mb-4 flex items-center gap-2">
                  <LogOut className="h-6 w-6 text-indigo-600" /> Quyết toán & Trả phòng (Web3)
                </h3>
                {(contract.status === 'ACTIVE' || ((contract.status === 'TERMINATED_EARLY' || contract.status === 'EXPIRED') && withdrawableBalance <= 0)) ? (
                  <div className="space-y-4">
                    {/* Info banner for early termination that needs on-chain settlement */}
                    {(contract.status === 'TERMINATED_EARLY' || contract.status === 'EXPIRED') && (
                      <div className="relative overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-md">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />
                        <div className="flex items-start gap-3 mt-1">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
                            <AlertTriangle className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-900">Cần quyết toán trên Blockchain</p>
                            <p className="mt-1 text-xs leading-relaxed text-amber-700">
                              Hợp đồng đã được chấm dứt trên hệ thống, nhưng tiền cọc vẫn nằm trong Smart Contract.
                              Vui lòng hoàn tất quy trình quyết toán bên dưới để rút tiền về ví.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {contract.isProposalActive ? (
                      <div className="bg-white rounded-xl p-5 border border-indigo-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Số tiền đề xuất khấu trừ</p>
                              <p className="text-2xl font-black text-rose-600">{contract.currentDeductionAmount ? Math.round((contract.currentDeductionAmount / 1e18) * config.vndEthRate).toLocaleString() : 0}đ</p>
                           </div>
                           <StatusBadge label={contract.isEarlyTerminationProposal ? 'Kết thúc sớm' : 'Đúng hạn'} tone="warning" className="px-3 py-1" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-5">
                           <div className={cn("p-3 rounded-xl text-center border-2", contract.hasLandlordConsented ? "bg-green-50 border-green-200 text-green-700 shadow-inner" : "bg-muted/40 border-gray-100 text-gray-400")}>
                              <p className="text-[10px] font-bold uppercase mb-1">Chủ trọ</p>
                              <p className="text-sm font-black flex items-center justify-center gap-1">
                                {contract.hasLandlordConsented ? <><CheckCircle2 className="w-4 h-4"/> Đã ký</> : '⏳ Đang chờ'}
                              </p>
                           </div>
                           <div className={cn("p-3 rounded-xl text-center border-2", contract.hasTenantConsented ? "bg-green-50 border-green-200 text-green-700 shadow-inner" : "bg-muted/40 border-gray-100 text-gray-400")}>
                              <p className="text-[10px] font-bold uppercase mb-1">Khách thuê</p>
                              <p className="text-sm font-black flex items-center justify-center gap-1">
                                {contract.hasTenantConsented ? <><CheckCircle2 className="w-4 h-4"/> Đã ký</> : '⏳ Đang chờ'}
                              </p>
                           </div>
                        </div>

                        {user?.role === 'TENANT' && !contract.hasTenantConsented && (
                          <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg shadow-lg shadow-green-200" onClick={handleConsentSettlement} isLoading={isConsenting}>
                            ✍️ Tôi đồng ý Quyết toán này
                          </Button>
                        )}

                        {contract.hasLandlordConsented && contract.hasTenantConsented && (
                          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg shadow-lg shadow-indigo-200" onClick={handleExecuteSettlement} isLoading={isExecuting}>
                            🚀 Thực thi Kết thúc Hợp đồng
                          </Button>
                        )}
                      </div>
                    ) : (
                      user?.role === 'LANDLORD' && (
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg shadow-lg shadow-indigo-200 transition-transform hover:scale-[1.02]" onClick={() => {
                          navigate(`${prefix}/contracts/${contract.id}/settle`);
                        }}>
                          💸 Bắt đầu Quyết toán & Trả phòng (Flow mới)
                        </Button>
                      )
                    )}
                    {user?.role === 'TENANT' && !contract.isProposalActive && (
                      <div className="bg-indigo-100/50 p-4 rounded-xl border border-indigo-100 text-center">
                         <p className="text-sm text-indigo-800 font-medium flex items-center justify-center gap-2">
                           <Clock className="w-4 h-4 animate-spin-slow" /> Đang chờ Chủ trọ đề xuất quyết toán tiền cọc...
                         </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-5 bg-green-50 border-2 border-green-200 rounded-xl shadow-inner">
                      <p className="text-sm text-green-800 font-bold flex items-center gap-2">
                         <CheckCircle className="w-5 h-5 text-green-600" /> Hợp đồng đã kết thúc an toàn trên Blockchain.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50 h-12 text-lg font-bold shadow-sm" onClick={handleWithdrawFunds} isLoading={isWithdrawing}>
                      💰 Rút tiền từ Contract về ví MetaMask
                    </Button>
                  </div>
                )}
              </div>
            )}

            {pendingRequest && (
              <div className="bg-white border-2 border-orange-200 rounded-2xl overflow-hidden shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-orange-100 bg-orange-50 px-4 py-3 sm:items-center sm:px-5">
                   <div className="flex min-w-0 items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">
                         <PenTool className="w-4 h-4 text-orange-700" />
                      </div>
                      <h4 className="font-bold text-orange-900">Đề xuất thay đổi đang chờ</h4>
                   </div>
                   <StatusBadge label="Cần xử lý" tone="warning" className="animate-pulse" />
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="flex gap-4">
                       <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loại thay đổi</p>
                                <p className="text-sm font-black text-gray-700">{pendingRequest.type}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Người đề xuất</p>
                                <p className="text-sm font-black text-primary">{pendingRequest.requestedByRole === 'LANDLORD' ? 'Chủ trọ' : 'Khách thuê'}</p>
                             </div>
                          </div>
                          
                          <div className="bg-muted/40 p-3 rounded-xl border border-gray-100">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lý do đưa ra</p>
                             <p className="text-sm italic text-gray-600 leading-relaxed">“{pendingRequest.reason}”</p>
                          </div>
                       </div>
                       
                       {user?.role !== pendingRequest.requestedByRole && (
                          <div className="shrink-0 flex flex-col justify-center border-l pl-4">
                             <Button
                                size="sm"
                                className="bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-200 border-none h-auto py-3 px-4 flex-col gap-1 rounded-xl"
                                onClick={() => handleAnalyzeChangeRequest(pendingRequest)}
                                isLoading={isAnalyzingRequest}
                             >
                                <Sparkles className="w-5 h-5" />
                                <span className="text-[10px] font-bold">AI PHÂN TÍCH</span>
                             </Button>
                          </div>
                       )}
                    </div>

                    {requestAnalysisResult && (
                      <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                           <Bot className="h-4 w-4 text-purple-600" />
                           <h4 className="text-xs font-bold text-purple-800 uppercase tracking-widest">Nhận định từ AI Advisor</h4>
                        </div>
                        <div
                          className="text-sm text-purple-900 leading-relaxed"
                          dangerouslySetInnerHTML={renderMarkdown(requestAnalysisResult)}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <div className="flex items-center gap-2 mb-2">
                           <XCircle className="w-3 h-3 text-rose-400" />
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Giá trị cũ</span>
                        </div>
                        <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/30 line-through text-gray-400 text-sm whitespace-pre-wrap min-h-[60px]">
                           {pendingRequest.oldValue || "Chưa có nội dung"}
                        </div>
                      </div>
                      
                      <div className="group">
                        <div className="flex items-center gap-2 mb-2">
                           <CheckCircle2 className="w-3 h-3 text-green-500" />
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Giá trị đề xuất</span>
                        </div>
                        <div className="p-3 rounded-xl border-2 border-green-200 bg-green-50/20 text-green-900 font-bold text-sm whitespace-pre-wrap min-h-[60px] shadow-sm ring-4 ring-green-500/5">
                           {pendingRequest.newValue}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      {user?.role !== pendingRequest.requestedByRole ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRejectRequest(pendingRequest.id)} 
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold"
                            disabled={isApprovingRequest !== null}
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Từ chối
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCounterPropose(pendingRequest)} 
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold"
                            disabled={isApprovingRequest !== null}
                          >
                            <PenTool className="w-4 h-4 mr-2" /> Đề xuất lại
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveRequest(pendingRequest.id)} 
                            className="bg-green-600 hover:bg-green-700 shadow-md shadow-green-100 font-bold px-6"
                            isLoading={isApprovingRequest === pendingRequest.id}
                            disabled={isApprovingRequest !== null}
                          >
                            <Check className="w-4 h-4 mr-2" /> Chấp nhận & Cập nhật
                          </Button>
                        </>
                      ) : (
                        <div className="w-full bg-orange-100/50 p-2 text-center rounded-lg border border-orange-200">
                           <p className="text-[11px] text-orange-700 font-bold flex items-center justify-center gap-2">
                              <Clock className="w-3 h-3 animate-spin duration-1000" />
                              Yêu cầu của bạn đang chờ phản hồi từ đối tác...
                           </p>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Thông tin cơ bản
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Khu trọ / Địa chỉ</p>
                  <p className="font-semibold flex items-start gap-1">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                    {contract.propertyAddress || "Đang cập nhật..."}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Thời hạn thuê</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {contract.startDate} - {contract.endDate || "Chưa xác định"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Người thuê</p>
                  <p className="font-semibold">{contract.tenantName || "Đang cập nhật..."}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Đại diện cho thuê</p>
                  <p className="font-semibold">{contract.landlordName || "Đang cập nhật..."}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Giá thuê</p>
                  <p className="font-bold text-primary">
                    {contract.actualPrice ? `${contract.actualPrice.toLocaleString()}đ` : "Đang cập nhật..."}
                    <span className="text-gray-400 font-normal"> /tháng</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Tiền cọc</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800">
                      {contract.depositAmount ? `${contract.depositAmount.toLocaleString()}đ` : "—"}
                    </p>
                    {contract.depositStatus && (
                      <StatusBadge
                        label={contract.depositStatus === 'REFUNDED' ? 'Đã hoàn cọc' :
                          contract.depositStatus === 'PENALIZED' ? 'Bị giữ cọc' :
                            contract.depositStatus === 'DEPOSITED' ? 'Đã đặt cọc' :
                              'Chưa đặt cọc'}
                        tone={contract.depositStatus === 'REFUNDED' ? 'success' :
                          contract.depositStatus === 'PENALIZED' ? 'danger' :
                            contract.depositStatus === 'DEPOSITED' ? 'info' :
                              'neutral'}
                        className="text-[10px]"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ────── QUẢN LÝ THÀNH VIÊN (DÀNH CHO CHỦ NHÀ / LANDLORD ONLY) ────── */}
            {user?.role === 'LANDLORD' && (
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
                <div className="bg-muted/40/50 px-6 py-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                    <Users className="h-5 w-5 text-primary" /> Thành viên cùng phòng
                  </h3>
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                    {members.length + 1} thành viên
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {/* Đại diện: Tenant đứng tên hợp đồng */}
                  <div className="p-5 flex items-center justify-between bg-blue-50/20">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200 shadow-sm">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{contract.tenantName}</p>
                        <p className="text-[11px] text-gray-500 font-medium">Người đứng tên hợp đồng (Đại diện)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">Chủ phòng</span>
                  </div>

                  {/* Các thành viên khác đã được duyệt */}
                  {members.map(member => (
                    <div key={member.id} className="p-5 flex items-center justify-between hover:bg-muted/40/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <img
                          src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
                          className="w-10 h-10 rounded-full border border-gray-200 bg-white p-0.5 shadow-sm"
                          alt=""
                        />
                        <div>
                          <p className="font-bold text-gray-900">{member.fullName}</p>
                          <p className="text-[11px] text-gray-400">Tham gia: {new Date(member.joinedDate).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-col items-end">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Uy tín</p>
                          <span className="text-xs font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            {member.reputationScore}
                          </span>
                        </div>
                        {(user?.role === 'LANDLORD' || (user?.role === 'TENANT' && user?.id === contract.tenantId)) && contract.status === 'ACTIVE' && (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="h-7 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-rose-200"
                             onClick={() => handleRequestRemoval(member)}
                             disabled={isUpdatingResident}
                           >
                             <Trash2 className="w-3 h-3 mr-1" /> {user?.role === 'LANDLORD' ? 'Xóa thành viên' : 'Yêu cầu xóa'}
                           </Button>
                         )}
                      </div>
                    </div>
                  ))}

                  {/* YÊU CẦU ĐANG CHỜ PHÊ DUYỆT (Lọc: ADD: PENDING/ACCEPTED, REMOVE: PENDING/ACCEPTED) */}
                  {residentRequests.filter(r => 
                      (r.type === 'ADD' && (r.status === 'PENDING' || r.status === 'ACCEPTED')) || 
                      (r.type === 'REMOVE' && (r.status === 'PENDING' || r.status === 'ACCEPTED'))
                    ).map(req => (
<div key={req.id} className="p-5 bg-amber-50/40 border-l-4 border-l-amber-500 relative">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img
                              src={req.inviteeAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=invitee-${req.id}`}
                              className="w-12 h-12 rounded-full border-2 border-amber-200 shadow-sm p-0.5 bg-white"
                              alt=""
                            />
                            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 border border-white shadow-sm">
                              <Clock className="w-2 h-2" />
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                              {req.inviteeName}
                              <StatusBadge
                                label={req.type === 'REMOVE' ? 'Xóa bỏ' : 'Thêm mới'}
                                tone={req.type === 'REMOVE' ? 'danger' : 'info'}
                                className="text-[10px] font-black uppercase tracking-tighter"
                              />
                              <StatusBadge label={`Uy tín: ${req.inviteeReputationScore}`} tone="danger" className="text-[10px] font-black" />
                              {req.inviteeKycStatus === 'VERIFIED' ? (
                                <StatusBadge label="Đã xác minh" tone="success" className="text-[10px] font-black" />
                              ) : (
                                <StatusBadge label="Chưa xác minh" tone="neutral" className="text-[10px] font-black" />
                              )}

                              {/* TRẠNG THÁI 3 BƯỚC (BƯỚC 2: XÁC NHẬN) */}
                              {req.type === 'ADD' && req.status === 'PENDING' && (
                                <StatusBadge label="CHỜ KHÁCH XÁC NHẬN" tone="warning" className="text-[10px] font-black animate-pulse" />
                              )}
                              {req.type === 'ADD' && req.status === 'ACCEPTED' && (
                                <StatusBadge label="SẴN SÀNG DUYỆT" tone="success" className="text-[10px] font-black shadow-sm" />
                              )}
                              {req.type === 'REMOVE' && req.status === 'PENDING' && (
                                <StatusBadge label="CHỜ THÀNH VIÊN XÁC NHẬN RỜI ĐI" tone="danger" className="text-[10px] font-black animate-pulse" />
                              )}
                              {req.type === 'REMOVE' && req.status === 'ACCEPTED' && (
                                <StatusBadge label="SẴN SÀNG DUYỆT XÓA" tone="warning" className="text-[10px] font-black shadow-sm" />
                              )}
                            </p>
                            <div className="space-y-1 mt-1">
                              <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                <span className="text-gray-400 font-normal">Email:</span> {req.inviteeEmail}
                              </p>
                              {req.inviteePhone && (
                                <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                                  <span className="text-gray-400 font-normal">SĐT:</span> {req.inviteePhone}
                                </p>
                              )}
                              {req.inviteeCurrentAddress && (
                                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-gray-300" /> {req.inviteeCurrentAddress}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-red-500 border-red-200 hover:bg-red-50 text-xs font-bold"
                            onClick={() => handleUpdateResidentStatus(req.id, 'REJECTED')}
                            disabled={isUpdatingResident}
                          >Từ chối</Button>
                          <Button 
                             size="sm" 
                             className={cn(
                                "h-8 text-xs font-bold shadow-sm transition-all",
                                req.status === 'PENDING' 
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                                  : "bg-green-600 hover:bg-green-700 text-white"
                              )}
                              onClick={() => handleUpdateResidentStatus(req.id, 'APPROVED')}
                              isLoading={isUpdatingResident}
                              disabled={isUpdatingResident || req.status === 'PENDING'}
                           >
                             {req.status === 'PENDING' ? (req.type === 'ADD' ? 'Chờ khách' : 'Chờ xác nhận') : 'Phê duyệt'}
                           </Button>
                        </div>
                      </div>
                      {req.message && (
                        <div className="bg-white/80 p-3 rounded-xl border border-amber-200/50 italic text-xs text-gray-600 shadow-inner mb-3">
                          “{req.message}”
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 font-medium">
                        Người mời: <span className="font-bold text-gray-600">{req.requesterName}</span>
                        <span className="mx-2">•</span>
                        {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))}

                  {members.length === 0 && residentRequests.filter(r => 
                      (r.type === 'ADD' && (r.status === 'PENDING' || r.status === 'ACCEPTED')) || 
                      (r.type === 'REMOVE' && (r.status === 'PENDING' || r.status === 'ACCEPTED'))
                    ).length === 0 && (
                    <div className="p-8 text-center bg-muted/40/30">
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-gray-400 italic">Hiện tại chưa có thành viên nào khác trong phòng.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ────── LỊCH SỬ THƯƠNG LƯỢNG (TIMELINE) ────── */}
            {changeRequests.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-500" /> Lịch sử thương lượng điều khoản
                </h3>
                <div className="relative pl-8 space-y-8 before:absolute before:inset-0 before:left-[11px] before:w-0.5 before:bg-gray-100 before:content-['']">
                  {changeRequests.map((req) => (
                    <div key={req.id} className="relative group">
                      {/* Dot */}
                      <div className={cn(
                        "absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 bg-white transition-all shadow-sm z-10",
                        req.status === 'ACCEPTED' ? "border-green-500 bg-green-50" : 
                        req.status === 'REJECTED' ? "border-rose-400 bg-rose-50" : "border-amber-400 bg-amber-50"
                      )} />
                      
                      <div className="bg-muted/40/50 rounded-2xl p-4 border border-gray-100/80 group-hover:bg-white group-hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                              {req.type}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {new Date(req.requestDate).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <StatusBadge 
                            label={req.status === 'ACCEPTED' ? 'Đã áp dụng' : req.status === 'REJECTED' ? 'Bị từ chối' : 'Chờ phản hồi'}
                            tone={req.status === 'ACCEPTED' ? 'success' : req.status === 'REJECTED' ? 'danger' : 'warning'}
                            className="text-[10px]"
                          />
                        </div>

                        {req.status === 'PENDING' && req.expiryDate && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Hết hạn: {new Date(req.expiryDate).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[9px] text-rose-500 font-bold italic animate-pulse">
                              (Quá hạn sẽ bị trừ 5 điểm uy tín)
                            </span>
                          </div>
                        )}
                        
                        <p className="text-xs mb-3">
                          <span className="font-bold text-primary">{req.requestedByRole === 'LANDLORD' ? 'Chủ trọ' : 'Khách thuê'}</span> đã đề xuất thay đổi điều khoản.
                        </p>
                        
                        <div className="bg-white p-3 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed italic mb-3">
                           Lý do: “{req.reason}”
                        </div>
                        
                        <div className="flex gap-2">
                           <div className="flex-1 p-2 bg-rose-50/30 rounded border border-rose-50 text-[11px] line-through text-gray-400">
                              {req.oldValue || "Trống"}
                           </div>
                           <div className="w-4 flex items-center justify-center text-gray-300">→</div>
                           <div className="flex-1 p-2 bg-green-50/30 rounded border border-green-50 text-[11px] font-bold text-green-800">
                              {req.newValue}
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contract.additionalTerms && (() => {
              const terms = contract.additionalTerms;
              
              const modernSplitMarker = "[TENANT_REQUESTS_START]";
              const landlordHeaderRegex = /---?\s*NỘI QUY MẪU TỪ CHỦ TRỌ\s*---?/g;
              const tenantHeaderRegex = /---?\s*YÊU CẦU THÊM CỦA KHÁCH THUÊ\s*---?/g;
              
              const isModernSplit = terms.includes(modernSplitMarker);
              const isLegacySplit = landlordHeaderRegex.test(terms) || tenantHeaderRegex.test(terms);
              const hasSplit = isModernSplit || isLegacySplit;

              const cleanText = (text: string) => {
                if (!text) return "";
                return text
                  .replace(modernSplitMarker, "")
                  .replace(landlordHeaderRegex, "")
                  .replace(tenantHeaderRegex, "")
                  .trim();
              };

              let landlordTerms = terms;
              let tenantRequests = "";

              if (isModernSplit) {
                const parts = terms.split(modernSplitMarker);
                landlordTerms = cleanText(parts[0]);
                tenantRequests = cleanText(parts[1] || "");
              } else if (isLegacySplit) {
                const parts = terms.split(tenantHeaderRegex);
                landlordTerms = cleanText(parts[0]);
                tenantRequests = cleanText(parts[1] || "");
              }

              return (
                <div className="bg-white rounded-2xl border shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center bg-muted/40 px-6 py-4 border-b">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                      <AlertCircle className="h-5 w-5 text-gray-500" /> Thỏa thuận & Nội quy
                    </h3>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/30"
                      onClick={handleAnalyzeTerms}
                      isLoading={isAnalyzing}
                    >
                      <Sparkles className="h-4 w-4 mr-2" /> AI Phân tích Rủi ro
                    </Button>
                  </div>

                  <div className="p-6">
                    {hasSplit ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 shadow-sm">
                          <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-3">
                            <ShieldCheck className="w-4 h-4 text-blue-600" /> Nội quy phòng trọ
                          </h4>
                          <div className="text-sm text-blue-950 leading-relaxed whitespace-pre-wrap">
                            {landlordTerms || "Không có nội quy đặc biệt."}
                          </div>
                        </div>
                        <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100 shadow-sm">
                          <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-3">
                            <MessageSquare className="w-4 h-4 text-amber-600" /> Yêu cầu từ khách thuê
                          </h4>
                          <div className="text-sm text-amber-950 leading-relaxed whitespace-pre-wrap">
                            {tenantRequests || "Không có yêu cầu thêm."}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-muted/40/50 p-5 rounded-xl border border-gray-100">
                        {contract.additionalTerms}
                      </div>
                    )}

                    {/* KHUNG HIỂN THỊ KẾT QUẢ CỦA AI */}
                    {analysisResult && (
                      <div className="mt-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl shadow-inner animate-in fade-in zoom-in-95">
                        <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                          <Bot className="h-5 w-5 text-purple-600" /> Luật sư AI Đánh giá:
                        </h4>
                        <div
                          className="text-sm text-purple-950 leading-relaxed"
                          dangerouslySetInnerHTML={renderMarkdown(analysisResult)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ═══ PHỤ LỤC HỢP ĐỒNG (Addendums) ═══ */}
            {changeRequests.filter(r => r.status === 'ACCEPTED').length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm p-6">
                <h3 className="text-md font-bold mb-4 flex items-center gap-2 text-amber-900">
                  📝 Phụ lục Hợp đồng ({changeRequests.filter(r => r.status === 'ACCEPTED').length})
                </h3>
                <p className="text-xs text-amber-700 mb-4 -mt-2">
                  Các thay đổi đã được cả 2 bên đồng ý và áp dụng chính thức vào hợp đồng.
                </p>
                <div className="space-y-3">
                  {changeRequests
                    .filter(r => r.status === 'ACCEPTED')
                    .map((req, idx) => {
                      const typeLabels: Record<string, { label: string; color: string }> = {
                        'RENT_INCREASE': { label: 'Điều chỉnh Giá thuê', color: 'bg-orange-100 text-orange-800 border-orange-300' },
                        'EXTENSION': { label: 'Gia hạn Hợp đồng', color: 'bg-blue-100 text-blue-800 border-blue-300' },
                        'TERMINATION': { label: 'Chấm dứt sớm', color: 'bg-red-100 text-red-800 border-red-300' },
                        'CHANGE_TERMS': { label: 'Sửa Nội quy', color: 'bg-green-100 text-green-800 border-green-300' },
                        'CHANGE_SIGN_METHOD': { label: 'Đổi cách ký', color: 'bg-purple-100 text-purple-800 border-purple-300' },
                      };
                      const typeInfo = typeLabels[req.type] || { label: req.type, color: 'bg-gray-100 text-gray-800 border-gray-300' };

                      return (
                        <div key={req.id} className="bg-white rounded-xl p-4 border border-amber-200/70 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-amber-600 text-sm">Phụ lục #{idx + 1}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {new Date(req.requestDate).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-muted/40 p-2 rounded-lg">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Giá trị cũ</p>
                              <p className="text-gray-600 line-through">{req.type === 'RENT_INCREASE' ? Number(req.oldValue).toLocaleString('vi-VN') + 'đ' : req.oldValue || '—'}</p>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg">
                              <p className="text-[10px] text-emerald-500 font-bold uppercase mb-0.5">Giá trị mới</p>
                              <p className="text-emerald-700 font-bold">{req.type === 'RENT_INCREASE' ? Number(req.newValue).toLocaleString('vi-VN') + 'đ' : req.newValue}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}


            {contract.smartContractAddress && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Blocks className="h-5 w-5 text-indigo-600" /> Dữ liệu Web3 (Smart Contract)
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-indigo-200/50 pb-2">
                    <span className="text-indigo-700">Contract Address</span>
                    <a href={`${runtimeBlockchainConfig.explorerUrl}/address/${contract.smartContractAddress}`} target="_blank" rel="noreferrer" className="font-mono text-indigo-900 hover:underline text-xs">
                      {contract.smartContractAddress.substring(0, 10)}...{contract.smartContractAddress.substring(38)}
                    </a>
                  </div>
                  
                  {/* Block quyết toán đã được di chuyển lên trên */}
                </div>
              </div>
            )}


            {/* ═══ HOÀN CỌC (Deposit Refund) ═══ */}
            {contract && (contract.status === 'EXPIRED' || contract.status === 'TERMINATED_EARLY') && contract.depositStatus !== 'REFUNDED' && user?.role === 'LANDLORD' && (
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200 shadow-sm p-6">
                <h3 className="text-md font-bold mb-3 flex items-center gap-2 text-rose-900">
                  💸 Hoàn cọc cho Khách thuê
                </h3>
                <p className="text-xs text-rose-700 mb-4">
                  Hợp đồng đã kết thúc. Vui lòng hoàn cọc <strong>{contract.depositAmount?.toLocaleString('vi-VN')}đ</strong> cho khách thuê theo thông tin bên dưới.
                </p>

                {contract.signMethod === 'BLOCKCHAIN' ? (
                  <div className="bg-white rounded-xl p-4 border border-rose-200/70 space-y-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Ví Blockchain của Khách thuê</p>
                    <p className="font-mono text-sm text-indigo-700 break-all">{contract.tenantWalletAddress || 'Chưa cập nhật'}</p>
                    <p className="text-xs text-gray-500 mt-2">Chuyển ETH tương ứng từ ví cá nhân của bạn tới địa chỉ trên.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-4 border border-rose-200/70 space-y-3">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Thông tin ngân hàng Khách thuê</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">Ngân hàng</p>
                        <p className="font-bold text-gray-800">{contract.tenantBankName || 'Chưa cập nhật'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Số tài khoản</p>
                        <p className="font-bold text-gray-800 font-mono">{contract.tenantBankAccountNumber || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Chủ tài khoản</p>
                        <p className="font-bold text-gray-800">{contract.tenantBankAccountHolder || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">SĐT</p>
                        <p className="font-bold text-gray-800">{contract.tenantPhone || '—'}</p>
                      </div>
                    </div>
                    {contract.tenantBankQrUrl && (
                      <div className="text-center mt-3">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Mã QR chuyển khoản</p>
                        <img src={contract.tenantBankQrUrl} alt="QR Banking" className="mx-auto max-w-[200px] rounded-lg border" />
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full mt-4 bg-rose-600 hover:bg-rose-700"
                  onClick={() => setIsRefundConfirmOpen(true)}
                  isLoading={isConfirmingRefund}
                >
                  💸 Xác nhận đã hoàn cọc
                </Button>
              </div>
            )}

            {/* Khách thuê thấy trạng thái hoàn cọc */}
            {contract && (contract.status === 'EXPIRED' || contract.status === 'TERMINATED_EARLY') && user?.role === 'TENANT' && (
              <div className={`rounded-2xl border shadow-sm p-6 ${contract.depositStatus === 'REFUNDED' ? 'bg-green-50 border-green-200' :
                  contract.depositStatus === 'PENALIZED' ? 'bg-red-50 border-red-200' :
                    'bg-muted/40 border-gray-200'
                }`}>
                <h3 className="text-md font-bold mb-2 flex items-center gap-2">
                  💰 Trạng thái Tiền cọc
                </h3>
                {contract.depositStatus === 'REFUNDED' ? (
                  <p className="text-green-700 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Chủ trọ đã xác nhận hoàn cọc <strong>{contract.depositAmount?.toLocaleString('vi-VN')}đ</strong></p>
                ) : contract.depositStatus === 'PENALIZED' ? (
                  <p className="text-red-700 flex items-center gap-2"><XCircle className="h-5 w-5" /> Tiền cọc <strong>{contract.depositAmount?.toLocaleString('vi-VN')}đ</strong> đã bị giữ lại do chấm dứt hợp đồng sớm. Chờ Chủ trọ xác nhận hoàn cọc nếu có thỏa thuận khác.</p>
                ) : (
                  <p className="text-gray-600">Đang chờ xử lý từ Chủ trọ...</p>
                )}
              </div>
            )}

          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border shadow-sm p-6 text-center">
              <h4 className="font-bold text-gray-900 mb-6">Trạng thái Hợp đồng</h4>

              {contract.status === 'CANCELLED' ? (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4 ring-4 ring-red-50">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
              ) : contract.status === 'ACTIVE' ? (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4 ring-4 ring-green-50">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-4 ring-4 ring-orange-50">
                  <PenTool className="h-10 w-10 text-orange-600" />
                </div>
              )}

              <p className="font-bold text-lg mb-1">
                {contract.status === 'ACTIVE' ? 'Đã có hiệu lực' :
                  (contract.status === 'AWAITING_DEPOSIT' || (contract.isLandlordSigned && contract.isTenantSigned && contract.status === 'PENDING_SIGNATURE')) ? 'Chờ nạp tiền cọc' : 
                  (contract.status === 'CANCELLED' || contract.status === 'EXPIRED') ? (
                    <span className="text-red-600">Đã bị từ chối/hủy/Hết hạn</span>
                  ) : contract.status === 'TERMINATED_EARLY' ? (
                    <span className="text-orange-600">Đã kết thúc sớm</span>
                  ) : 'Đang chờ ký xác nhận'}
              </p>

              {contract.status === 'CANCELLED' && contract.cancelReason && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-left">
                  <p className="text-[10px] text-red-400 font-bold uppercase mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Lý do từ chối:
                  </p>
                  <p className="text-sm text-red-700 italic">“{contract.cancelReason}”</p>
                </div>
              )}

              {contract.status !== 'ACTIVE' && (
                <div className="mt-6 space-y-3">
                  {contract.status !== 'PENDING_APPROVAL' && (
                    <div className="flex flex-col gap-2 text-sm text-left bg-muted/40/50 p-4 rounded-xl border border-gray-100 mb-4">
                      <p className="font-bold text-gray-800 mb-1">Tiến độ ký kết:</p>
                      <div className="flex items-center justify-between">
                        <span className={contract.isLandlordSigned ? 'text-green-700 font-medium' : 'text-gray-500'}>1. Chủ nhà</span>
                        {contract.isLandlordSigned ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={contract.isTenantSigned ? 'text-green-700 font-medium' : 'text-gray-500'}>2. Khách thuê</span>
                        {contract.isTenantSigned ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                  )}

                  {contract.status === 'PENDING_APPROVAL' && user?.role === 'LANDLORD' ? (
                    <div className="space-y-3">
                      <Button
                        className="w-full gap-2 h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                        onClick={() => setIsApproveModalOpen(true)}
                        isLoading={isApproving}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Chọn người thuê này
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2 h-11 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setIsRejectModalOpen(true)}
                      >
                        <XCircle className="h-4 w-4" /> Từ chối yêu cầu
                      </Button>
                    </div>
                  ) : !isMeSigned && contract.status === 'PENDING_SIGNATURE' ? (
                    <div className="space-y-3">
                      <Button
                        className="w-full gap-2 h-11 shadow-md shadow-blue-500/20"
                        onClick={() => setIsSignModalOpen(true)}
                        disabled={!!pendingRequest}
                      >
                        <PenTool className="h-4 w-4" /> Ký xác nhận
                      </Button>
                      
                      {user?.role === 'LANDLORD' && (
                        <Button
                          variant="outline"
                          className="w-full gap-2 h-11 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setIsRejectModalOpen(true)}
                        >
                          <XCircle className="h-4 w-4" /> Từ chối yêu cầu
                        </Button>
                      )}
                    </div>
                  ) : (
                    !isPartnerSigned && contract.status === 'PENDING_SIGNATURE' && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang chờ đối tác ký...
                      </div>
                    )
                  )}

                  {contract.status === 'AWAITING_DEPOSIT' && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-4">
                      <p className="text-sm text-orange-800 font-medium">
                        {user?.role === 'TENANT'
                          ? "Mọi người đã ký xong! Vui lòng thực hiện nạp cọc để hợp đồng có hiệu lực."
                          : "Mọi người đã ký xong! Đang chờ khách thuê nạp cọc để kích hoạt hợp đồng."}
                      </p>

                      {/* HIỂN THỊ THỜI HẠN 24H VÀ CẢNH BÁO PHẠT */}
                      <div className="bg-white/60 p-3 rounded-lg border border-orange-200 text-[11px] space-y-2">
                        <div className="flex items-center gap-2 text-orange-900 font-bold">
                          <Clock className="w-3 h-3" /> THỜI HẠN NẠP CỌC: 24 GIỜ
                        </div>
                        <p className="text-gray-600 leading-tight">
                          Sau 24h kể từ khi ký ({contract.signDate ? new Date(new Date(contract.signDate).getTime() + 24*60*60*1000).toLocaleString('vi-VN') : '—'}), nếu không nạp cọc, hợp đồng sẽ <strong>tự động bị hủy</strong>.
                        </p>
                        {user?.role === 'TENANT' && (
                          <p className="text-red-600 font-bold flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" /> 
                            Lưu ý: Bạn sẽ bị trừ 10 điểm uy tín nếu để hợp đồng quá hạn nạp cọc.
                          </p>
                        )}
                      </div>

                      {user?.role === 'TENANT' && contract.signMethod === 'BLOCKCHAIN' && (
                        <Button
                          className="w-full gap-2 bg-orange-600 hover:bg-orange-700 h-11 shadow-lg shadow-orange-200"
                          onClick={handleConfirmWeb3Deposit}
                          isLoading={isConfirmingDeposit}
                        >
                          <Blocks className="w-4 h-4" /> Nạp cọc Web3 ngay
                        </Button>
                      )}

                      {user?.role === 'TENANT' && contract.signMethod === 'TRADITIONAL' && (
                        <div className="flex flex-col gap-3">
                          <Button
                            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 h-11 shadow-lg shadow-blue-200"
                            onClick={handleOpenDepositQrModal}
                            isLoading={isLoadingQr}
                          >
                            <QrCode className="w-4 h-4" /> Thanh toán Cọc (Mã VietQR)
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {!pendingRequest && !isMeSigned && (
                    <Button
                      variant="outline"
                      className="w-full h-11 border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        setChangeForm(prev => ({ ...prev, type: 'CHANGE_TERMS', newValue: '' }));
                        setIsRequestModalOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" /> Đề xuất chỉnh sửa
                    </Button>
                  )}
                </div>
              )}

              {contract.status === 'ACTIVE' && (
                <div className="mt-6 space-y-3">
                  {!pendingRequest && !changeRequests.some(r => r.type === 'TERMINATION' && r.status === 'ACCEPTED') && (
                    <Button
                      variant="outline"
                      className="w-full h-11 border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        setChangeForm(prev => ({ ...prev, type: user?.role === 'TENANT' ? 'TERMINATION' : 'EXTENSION', newValue: '' }));
                        setIsRequestModalOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" /> {user?.role === 'TENANT' ? 'Đề xuất Trả phòng / Cập nhật' : 'Đề xuất Gia hạn / Cập nhật HĐ'}
                    </Button>
                  )}
                  {user?.role === 'TENANT' && (
                    <Button
                      className="w-full gap-2 h-11 bg-yellow-500 hover:bg-yellow-600 text-white shadow-md shadow-yellow-200"
                      onClick={() => setIsReviewModalOpen(true)}
                    >
                      <Star className="h-4 w-4 fill-white" /> Viết Đánh Giá
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 bg-white"
              onClick={handleDownloadPDF}
              isLoading={isDownloading}
            >
              <Download className="w-4 h-4 text-gray-500" /> Tải bản PDF
            </Button>

            {/* ────── HỒ SƠ NGƯỜI THUÊ (DÀNH CHO CHỦ NHÀ) ────── */}
            {user?.role === 'LANDLORD' && (contract.status === 'PENDING_SIGNATURE' || contract.status === 'PENDING_APPROVAL') && (
              <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                  <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                    <User className="w-4 h-4" /> Hồ sơ Đối tác gửi yêu cầu
                  </h4>
                </div>
                <div className="p-5 space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg border-2 border-white shadow-sm overflow-hidden">
                        {contract.tenantName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-gray-900 leading-tight">{contract.tenantName}</h5>
                        <p className="text-[11px] text-gray-400 font-medium">Khách hàng tiềm năng</p>
                      </div>
                      <div className="text-right">
                         <div className={cn(
                           "text-xl font-black",
                           (contract.tenantReputationScore ?? 0) >= 80 ? "text-green-500" :
                           (contract.tenantReputationScore ?? 0) >= 50 ? "text-amber-500" : "text-rose-500"
                         )}>
                           {contract.tenantReputationScore ?? 0}
                         </div>
                         <p className="text-[9px] uppercase font-bold text-gray-400">Uy tín</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 pb-2">
                      <div className="p-3 rounded-xl bg-muted/40 border border-gray-100">
                         <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Định danh KYC</p>
                         <div className="flex items-center gap-1.5">
                            {contract.tenantKycStatus === 'VERIFIED' ? (
                               <>
                                 <CheckCircle className="w-3 h-3 text-green-500" />
                                 <span className="text-xs font-bold text-green-700">Đã xác thực</span>
                               </>
                            ) : (
                               <>
                                 <AlertCircle className="w-3 h-3 text-amber-500" />
                                 <span className="text-xs font-bold text-amber-700">Chưa xác thực</span>
                               </>
                            )}
                         </div>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Mức độ tin cậy</p>
                        <div className="flex items-center gap-1.5">
                           {(contract.tenantReputationScore ?? 0) >= 80 ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-green-500" /> 
                                <span className="text-xs font-bold text-green-700">Rất cao</span>
                              </>
                           ) : (contract.tenantReputationScore ?? 0) >= 50 ? (
                              <>
                                <TrendingUp className="w-3 h-3 text-indigo-500" /> 
                                <span className="text-xs font-bold text-indigo-700">Trung bình</span>
                              </>
                           ) : (
                              <>
                                <AlertCircle className="w-3 h-3 text-rose-500" /> 
                                <span className="text-xs font-bold text-rose-700">Thấp</span>
                              </>
                           )}
                        </div>
                      </div>
                   </div>

                   <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-[11px] text-indigo-800 leading-relaxed italic">
                      “Khách hàng quan tâm và mong muốn sớm chốt phòng. Vui lòng kiểm tra kỹ đề xuất của cả 2 bên trước khi quyết định ký kết.”
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'BILLS' && (
        <div className="space-y-6">
          {contract.smartContractAddress && (
            <DashboardPanel
              title="Ví Web3 (Sổ dư chờ rút)"
              description="Khoản tiền hóa đơn hoặc cọc đã được lưu trong Smart Contract và chờ bạn rút về ví MetaMask."
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5 shadow-inner">
                  <div>
                    <p className="text-sm text-indigo-700 font-bold mb-1 uppercase tracking-wider">Số dư có thể rút</p>
                    <p className="text-3xl font-black text-indigo-900">
                      {withdrawableBalance.toLocaleString('vi-VN')} <span className="text-lg font-bold text-indigo-600">đ</span>
                    </p>
                  </div>
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 h-12 px-6 shadow-md shadow-indigo-200 text-sm font-bold"
                    onClick={handleWithdrawFunds}
                    isLoading={isWithdrawing}
                    disabled={withdrawableBalance <= 0 || isWithdrawing}
                  >
                    💰 Rút toàn bộ về ví
                  </Button>
                </div>
              </div>
            </DashboardPanel>
          )}

          <DashboardPanel
            title="Lịch sử hóa đơn"
            description={user?.role === 'TENANT' ? 'Thanh toán đúng hạn giữ uy tín và tránh phạt.' : 'Theo dõi từng kỳ và trạng thái thu tiền.'}
          >
          <div className="p-4 sm:p-5">
            {isLoadingBills ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : bills.length === 0 ? (
              <div className="py-8">
                <EmptyState icon={Receipt} title="Chưa có hóa đơn" description="Hóa đơn sẽ hiển thị khi chủ trọ phát hành kỳ mới." />
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card/50">
                {contractOperational.sortedBills.map((bill: any) => {
                  const deadlineMs = new Date(bill.deadline).getTime();
                  const isOverdue =
                    bill.status !== "PAID" && (bill.status === "LATE" || deadlineMs < Date.now());
                  return (
                  <div
                    key={bill.id}
                    className={cn(
                      "flex flex-col gap-3 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between",
                      isOverdue && "border-l-4 border-l-destructive bg-destructive/[0.03]"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-foreground">
                          Kỳ {bill.month}/{bill.year}
                        </h4>
                        {isOverdue ? (
                          <StatusBadge label="Quá hạn" tone="danger" className="text-[10px]" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Hạn: {new Date(bill.deadline).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <p className="text-lg font-bold tabular-nums text-primary sm:text-right">{(bill.totalAmount).toLocaleString()} đ</p>
                      {bill.status === 'PAID' ? (
                        <StatusBadge
                          label={user?.role === 'LANDLORD' ? 'Đã thu' : 'Đã thanh toán'}
                          tone="success"
                          className="text-xs"
                        />
                      ) : bill.status === 'PENDING' ? (
                        <StatusBadge label="Chờ xác nhận" tone="warning" className="text-xs" />
                      ) : (
                        user?.role === 'TENANT' && (
                          contract.signMethod === 'BLOCKCHAIN' ? (
                            <Button size="sm" className="min-h-9" onClick={() => handlePayWeb3(bill)} isLoading={isPaying}>
                              Thanh toán Web3
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="min-h-9 border-primary/30" onClick={() => openTraditionalPaymentModal(bill)}>
                              Thanh toán CK
                            </Button>
                          )
                        )
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </DashboardPanel>
        </div>
      )}

      {/* --- MODAL CHẤP NHẬN YÊU CẦU (Chủ trọ) --- */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-4 border-white">
            <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
               <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-indigo-900">Xác nhận chốt khách</h3>
                  <p className="text-xs text-indigo-600">Khách thuê sẽ được chuyển sang chờ ký kết</p>
               </div>
            </div>
            
            <div className="p-6 space-y-4">
               <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-[11px] text-amber-800 leading-relaxed">
                  <p className="font-bold mb-1 flex items-center gap-1 uppercase text-amber-700"><AlertCircle className="w-4 h-4" /> CẢNH BÁO QUAN TRỌNG:</p>
                  Khi chọn yêu cầu này, hệ thống sẽ tự động <strong>TỪ CHỐI</strong> tất cả các yêu cầu thuê khác đang chờ duyệt cho cùng căn phòng này. Hành động này không thể hoàn tác.
               </div>
               <p className="text-sm text-gray-700 text-center font-medium mt-4">
                  Bạn có chắc chắn muốn chọn khách thuê này không?
               </p>
            </div>

            <div className="p-6 bg-muted/40 flex gap-3">
               <Button 
                 variant="ghost" 
                 className="flex-1 text-gray-600 hover:bg-gray-100 h-12 rounded-2xl" 
                 onClick={() => setIsApproveModalOpen(false)}
                 disabled={isApproving}
               >
                 Hủy bỏ
               </Button>
               <Button 
                 className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 h-12 rounded-2xl gap-2 font-bold" 
                 onClick={() => {
                   setIsApproveModalOpen(false);
                   handleApproveContract();
                 }}
                 isLoading={isApproving}
               >
                 <CheckCircle2 className="w-4 h-4" /> Xác nhận chọn
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KÝ HỢP ĐỒNG */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <h2 className="text-xl font-bold mb-2">Ký/xác nhận hợp đồng điện tử</h2>
            <p className="text-sm text-gray-500 mb-6">Bạn đang xác nhận nội dung hợp đồng cho phòng <span className="font-bold text-gray-800">{contract.roomName}</span> trên hệ thống SmartRental.</p>

            <div className="space-y-3 mb-8">
              {contract.signMethod === 'BLOCKCHAIN' ? (
                <div className="flex gap-4 p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50/50">
                  <div className="mt-1 shrink-0 text-indigo-600">
                    <CheckCircle className="h-6 w-6 fill-indigo-100" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2 text-indigo-900">
                      Ký giao dịch đặt cọc (Web3) <Blocks className="h-4 w-4 text-indigo-500" />
                      <StatusBadge label="Đã chốt" tone="info" className="text-[10px] ml-1" />
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Sử dụng MetaMask để xác nhận giao dịch blockchain. Nội dung hợp đồng được lưu trong hệ thống.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 p-4 rounded-xl border-2 border-blue-500 bg-blue-50/50">
                  <div className="mt-1 shrink-0 text-blue-600">
                    <CheckCircle className="h-6 w-6 fill-blue-100" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2 text-blue-700">
                      Xác nhận điện tử (Nhanh)
                      <StatusBadge label="Đã chốt" tone="info" className="text-[10px] ml-2" />
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Kích hoạt ngay bằng cách xác nhận đồng ý các điều khoản trên hệ thống. Không dùng Web3.
                    </p>
                  </div>
                </div>
              )}

              {/* Phần yêu cầu thanh toán cọc cho KHÁCH THUÊ (Chỉ BLOCKCHAIN) */}
              {user?.role === 'TENANT' && contract.depositStatus !== 'DEPOSITED' && contract.signMethod === 'BLOCKCHAIN' && (
                <div className="mt-4 p-4 rounded-xl border-2 border-orange-200 bg-orange-50 space-y-3">
                  <h4 className="font-bold text-orange-900 flex items-center gap-2">
                    💰 Cần Thanh toán Cọc: {contract.depositAmount?.toLocaleString()}đ
                  </h4>
                  <p className="text-xs text-orange-800 leading-relaxed">
                    Khi bấm "Ký giao dịch đặt cọc", MetaMask sẽ yêu cầu bạn chuyển khoản trực tiếp khoản Tiền cọc tương đương <strong>{((contract.depositAmount || 0) / config.vndEthRate).toFixed(4)} ETH</strong> tới ví của Chủ trọ để làm bằng chứng xác nhận ký.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-gray-400 text-center italic mt-3">
                * Phương thức ký đã được chốt. Nếu muốn thay đổi, vui lòng đóng hộp thoại này và dùng tính năng "Đề xuất chỉnh sửa".
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsSignModalOpen(false)}>
                Để sau
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSignContract}
                isLoading={isSigning}
                disabled={!!chainRiskMessage && contract?.signMethod === "BLOCKCHAIN"}
              >
                {contract.signMethod === 'BLOCKCHAIN' ? 'Ký giao dịch đặt cọc' : 'Xác nhận hợp đồng'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL TỪ CHỐI --- */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-rose-600">Xác nhận từ chối</h2>
            <p className="text-sm text-gray-600 mb-4">Bạn chắc chắn muốn từ chối yêu cầu này? Vui lòng cho biết lý do:</p>
            <Textarea
              className="mb-4"
              placeholder="Nhập lý do từ chối..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsRejectModalOpen(false)}>Hủy</Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700"
                onClick={handleRejectContract}
                isLoading={isRejecting}
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </div>
      )}

      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-500" /> Đề xuất chỉnh sửa
            </h2>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 font-bold mb-3 block">Bạn muốn đề xuất điều gì?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { type: 'EXTENSION', label: user?.role === 'LANDLORD' ? 'Gia hạn Hợp đồng' : 'Xin gia hạn Hợp đồng', desc: 'Đề xuất đổi ngày kết thúc', icon: <Calendar className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50 border-blue-200 ring-blue-500', hidden: contract.status !== 'ACTIVE' },
                    { type: 'TERMINATION', label: user?.role === 'LANDLORD' ? 'Lấy lại phòng trước hạn' : 'Xin trả phòng trước hạn', desc: 'Chấm dứt hợp đồng sớm', icon: <LogOut className="w-5 h-5" />, color: 'text-red-600 bg-red-50 border-red-200 ring-red-500', hidden: contract.status !== 'ACTIVE' },
                    { type: 'RENT_INCREASE', label: contract.status === 'ACTIVE' ? 'Điều chỉnh Giá thuê' : 'Thương lượng Giá thuê', desc: contract.status === 'ACTIVE' ? 'Đề xuất tăng/giảm giá' : 'Thương thảo lại giá', icon: <TrendingUp className="w-5 h-5" />, color: 'text-orange-600 bg-orange-50 border-orange-200 ring-orange-500', hidden: contract.status === 'ACTIVE' && user?.role === 'TENANT' },
                    { type: 'CHANGE_TERMS', label: contract.status === 'ACTIVE' ? (user?.role === 'LANDLORD' ? 'Thay đổi Nội quy' : 'Xin thay đổi Nội quy') : 'Thương lượng Điều khoản', desc: 'Thêm bớt điều khoản', icon: <FileText className="w-5 h-5" />, color: 'text-green-600 bg-green-50 border-green-200 ring-green-500' },
                    { type: 'CHANGE_SIGN_METHOD', label: 'Sửa cách ký', desc: 'Đổi phương thức ký', icon: <PenTool className="w-5 h-5" />, color: 'text-purple-600 bg-purple-50 border-purple-200 ring-purple-500', hidden: contract.status === 'ACTIVE' }
                  ].filter(opt => !opt.hidden).map((opt) => (
                    <div
                      key={opt.type}
                      onClick={() => setChangeForm({ ...changeForm, type: opt.type as RequestType, newValue: '' })}
                      className={`cursor-pointer rounded-xl p-3 border-2 transition-all flex flex-col items-center text-center gap-1 
                        ${changeForm.type === opt.type ? `ring-2 ring-offset-1 ${opt.color} shadow-sm` : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-muted/40'}`}
                    >
                      <div className={`${changeForm.type === opt.type ? '' : 'text-gray-400'}`}>
                        {opt.icon}
                      </div>
                      <span className={`font-bold text-xs ${changeForm.type === opt.type ? '' : 'text-gray-700'}`}>{opt.label}</span>
                      <span className="text-[10px] text-gray-500 leading-tight">{opt.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-start transition-all duration-300 mb-4">
                <Label className="mb-1 text-gray-700">
                  {changeForm.type === 'TERMINATION' ? 'Ngày mong muốn kết thúc hợp đồng' :
                   changeForm.type === 'EXTENSION' ? 'Ngày mong muốn gia hạn đến' :
                   changeForm.type === 'RENT_INCREASE' ? 'Mức giá mới đề xuất (VNĐ/tháng)' :
                   changeForm.type === 'CHANGE_SIGN_METHOD' ? 'Phương thức ký mới' :
                   'Nội dung Điều khoản / Nội quy mới đề xuất'}
                </Label>

                {changeForm.type === 'CHANGE_SIGN_METHOD' ? (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={changeForm.newValue}
                    onChange={(e) => setChangeForm({ ...changeForm, newValue: e.target.value })}
                  >
                    <option value="" disabled>-- Chọn phương thức bạn muốn --</option>
                    <option value="BLOCKCHAIN">Ký bằng Smart Contract (Web3)</option>
                    <option value="TRADITIONAL">Xác nhận điện tử (Nhanh)</option>
                  </select>
                ) : changeForm.type === 'RENT_INCREASE' ? (
                  <Input
                    type="number"
                    placeholder="VD: 4500000"
                    className="mt-1"
                    value={changeForm.newValue}
                    onChange={(e) => setChangeForm({ ...changeForm, newValue: e.target.value })}
                  />
                ) : (changeForm.type === 'EXTENSION' || changeForm.type === 'TERMINATION') ? (
                  <Input
                    type="date"
                    className="mt-1"
                    min={new Date().toISOString().split('T')[0]}
                    value={changeForm.newValue}
                    onChange={(e) => setChangeForm({ ...changeForm, newValue: e.target.value })}
                  />
                ) : (
                  <div className="space-y-3 mt-1 flex-1">
                    <div className="flex flex-wrap gap-2">
                      {(user?.role === 'LANDLORD' ? LANDLORD_SUGGESTED_TERMS : TENANT_SUGGESTED_TERMS).map((term, idx) => {
                        const isAdded = changeForm.newValue.includes(term);
                        return (
                          <span
                            key={idx}
                            onClick={() => !isAdded && handleAddTerm(term)}
                            className={`text-[11px] px-3 py-1.5 rounded-full transition-all shadow-sm flex items-center gap-1 border ${isAdded
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : user?.role === 'LANDLORD'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 cursor-pointer active:scale-95'
                                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 cursor-pointer active:scale-95'
                              }`}
                          >
                            <span className={`font-bold ${isAdded ? 'text-gray-400' : 'text-primary'}`}>
                              {isAdded ? '✓' : '+'}
                            </span>
                            {term.substring(0, 30)}...
                          </span>
                        );
                      })}
                    </div>
                    <textarea
                      placeholder="Nhập nội dung mong muốn..."
                      className="flex w-full rounded-xl border border-input bg-muted/40/50 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[120px] resize-y placeholder:text-gray-400"
                      value={changeForm.newValue}
                      onChange={(e) => setChangeForm({ ...changeForm, newValue: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Lý do đề xuất</Label>
                
                {/* 💡 Gợi ý lý do nhanh */}
                <div className="flex flex-wrap gap-2 mt-1.5 mb-2">
                  {(() => {
                    const presetReasons: Record<string, string[]> = {
                      'TERMINATION': user?.role === 'LANDLORD' ? [
                        'Khách thuê vi phạm nội quy nhiều lần',
                        'Chậm thanh toán nhiều tháng liên tiếp',
                        'Cần lấy lại phòng để sửa chữa/sử dụng cá nhân'
                      ] : [
                        'Công việc thay đổi/Chuyển chỗ làm',
                        'Có việc gấp gia đình về quê',
                        'Không còn phù hợp nhu cầu sử dụng'
                      ],
                      'EXTENSION': [
                        'Muốn tiếp tục thuê dài hạn',
                        'Chưa tìm được chỗ ở mới, xin gia hạn thêm 1 tháng',
                        'Công việc ổn định nên muốn thuê tiếp'
                      ],
                      'RENT_INCREASE': user?.role === 'LANDLORD' ? [
                        'Điều chỉnh theo giá cả thị trường',
                        'Mới bổ sung thêm nội thất/thiết bị mới'
                      ] : [
                        'Tình hình kinh tế khó khăn, mong giảm giá',
                        'Chất lượng phòng không như cam kết ban đầu'
                      ],
                      'CHANGE_TERMS': [
                        'Xin phép được nuôi thú cưng nhỏ',
                        'Bổ sung quyền lợi bảo trì máy lạnh',
                        'Thêm người ở ghép'
                      ],
                      'CHANGE_SIGN_METHOD': [
                        'Không rành Web3, xin đổi sang Xác nhận nhanh',
                        'Muốn dùng Smart Contract cho an toàn'
                      ]
                    };
                    return (presetReasons[changeForm.type] || []).map((reason, idx) => (
                      <span
                        key={idx}
                        onClick={() => {
                          const currentReason = changeForm.reason.trim();
                          if (currentReason && !currentReason.endsWith(',')) {
                            setChangeForm({ ...changeForm, reason: currentReason + ', ' + reason });
                          } else {
                            setChangeForm({ ...changeForm, reason: currentReason + reason });
                          }
                        }}
                        className="text-[11px] px-2.5 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-md cursor-pointer border border-gray-200 transition-colors"
                      >
                        + {reason}
                      </span>
                    ));
                  })()}
                </div>

                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 min-h-[80px]"
                  placeholder="Giải thích lý do bạn muốn thay đổi..."
                  value={changeForm.reason}
                  onChange={(e) => setChangeForm({ ...changeForm, reason: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setIsRequestModalOpen(false)}>Hủy</Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleSubmitChangeRequest}
                isLoading={isSubmittingRequest}
              >
                Gửi Đề Xuất
              </Button>
            </div>
          </div>
        </div>
      )}



      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        contractId={Number(id)}
        roomName={contract.roomName || ''}
      />

      <ConfirmActionDialog
        open={isRefundConfirmOpen}
        onOpenChange={setIsRefundConfirmOpen}
        title="Xác nhận hoàn tiền cọc?"
        description={`Xác nhận đã hoàn cọc ${contract.depositAmount?.toLocaleString('vi-VN')}đ cho khách thuê ${contract.tenantName}?`}
        confirmLabel="Xác nhận hoàn cọc"
        tone="danger"
        onConfirm={handleConfirmDepositRefund}
        isLoading={isConfirmingRefund}
      />

      <div className="hidden">
        <div id="contract-pdf-content" className="p-12 text-black bg-white" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
          <div className="text-center mb-8">
            <h2 className="font-bold text-lg uppercase leading-relaxed">Cộng hòa Xã hội Chủ nghĩa Việt Nam</h2>
            <h3 className="font-bold text-base underline underline-offset-4 decoration-2">Độc lập - Tự do - Hạnh phúc</h3>
          </div>

          <h1 className="text-center font-bold text-2xl uppercase mb-8">Hợp đồng thuê phòng trọ</h1>

          <div className="space-y-4 text-sm leading-relaxed text-justify">
            <p>Hôm nay, ngày {contract.signDate ? new Date(contract.signDate).getDate() : new Date().getDate()} tháng {contract.signDate ? new Date(contract.signDate).getMonth() + 1 : new Date().getMonth() + 1} năm {contract.signDate ? new Date(contract.signDate).getFullYear() : new Date().getFullYear()}, chúng tôi gồm có:</p>

            <div className="pl-4 space-y-1">
              <p className="font-bold uppercase">BÊN CHO THUÊ (BÊN A):</p>
              <p>- Ông/Bà: <strong>{contract.landlordName || '...........................................'}</strong></p>
              <p>- Địa chỉ khu trọ: {contract.propertyAddress || '...........................................'}</p>
            </div>

            <div className="pl-4 space-y-1">
              <p className="font-bold uppercase">BÊN THUÊ (BÊN B):</p>
              <p>- Ông/Bà: <strong>{contract.tenantName || '...........................................'}</strong></p>
            </div>

            <p className="font-bold mt-6 mb-2">Hai bên thống nhất thỏa thuận các điều khoản sau:</p>

            <div className="space-y-2">
              <p><strong>Điều 1: Thông tin phòng thuê và Giá cả</strong></p>
              <ul className="list-disc pl-8 space-y-1">
                <li>Bên A đồng ý cho Bên B thuê phòng số: <strong>{contract.roomName}</strong>.</li>
                <li>Giá thuê phòng: <strong>{new Intl.NumberFormat('vi-VN').format(contract.actualPrice || 0)} VNĐ/tháng</strong>.</li>
                <li>Tiền đặt cọc: <strong>{new Intl.NumberFormat('vi-VN').format(contract.depositAmount || 0)} VNĐ</strong>.</li>
                {contract.elecPrice && <li>Giá điện: <strong>{new Intl.NumberFormat('vi-VN').format(contract.elecPrice)} VNĐ/kWh</strong>.</li>}
                {contract.waterPrice && <li>Giá nước: <strong>{new Intl.NumberFormat('vi-VN').format(contract.waterPrice)} VNĐ/m³</strong>.</li>}
                {contract.internetPrice !== undefined && <li>Internet & Dịch vụ: <strong>{contract.internetPrice === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(contract.internetPrice)} VNĐ/tháng`}</strong>.</li>}
              </ul>
            </div>

            <div className="space-y-2">
              <p><strong>Điều 2: Thời hạn hợp đồng</strong></p>
              <ul className="list-disc pl-8 space-y-1">
                <li>Thời gian thuê: <strong>{durationMonths} tháng</strong>.</li>
                <li>Từ ngày <strong>{new Date(contract.startDate).toLocaleDateString('vi-VN')}</strong> đến ngày <strong>{contract.endDate ? new Date(contract.endDate).toLocaleDateString('vi-VN') : '...'}</strong>.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <p><strong>Điều 3: Các thỏa thuận bổ sung / Nội quy phòng trọ</strong></p>
              {(() => {
                const terms = contract.additionalTerms;
                const modernSplitMarker = "[TENANT_REQUESTS_START]";
                const landlordHeaderRegex = /---?\s*NỘI QUY MẪU TỪ CHỦ TRỌ\s*---?/g;
                const tenantHeaderRegex = /---?\s*YÊU CẦU THÊM CỦA KHÁCH THUÊ\s*---?/g;
                
                const isModernSplit = terms?.includes(modernSplitMarker);
                // Reset regex indices for consistent testing
                landlordHeaderRegex.lastIndex = 0;
                tenantHeaderRegex.lastIndex = 0;
                const isLegacySplit = landlordHeaderRegex.test(terms || "") || tenantHeaderRegex.test(terms || "");
                
                const clean = (t: string) => t.replace(modernSplitMarker, "").replace(landlordHeaderRegex, "").replace(tenantHeaderRegex, "").trim();

                if ((isModernSplit || isLegacySplit) && terms) {
                  const parts = isModernSplit ? terms.split(modernSplitMarker) : terms.split(tenantHeaderRegex);
                  const landlordPart = clean(parts[0]);
                  const tenantPart = clean(parts[1] || "");
                  
                  return (
                    <div className="pl-4 space-y-4">
                      {landlordPart && (
                        <div>
                          <p className="font-bold">3.1. Nội quy phòng trọ:</p>
                          <div className="pl-4 whitespace-pre-wrap italic text-gray-700">{landlordPart}</div>
                        </div>
                      )}
                      {tenantPart && (
                        <div>
                          <p className="font-bold">3.2. Thỏa thuận bổ sung của khách thuê:</p>
                          <div className="pl-4 whitespace-pre-wrap italic text-gray-700">{tenantPart}</div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="bg-muted/40 border border-gray-200 p-4 rounded-md whitespace-pre-wrap italic text-gray-700">
                    {clean(terms || "Không có thỏa thuận bổ sung nào khác.")}
                  </div>
                );
              })()}
            </div>

            <div className="space-y-2 mt-6">
              <p><strong>Điều 4: Cam kết chung</strong></p>
              <p>Hai bên cam kết thực hiện đúng các điều khoản đã ghi trong hợp đồng. Hợp đồng này được lập thành văn bản điện tử trên hệ thống SmartRental và có giá trị pháp lý sau khi hai bên xác nhận.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 mt-16 text-center">
            <div>
              <p className="font-bold uppercase mb-4">BÊN A (CHO THUÊ)</p>
              {contract.status === 'ACTIVE' ? (
                <div className="text-green-600 font-bold italic border-2 border-green-500 rounded-lg p-2 w-max mx-auto rotate-[-5deg]">
                  Đã ký điện tử
                </div>
              ) : (
                <p className="text-gray-400 italic">(Ký, ghi rõ họ tên)</p>
              )}
            </div>
            <div>
              <p className="font-bold uppercase mb-4">BÊN B (NGƯỜI THUÊ)</p>
              {contract.status === 'ACTIVE' ? (
                <div className="text-green-600 font-bold italic border-2 border-green-500 rounded-lg p-2 w-max mx-auto rotate-[-5deg]">
                  Đã ký điện tử
                </div>
              ) : (
                <p className="text-gray-400 italic">(Ký, ghi rõ họ tên)</p>
              )}
            </div>
          </div>
          {contract.status === 'ACTIVE' && contract.signMethod === 'BLOCKCHAIN' && (
            <div className="mt-12 p-4 border border-indigo-200 bg-indigo-50 rounded-lg text-[10px] text-indigo-800 text-center break-all">
              <p className="font-bold uppercase mb-1">🔐 Chứng nhận Blockchain Smart Contract</p>
              <p>Contract Address: {contract.smartContractAddress}</p>
              <p>Tx Hash: {contract.deployTxHash}</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL TỪ CHỐI HỢP ĐỒNG (Chủ trọ) --- */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-4 border-white">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
               <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
                  <XCircle className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-rose-900">Từ chối yêu cầu</h3>
                  <p className="text-xs text-rose-600">Hành động này sẽ giải phóng phòng ngay</p>
               </div>
            </div>
            
            <div className="p-6 space-y-4">
               <div className="space-y-2">
                 <Label className="text-gray-700 font-bold flex items-center gap-1.5">
                    Lý do từ chối <span className="text-rose-500">*</span>
                 </Label>
                 <Textarea 
                    placeholder="VD: Phòng này đã có khách đặt trước, hoặc tôi muốn xem xét hồ sơ khác..."
                    className="min-h-[120px] focus:ring-rose-500 border-rose-100 bg-muted/40/50"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                 />
                 <p className="text-[10px] text-gray-400 italic">Lý do này sẽ được gửi trực tiếp đến khách thuê để học biết được thông tin chính xác nhất.</p>
               </div>

               <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-[11px] text-amber-800 leading-relaxed">
                  <p className="font-bold mb-1 flex items-center gap-1 uppercase">⚠️ Lưu ý quan trọng:</p>
                  Hợp đồng sẽ chuyển sang trạng thái <strong>ĐÃ HỦY</strong>. Người thuê sẽ nhận được thông báo và phòng của bạn sẽ tự động hiển thị <strong>CÒN TRỐNG</strong> để đón khách mới.
               </div>
            </div>

            <div className="p-6 bg-muted/40 flex gap-3">
               <Button 
                 variant="ghost" 
                 className="flex-1 text-gray-600 hover:bg-gray-100 h-12 rounded-2xl" 
                 onClick={() => setIsRejectModalOpen(false)}
                 disabled={isRejecting}
               >
                 Hủy bỏ
               </Button>
               <Button 
                 className="flex-2 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200 h-12 rounded-2xl gap-2 font-bold" 
                 onClick={handleRejectContract}
                 isLoading={isRejecting}
               >
                 Xác nhận từ chối
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL THANH TOÁN TRUYỀN THỐNG (Khách Thuê) --- */}
      {isTraditionalPaymentModalOpen && selectedBillToPay && contract && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col items-center">
            <button
              onClick={() => setIsTraditionalPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-orange-500" />
              Thanh toán Hóa đơn tháng {selectedBillToPay.month}/{selectedBillToPay.year}
            </h2>
            <p className="text-sm text-gray-500 mb-6 text-center">Quét mã QR dưới đây để thanh toán. Hệ thống sẽ <strong className="text-green-600">tự động chốt hóa đơn</strong> ngay sau khi nhận được tiền.</p>
            
            {billQrData ? (
              <div className="flex flex-col items-center">
                <div className="p-2 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <img src={billQrData.qrUrl} alt="VietQR" className="w-64 h-64 object-contain rounded-xl" />
                </div>
                <div className="mt-6 space-y-2 text-center">
                  <p className="text-sm text-gray-500">Số tiền cần thanh toán:</p>
                  <p className="text-3xl font-black text-primary">{Number(billQrData.amount).toLocaleString('vi-VN')}đ</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg font-mono text-sm font-bold border border-orange-100">
                    Nội dung CK: {billQrData.addInfo}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            
            <div className="w-full mt-6 flex justify-center items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-green-500" />
              Đang chờ thanh toán tự động...
            </div>
          </div>
        </div>
      )}

      {/* ────── MODAL XÓA THÀNH VIÊN (PREMIUM) ────── */}
      {isRemovalOpen && selectedMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => !isUpdatingResident && setIsRemovalOpen(false)}
          />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-red-600 p-6 text-white text-center">
              <div className="flex items-center justify-between mb-2">
                <LogOut className="h-6 w-6" />
                <button onClick={() => setIsRemovalOpen(false)} disabled={isUpdatingResident}>
                  <XCircle className="h-6 w-6 opacity-70 hover:opacity-100" />
                </button>
              </div>
              <h2 className="text-xl font-bold">Xóa thành viên</h2>
              <p className="text-red-100 text-xs mt-1">Hành động này cần được chủ trọ phê duyệt.</p>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-2xl border border-gray-100">
                <img
                  src={selectedMember?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember?.id}`}
                  className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                  alt=""
                />
                <div>
                  <p className="font-bold text-gray-900">{selectedMember?.fullName}</p>
                  <p className="text-xs text-gray-500">Uy tín: {selectedMember?.reputationScore}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="det-rem-reason" className="text-xs font-bold uppercase text-gray-500">Lý do xóa thành viên</Label>
                <textarea
                  id="det-rem-reason"
                  placeholder="Nhập lý do chi tiết để chủ trọ dễ dàng phê duyệt..."
                  className="w-full min-h-[100px] p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none text-sm transition-all"
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  disabled={isUpdatingResident}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-bold"
                  onClick={() => setIsRemovalOpen(false)}
                  disabled={isUpdatingResident}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 h-12 rounded-xl gap-2 bg-red-600 hover:bg-red-700 text-white font-bold"
                  onClick={confirmRemoval}
                  isLoading={isUpdatingResident}
                >
                  Xác nhận xóa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────── MODAL QUYẾT TOÁN HỢP ĐỒNG (BLOCKCHAIN) ────── */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => !isSubmittingSettle && setIsSettleModalOpen(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white text-center">
              <LogOut className="h-10 w-10 mx-auto mb-2" />
              <h2 className="text-xl font-bold">Quyết toán Hợp đồng</h2>
              <p className="text-indigo-100 text-xs mt-1">Đề xuất khấu trừ tiền cọc on-chain</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Số tiền khấu trừ (VND)</Label>
                <Input 
                  type="number" 
                  placeholder="Nhập số tiền muốn giữ lại từ tiền cọc"
                  value={settleForm.deductionAmount}
                  onChange={(e) => setSettleForm({...settleForm, deductionAmount: Number(e.target.value)})}
                  max={contract?.depositAmount}
                />
                <p className="text-[10px] text-gray-500 italic">Tối đa: {contract?.depositAmount?.toLocaleString()}đ (Tổng tiền cọc)</p>
              </div>
              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="early-term" 
                  checked={settleForm.earlyTermination}
                  onChange={(e) => setSettleForm({...settleForm, earlyTermination: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="early-term" className="cursor-pointer">Chấm dứt hợp đồng trước hạn</Label>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-xs text-amber-800 leading-relaxed">
                <p className="font-bold flex items-center gap-1 mb-1"><AlertCircle className="w-3 h-3" /> Lưu ý quan trọng:</p>
                Sau khi bạn gửi đề xuất, Khách thuê cần <strong>ký xác nhận đồng ý</strong> trên Blockchain trước khi hợp đồng có thể kết thúc và tiền cọc được giải ngân.
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsSettleModalOpen(false)} disabled={isSubmittingSettle}>Hủy</Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleProposeSettlement} isLoading={isSubmittingSettle}>Gửi đề xuất</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────── MODAL THANH TOÁN CỌC VIETQR ────── */}

      {isDepositQrModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setIsDepositQrModalOpen(false)}
          />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col items-center">
            <button
              onClick={() => setIsDepositQrModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Thanh toán Tiền Cọc</h2>
            <p className="text-sm text-gray-500 mb-6 text-center">Quét mã QR dưới đây để thanh toán. Hệ thống sẽ <strong className="text-green-600">tự động kích hoạt</strong> hợp đồng ngay sau khi nhận được tiền.</p>
            
            {depositQrData ? (
              <div className="flex flex-col items-center">
                <div className="p-2 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <img src={depositQrData.qrUrl} alt="VietQR" className="w-64 h-64 object-contain rounded-xl" />
                </div>
                <div className="mt-6 space-y-2 text-center">
                  <p className="text-sm text-gray-500">Số tiền cọc:</p>
                  <p className="text-3xl font-black text-primary">{Number(depositQrData.amount).toLocaleString('vi-VN')}đ</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg font-mono text-sm font-bold border border-orange-100">
                    Nội dung CK: {depositQrData.addInfo}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            
            <div className="w-full mt-6 flex justify-center items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-green-500" />
              Đang chờ thanh toán...
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
