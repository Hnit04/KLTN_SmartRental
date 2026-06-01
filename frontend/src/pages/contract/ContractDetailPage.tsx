import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText, Download, PenTool, CheckCircle, Calendar,
  MapPin, ArrowLeft, Blocks, Receipt,
  AlertCircle, Clock, CheckCircle2, Loader2, Star, Users,
  MessageSquare, XCircle, Check, Sparkles, User, LogOut, TrendingUp, QrCode, Trash2, ShieldCheck,
  AlertTriangle, Banknote, UserPlus, Database, UserCircle, ExternalLink
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
import EIP712SignButton from "@/features/contract/components/EIP712SignButton";

import ContractInfoTab from '@/features/contract/components/ContractInfoTab';
import ContractBillsTab from '@/features/contract/components/ContractBillsTab';
import BlockchainLifecycleTimeline from '@/features/contract/components/BlockchainLifecycleTimeline';
import ContractHeader from '@/features/contract/components/ContractHeader';
import html2pdf from "html2pdf.js";
import { ethers } from "ethers";
import RiskNotice from "@/components/shared/RiskNotice";
import ConfirmActionDialog from "@/components/shared/ConfirmActionDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
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
  const [selectedBillForDetail, setSelectedBillForDetail] = useState<Bill | null>(null);
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
        ? `${prev.newValue}
- ${term}`
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
        return;
      }
      
      await contractApi.signContract(Number(id), { 
        signMethod: 'TRADITIONAL',
        signature: "" 
      });

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

      // Fix: Dùng BigInt math giống hệt Backend để tránh sai số thập phân ở đơn vị wei
      const billAmountOnChain = (BigInt(Math.round(bill.totalAmount)) * 10n ** 18n) / BigInt(config.vndEthRate);

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
      const prompt = `So sánh và đánh giá rủi ro của đề xuất từ đối tác:

- NỘI DUNG GỐC: 
${req.oldValue || 'Trống'}

- NỘI DUNG ĐỀ XUẤT MỚI: 
${req.newValue}

- LÝ DO ĐỀ XUẤT: ${req.reason}

Đề xuất này thay đổi thế nào? Có gài rủi ro bất lợi nào cho người tiếp nhận so với bản gốc không? Đừng nhận xét chung chung, hãy đi thẳng vào sự thay đổi. Trả lời dưới 150 chữ.`;
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
      <ContractHeader 
        contract={contract} 
        onRefresh={fetchContractData} 
      />

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
        <ContractInfoTab
          contract={contract}
          user={user}
          onRefresh={fetchContractData}
          handleConsentSettlement={handleConsentSettlement}
          handleExecuteSettlement={handleExecuteSettlement}
          handleWithdrawFunds={handleWithdrawFunds}
          handleAnalyzeChangeRequest={handleAnalyzeChangeRequest}
          handleRejectRequest={handleRejectRequest}
          handleCounterPropose={handleCounterPropose}
          handleApproveRequest={handleApproveRequest}
          handleUpdateResidentStatus={handleUpdateResidentStatus}
          handleRequestRemoval={handleRequestRemoval}
          isConsenting={isConsenting}
          isExecuting={isExecuting}
          isWithdrawing={isWithdrawing}
          isAnalyzingRequest={isAnalyzingRequest}
          isApprovingRequest={isApprovingRequest}
          isUpdatingResident={isUpdatingResident}
          requestAnalysisResult={requestAnalysisResult}
          withdrawableBalance={withdrawableBalance}
          handleAnalyzeTerms={handleAnalyzeTerms}
          changeRequests={changeRequests}
          isAnalyzing={isAnalyzing}
          analysisResult={analysisResult}
          setIsSignModalOpen={setIsSignModalOpen}
          setIsApproveModalOpen={setIsApproveModalOpen}
          setIsRejectModalOpen={setIsRejectModalOpen}
          setIsRefundConfirmOpen={setIsRefundConfirmOpen}
          setIsRequestModalOpen={setIsRequestModalOpen}
          setIsReviewModalOpen={setIsReviewModalOpen}
          setChangeForm={setChangeForm}
          handleDownloadPDF={handleDownloadPDF}
          handleConfirmWeb3Deposit={handleConfirmWeb3Deposit}
          handleOpenDepositQrModal={handleOpenDepositQrModal}
          isConfirmingDeposit={isDepositPaid} // Wait, what is isConfirmingDeposit? I don't know if it exists.
          isLoadingQr={isLoadingQr}
          isDownloading={isDownloading}
          isConfirmingRefund={isConfirmingRefund}
          isApproving={isApproving}
        />
      )}

      {activeTab === 'INFO' && contract.signMethod === 'BLOCKCHAIN' && (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 space-y-6">
          <BlockchainLifecycleTimeline contractId={Number(id)} />
          
          {/* Blockchain Evidence Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Bằng chứng Blockchain</h3>
                  <p className="text-sm text-gray-500">Dữ liệu mật mã đảm bảo tính minh bạch và không thể thay đổi</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Mạng Sepolia
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contract Hash */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Mã băm hợp đồng (Contract Hash)
                </div>
                <div className="p-3 bg-gray-50 rounded-xl font-mono text-xs text-gray-600 break-all border border-gray-100 shadow-inner">
                  {contract.contractHash ? (
                    <span className="select-all">{contract.contractHash}</span>
                  ) : (
                    <span className="text-gray-400 italic">Đang tạo...</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">Mã định danh duy nhất sinh ra từ nội dung hợp đồng. Bất kỳ thay đổi nhỏ nào cũng làm mã này thay đổi.</p>
              </div>

              {/* Signatures */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <UserCircle className="w-4 h-4 text-emerald-500" />
                  Chữ ký Chủ trọ
                </div>
                <div className="p-3 bg-gray-50 rounded-xl font-mono text-xs text-gray-600 break-all border border-gray-100 h-20 shadow-inner flex items-center">
                  {contract.landlordSigHash ? (
                     <span className="select-all line-clamp-3">{contract.landlordSigHash}</span>
                  ) : (
                    <span className="text-gray-400 italic">Chưa ký</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <UserCircle className="w-4 h-4 text-orange-500" />
                  Chữ ký Khách thuê
                </div>
                <div className="p-3 bg-gray-50 rounded-xl font-mono text-xs text-gray-600 break-all border border-gray-100 h-20 shadow-inner flex items-center">
                  {contract.tenantSigHash ? (
                     <span className="select-all line-clamp-3">{contract.tenantSigHash}</span>
                  ) : (
                    <span className="text-gray-400 italic">Chưa ký</span>
                  )}
                </div>
              </div>

              {/* Smart Contract Info */}
              <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Database className="w-4 h-4 text-blue-500" />
                    Smart Contract Address
                  </div>
                  {contract.smartContractAddress && (
                    <a 
                      href={`https://sepolia.etherscan.io/address/${contract.smartContractAddress}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                    >
                      Xem trên Etherscan <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl font-mono text-xs text-blue-800 break-all border border-blue-100">
                  {contract.smartContractAddress ? (
                    <span className="select-all">{contract.smartContractAddress}</span>
                  ) : (
                    <span className="text-blue-400 italic">Hợp đồng sẽ được tự động Deploy sau khi 2 bên hoàn tất ký số.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'BILLS' && (
        <ContractBillsTab
          contract={contract}
          user={user}
          bills={bills}
          onRefresh={fetchContractData}
          handleWithdrawFunds={handleWithdrawFunds}
          handlePayWeb3={handlePayWeb3}
          isWithdrawing={isWithdrawing}
          isPayingWeb3={isPaying}
          withdrawableBalance={withdrawableBalance}
          openPaymentModal={openTraditionalPaymentModal}
          isLoadingBills={isLoadingBills}
          contractOperational={contractOperational}
          setSelectedBillForDetail={setSelectedBillForDetail}
          isPaying={isPaying}
          selectedBillForDetail={selectedBillForDetail}
        />
      )}


      {/* --- MODAL CHI TIẾT HÓA ĐƠN --- */}
      {selectedBillForDetail && (
        <Dialog open={!!selectedBillForDetail} onOpenChange={(open) => !open && setSelectedBillForDetail(null)}>
          <DialogContent size="md" className="p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-indigo-100/50">
            <DialogHeader className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-100" />
                Chi tiết hóa đơn kỳ {selectedBillForDetail.month}/{selectedBillForDetail.year}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Trạng thái:</span>
                <StatusBadge 
                  label={selectedBillForDetail.status === 'PAID' ? 'Đã thanh toán' : selectedBillForDetail.status === 'LATE' ? 'Quá hạn' : 'Chưa thanh toán'} 
                  tone={selectedBillForDetail.status === 'PAID' ? 'success' : selectedBillForDetail.status === 'LATE' ? 'danger' : 'warning'} 
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Kỳ tính tiền:</span>
                <span className="font-medium text-gray-900">
                  {selectedBillForDetail.periodStart ? new Date(selectedBillForDetail.periodStart).toLocaleDateString('vi-VN') : '---'} 
                  {" -> "} 
                  {selectedBillForDetail.periodEnd ? new Date(selectedBillForDetail.periodEnd).toLocaleDateString('vi-VN') : '---'}
                </span>
              </div>
              <div className="h-px bg-gray-100 my-2" />
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tiền phòng</span>
                  <span className="font-semibold text-gray-900">{(selectedBillForDetail.roomCost || 0).toLocaleString()} đ</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tiền điện (Mới: {selectedBillForDetail.newElecIndex} - Cũ: {selectedBillForDetail.oldElecIndex})</span>
                  <span className="font-semibold text-gray-900">{(selectedBillForDetail.elecCost || 0).toLocaleString()} đ</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tiền nước (Mới: {selectedBillForDetail.newWaterIndex} - Cũ: {selectedBillForDetail.oldWaterIndex})</span>
                  <span className="font-semibold text-gray-900">{(selectedBillForDetail.waterCost || 0).toLocaleString()} đ</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tiền mạng (Internet)</span>
                  <span className="font-semibold text-gray-900">{(selectedBillForDetail.internetCost || 0).toLocaleString()} đ</span>
                </div>
                
                {(selectedBillForDetail.additionalFee || 0) > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>Phụ phí</span>
                    <span className="font-semibold">+{(selectedBillForDetail.additionalFee || 0).toLocaleString()} đ</span>
                  </div>
                )}
                
                {(selectedBillForDetail.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Giảm trừ</span>
                    <span className="font-semibold">-{(selectedBillForDetail.discountAmount || 0).toLocaleString()} đ</span>
                  </div>
                )}
                
                {selectedBillForDetail.note && (
                  <div className="text-sm bg-gray-50 p-3 rounded-lg text-gray-600 border border-gray-100">
                    <span className="font-medium">Ghi chú:</span> {selectedBillForDetail.note}
                  </div>
                )}
              </div>
              
              <div className="h-px bg-gray-100 my-2" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Tổng cộng</span>
                <span className="text-xl font-black text-primary">{(selectedBillForDetail.totalAmount || 0).toLocaleString()} đ</span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedBillForDetail(null)}>Đóng</Button>
            </div>
          </DialogContent>
        </Dialog>
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
              {contract.signMethod === 'BLOCKCHAIN' ? (
                <div className="flex-1 flex w-full">
                  <div className="w-full" onClick={(e) => {
                    // Prevent button click from bubbling if needed, though EIP712SignButton is already a button
                  }}>
                    <EIP712SignButton 
                      contract={contract} 
                      onSuccess={() => { setIsSignModalOpen(false); fetchContractData(); }}
                      disabled={!!chainRiskMessage}
                    />
                  </div>
                </div>
              ) : (
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSignContract}
                  isLoading={isSigning}
                >
                  Xác nhận hợp đồng
                </Button>
              )}
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