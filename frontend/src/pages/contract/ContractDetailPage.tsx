import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FileText, Download, PenTool, CheckCircle, Calendar, 
  MapPin,  ArrowLeft, Blocks, Receipt,
  AlertCircle, Clock, CheckCircle2, Loader2, Star,
  MessageSquare, XCircle, Check, Sparkles, Home, User, LogOut, TrendingUp, QrCode
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { contractApi } from "@/api/contractApi"; 
import { billApi } from "@/api/billApi"; 
import { ethers } from "ethers";
import { getSmartContract } from "@/utils/contractHelper";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import type { 
  Contract, 
  ContractSignMethod, 
  ContractChangeRequest, 
  RequestType 
} from "@/types";
import { useAuth } from "@/context/AuthContext"; 
import ReviewModal from "@/features/interaction/components/ReviewModal";
import html2pdf from "html2pdf.js";

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
}

export default function ContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSigning, setIsSigning] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  // --- TRADITIONAL PAYMENT STATE ---
  const [isTraditionalPaymentModalOpen, setIsTraditionalPaymentModalOpen] = useState(false);
  const [selectedBillToPay, setSelectedBillToPay] = useState<any>(null);
  const [isNotifyingPayment, setIsNotifyingPayment] = useState(false);

  const [signMethod, setSignMethod] = useState<ContractSignMethod>('TRADITIONAL');

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
  // Tự chỉnh sửa Điều khoản State
  const [isEditTermsModalOpen, setIsEditTermsModalOpen] = useState(false);
  const [editTermsContent, setEditTermsContent] = useState("");
  const [isUpdatingTerms, setIsUpdatingTerms] = useState(false);

  // Xác nhận thanh toán Cọc
  const [isDepositPaid, setIsDepositPaid] = useState(false);

  const [changeForm, setChangeForm] = useState<{type: RequestType, newValue: string, reason: string}>({
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
    };

    window.addEventListener('app:refresh-data', handleRefresh);
    return () => window.removeEventListener('app:refresh-data', handleRefresh);
  }, [id, activeTab, fetchContractData]);

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
      margin:       15,
      filename:     `HopDong_Phong_${contract?.roomName}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsDownloading(false);
      toast.success("Tải bản PDF thành công!");
    }).catch(() => {
      setIsDownloading(false);
      toast.error("Lỗi khi xuất PDF.");
    });
  };

  const handleSignContract = async () => {
    if (user?.role === 'TENANT' && contract?.signMethod === 'TRADITIONAL' && !isDepositPaid) {
      toast.warning("Vui lòng xác nhận đã thanh toán tiền cọc!");
      return;
    }

    setIsSigning(true);
    try {
      if (contract?.signMethod === 'BLOCKCHAIN') {
        if (!window.ethereum) {
          toast.error("Vui lòng cài đặt ví MetaMask để ký Smart Contract!");
          setIsSigning(false);
          return;
        }
        // Chuyển sang mạng Sepolia
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                nativeCurrency: { name: 'SepoliaETH', symbol: 'SEP', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              }],
            });
          } else { throw switchError; }
        }
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        toast.info("Đang ký hợp đồng trên Blockchain...");
      }

      // Gọi API ký hợp đồng (Backend sẽ deploy Smart Contract nếu cả 2 bên đã ký)
      const signResult = await contractApi.signContract(Number(id), { signMethod: contract?.signMethod || 'TRADITIONAL' });

      // Sau khi deploy thành công → Tenant đặt cọc on-chain qua hàm deposit()
      if (signResult.data?.smartContractAddress && user?.role === 'TENANT' && contract?.signMethod === 'BLOCKCHAIN') {
        try {
          toast.info("Smart Contract đã triển khai! Đang đặt cọc on-chain...");
          const smartContract = await getSmartContract(signResult.data.smartContractAddress);
          const depositAmount = BigInt(Math.round(signResult.data.depositAmount || contract?.depositAmount || 0));
          const tx = await smartContract.deposit({ value: depositAmount });
          toast.info(`Đang chờ xác nhận đặt cọc... (Hash: ${tx.hash.substring(0, 10)}...)`);
          await tx.wait();
          toast.success("Đặt cọc thành công trên Smart Contract!");
        } catch (depositError: any) {
          console.error("Lỗi đặt cọc on-chain:", depositError);
          toast.warning("Hợp đồng đã ký thành công nhưng đặt cọc on-chain thất bại. Vui lòng thử lại sau.");
        }
      }

      toast.success("Ký hợp đồng thành công!");
      setIsSignModalOpen(false);
      fetchContractData(); 
    } catch (error: any) {
      toast.error(error.reason || error.message || error.response?.data?.message || "Lỗi khi ký hợp đồng.");
    } finally {
      setIsSigning(false);
    }
  };

  const handlePayWeb3 = async (bill: any) => {
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
      // Yêu cầu chuyển sang mạng Sepolia
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: import.meta.env.VITE_BLOCKCHAIN_CHAIN_ID || '0xaa36a7',
                chainName: import.meta.env.VITE_BLOCKCHAIN_CHAIN_NAME || 'Sepolia Test Network',
                nativeCurrency: { name: 'SepoliaETH', symbol: 'SEP', decimals: 18 },
                rpcUrls: [import.meta.env.VITE_BLOCKCHAIN_RPC_URL || 'https://rpc.sepolia.org'],
                blockExplorerUrls: [import.meta.env.VITE_BLOCKCHAIN_EXPLORER_URL || 'https://sepolia.etherscan.io'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      // Kết nối MetaMask
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Dùng VND amount trực tiếp làm Wei (khớp với giá trị lưu trên Blockchain)
      const billAmountOnChain = BigInt(Math.round(bill.totalAmount));

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

  const openTraditionalPaymentModal = (bill: any) => {
    setSelectedBillToPay(bill);
    setIsTraditionalPaymentModalOpen(true);
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
    try {
      await contractApi.approveChangeRequest(reqId);
      toast.success("Đã phê duyệt yêu cầu. Hợp đồng đã được cập nhật!");
      fetchContractData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi phê duyệt.");
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

  if (isLoading) return <div className="py-20 flex justify-center"><LoadingSpinner /></div>;
  if (!contract) return <div className="text-center py-20">Không tìm thấy hợp đồng.</div>;

  const pendingRequest = changeRequests.find(req => req.status === 'PENDING');
  
  // ✅ KIỂM TRA TRẠNG THÁI KÝ
  const isMeSigned = user?.role === 'TENANT' ? contract.isTenantSigned : contract.isLandlordSigned;
  const isPartnerSigned = user?.role === 'TENANT' ? contract.isLandlordSigned : contract.isTenantSigned;

  const durationMonths = contract.endDate 
    ? (new Date(contract.endDate).getFullYear() - new Date(contract.startDate).getFullYear()) * 12 + (new Date(contract.endDate).getMonth() - new Date(contract.startDate).getMonth())
    : '...';

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Chi tiết hợp đồng</h1>
          <p className="text-sm text-gray-500">Mã hợp đồng: #{contract.id} • {contract.roomName}</p>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-xl border shadow-sm w-fit">
        <button 
          onClick={() => setActiveTab('INFO')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'INFO' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <FileText className="w-4 h-4" /> Thông tin & Hợp đồng
        </button>
        <button 
          onClick={() => setActiveTab('BILLS')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'BILLS' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Receipt className="w-4 h-4" /> 
          {user?.role === 'LANDLORD' ? 'Quản lý Hóa đơn' : 'Hóa đơn & Thanh toán'}
        </button>
      </div>

      {activeTab === 'INFO' && (
        <div className="grid md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="md:col-span-2 space-y-6">
            
            {pendingRequest && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm">
                <div className="flex gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-orange-800 text-lg">Đang có yêu cầu chỉnh sửa ({pendingRequest.type})</h4>
                        <p className="text-sm text-orange-700 mt-1 mb-3">
                          Lý do: <span className="italic font-semibold">"{pendingRequest.reason}"</span>
                        </p>
                      </div>
                      {user?.role !== pendingRequest.requestedByRole && (
                        <Button 
                          size="sm" 
                          className="bg-purple-600 hover:bg-purple-700 text-white shadow shadow-purple-200"
                          onClick={() => handleAnalyzeChangeRequest(pendingRequest)}
                          isLoading={isAnalyzingRequest}
                        >
                          <Sparkles className="w-4 h-4 mr-2" /> AI Soi Lỗi Đề Xuất
                        </Button>
                      )}
                    </div>
                    
                    {requestAnalysisResult && (
                      <div className="mb-4 p-4 bg-white border-2 border-purple-200 rounded-xl shadow-inner animate-in fade-in zoom-in-95">
                        <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                          <Bot className="h-4 w-4" /> AI Cảnh báo rủi ro:
                        </h4>
                        <div 
                          className="text-sm text-purple-950 leading-relaxed font-medium"
                          dangerouslySetInnerHTML={renderMarkdown(requestAnalysisResult)} 
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      <div className="bg-red-50/50 p-3 rounded-lg border border-red-200">
                        <p className="text-red-500 text-xs uppercase font-bold mb-1 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Bản gốc (Hủy bỏ)
                        </p>
                        <p className="text-gray-600 whitespace-pre-wrap line-through opacity-70">
                          {pendingRequest.oldValue || <span className="italic">Không có nội dung cũ</span>}
                        </p>
                      </div>
                      <div className="bg-green-50/50 p-3 rounded-lg border border-green-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-8 h-8 bg-green-200 rounded-bl-full opacity-30"></div>
                        <p className="text-green-600 text-xs uppercase font-bold mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đề xuất mới
                        </p>
                        <p className="font-bold text-green-900 whitespace-pre-wrap">
                          {pendingRequest.newValue}
                        </p>
                      </div>
                    </div>
                    
                    {user?.role !== pendingRequest.requestedByRole ? (
                      <div className="flex flex-wrap gap-3 mt-4">
                        <Button size="sm" onClick={() => handleApproveRequest(pendingRequest.id)} className="bg-green-600 hover:bg-green-700">
                          <Check className="w-4 h-4 mr-2" /> Chấp nhận
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleCounterPropose(pendingRequest)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                          <PenTool className="w-4 h-4 mr-2" /> Thương lượng lại
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRejectRequest(pendingRequest.id)} className="text-red-600 border-red-200 hover:bg-red-50">
                          <XCircle className="w-4 h-4 mr-2" /> Từ chối
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-orange-600 font-medium mt-4 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Yêu cầu đã gửi. Vui lòng chờ đối tác phản hồi...
                      </p>
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
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0"/> 
                    {contract.propertyAddress || "Đang cập nhật..."}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Thời hạn thuê</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400"/> 
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
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        contract.depositStatus === 'REFUNDED' ? 'bg-green-100 text-green-700 border-green-300' :
                        contract.depositStatus === 'PENALIZED' ? 'bg-red-100 text-red-700 border-red-300' :
                        contract.depositStatus === 'DEPOSITED' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                        'bg-gray-100 text-gray-600 border-gray-300'
                      }`}>
                        {contract.depositStatus === 'REFUNDED' ? '✅ Đã hoàn cọc' :
                         contract.depositStatus === 'PENALIZED' ? '⛔ Bị giữ cọc' :
                         contract.depositStatus === 'DEPOSITED' ? '💰 Đã đặt cọc' :
                         '⏳ Chưa đặt cọc'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {contract.additionalTerms && (() => {
              const terms = contract.additionalTerms;
              const hasSplit = terms.includes("--- NỘI QUY MẪU TỪ CHỦ TRỌ ---") && terms.includes("--- YÊU CẦU THÊM CỦA KHÁCH THUÊ ---");
              
              let landlordTerms = terms;
              let tenantRequests = "";
              
              if (hasSplit) {
                const parts = terms.split("--- YÊU CẦU THÊM CỦA KHÁCH THUÊ ---");
                landlordTerms = parts[0].replace("--- NỘI QUY MẪU TỪ CHỦ TRỌ ---", "").trim();
                tenantRequests = (parts[1] || "").trim();
              }

              return (
                <div className="bg-white rounded-2xl border shadow-sm relative overflow-hidden">
                  {/* Tieude va Nut AI */}
                  <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                      <AlertCircle className="h-5 w-5 text-gray-500" /> Điều khoản thỏa thuận thêm
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
                        <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                          <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-3">
                            <Home className="w-4 h-4" /> Nội quy từ Chủ Trọ
                          </h4>
                          <div className="text-sm text-blue-950 leading-relaxed whitespace-pre-wrap">
                            {landlordTerms || "Không có nội quy đặc biệt."}
                          </div>
                        </div>
                        <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-100">
                          <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-3">
                            <User className="w-4 h-4" /> Yêu cầu từ Khách Thuê
                          </h4>
                          <div className="text-sm text-orange-950 leading-relaxed whitespace-pre-wrap">
                            {tenantRequests || "Không có yêu cầu thêm."}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50/50 p-5 rounded-xl border border-gray-100">
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
                            <div className="bg-gray-50 p-2 rounded-lg">
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

            {changeRequests.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h3 className="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <Clock className="h-4 w-4 text-gray-500" /> Lịch sử Đề xuất chỉnh sửa
                </h3>
                <div className="space-y-4">
                  {changeRequests.map((req) => (
                    <div key={req.id} className="flex flex-col text-sm border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-gray-800">{req.type}</span> 
                          <span className="text-gray-500 ml-2">({new Date(req.requestDate).toLocaleDateString()})</span>
                          <span className="text-xs ml-2 px-2 py-0.5 bg-gray-100 rounded text-gray-600 border border-gray-200">
                            Gửi bởi: {req.requestedByRole === 'LANDLORD' ? 'Chủ nhà' : 'Khách thuê'}
                          </span>
                        </div>
                        <div>
                          {req.status === 'ACCEPTED' && <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Đã duyệt</span>}
                          {req.status === 'REJECTED' && <span className="text-red-500 font-bold flex items-center gap-1"><XCircle className="w-4 h-4"/> Đã từ chối</span>}
                          {req.status === 'PENDING' && <span className="text-orange-500 font-bold">Đang chờ</span>}
                        </div>
                      </div>
                      
                      <p className="text-gray-500 text-xs mb-2 italic">Lý do: "{req.reason}"</p>
                      
                      <div className="grid grid-cols-2 gap-3 mt-1 opacity-75 hover:opacity-100 transition-opacity">
                        <div className="bg-red-50/30 p-2.5 rounded-lg border border-red-100/50">
                          <p className="text-red-400 text-[10px] uppercase font-bold mb-1">Bản gốc</p>
                          <p className="text-gray-500 whitespace-pre-wrap line-through text-xs">
                            {req.oldValue || 'Không có'}
                          </p>
                        </div>
                        <div className="bg-green-50/30 p-2.5 rounded-lg border border-green-100/50">
                          <p className="text-green-500 text-[10px] uppercase font-bold mb-1">Đề xuất ({req.status === 'ACCEPTED' ? 'Đã áp dụng' : 'Bị từ chối'})</p>
                          <p className="font-medium text-gray-700 whitespace-pre-wrap text-xs">
                            {req.newValue}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
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
                    <a href={`${import.meta.env.VITE_BLOCKCHAIN_EXPLORER_URL || 'https://sepolia.etherscan.io'}/address/${contract.smartContractAddress}`} target="_blank" rel="noreferrer" className="font-mono text-indigo-900 hover:underline">
                      {contract.smartContractAddress.substring(0, 10)}...{contract.smartContractAddress.substring(38)}
                    </a>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-indigo-200/50 pb-2">
                    <span className="text-indigo-700">Tx Deploy Hash</span>
                    <a href={`${import.meta.env.VITE_BLOCKCHAIN_EXPLORER_URL || 'https://sepolia.etherscan.io'}/tx/${contract.deployTxHash}`} target="_blank" rel="noreferrer" className="font-mono text-indigo-900 hover:underline">
                      {contract.deployTxHash?.substring(0, 10)}...
                    </a>
                  </div>
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
                  onClick={async () => {
                    if (!window.confirm(`Xác nhận đã hoàn cọc ${contract.depositAmount?.toLocaleString('vi-VN')}đ cho khách thuê ${contract.tenantName}?`)) return;
                    try {
                      const res = await contractApi.confirmDepositRefund(contract.id);
                      setContract(prev => prev ? {...prev, depositStatus: (res as any).depositStatus || 'REFUNDED'} : prev);
                      toast.success('Đã xác nhận hoàn cọc thành công!');
                    } catch (err: any) {
                      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra!');
                    }
                  }}
                >
                  💸 Xác nhận đã hoàn cọc
                </Button>
              </div>
            )}

            {/* Khách thuê thấy trạng thái hoàn cọc */}
            {contract && (contract.status === 'EXPIRED' || contract.status === 'TERMINATED_EARLY') && user?.role === 'TENANT' && (
              <div className={`rounded-2xl border shadow-sm p-6 ${
                contract.depositStatus === 'REFUNDED' ? 'bg-green-50 border-green-200' :
                contract.depositStatus === 'PENALIZED' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
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
              
              {contract.status === 'ACTIVE' ? (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4 ring-4 ring-green-50">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-4 ring-4 ring-orange-50">
                  <PenTool className="h-10 w-10 text-orange-600" />
                </div>
              )}

              <p className="font-bold text-lg mb-1">
                {contract.status === 'ACTIVE' ? 'Đã có hiệu lực' : 'Đang chờ ký xác nhận'}
              </p>
              
              {contract.status !== 'ACTIVE' && (
                <div className="mt-6 space-y-3">
                  <div className="flex flex-col gap-2 text-sm text-left bg-gray-50/50 p-4 rounded-xl border border-gray-100 mb-4">
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

                  {!isMeSigned ? (
                    <Button 
                      className="w-full gap-2 h-11 shadow-md shadow-blue-500/20" 
                      onClick={() => setIsSignModalOpen(true)}
                      disabled={!!pendingRequest}
                    >
                      <PenTool className="h-4 w-4" /> Ký xác nhận
                    </Button>
                  ) : (
                    !isPartnerSigned && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang chờ đối tác ký...
                      </div>
                    )
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
                  {!pendingRequest && (
                    <Button 
                      variant="outline" 
                      className="w-full h-11 border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        setChangeForm(prev => ({ ...prev, type: user?.role === 'TENANT' ? 'TERMINATION' : 'EXTENSION', newValue: '' }));
                        setIsRequestModalOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" /> Đề xuất Cập nhật / Ra đi
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
          </div>
        </div>
      )}
      
      {activeTab === 'BILLS' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
           <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><Receipt className="text-primary w-5 h-5"/> Lịch sử Hóa đơn</h2>
             </div>
           </div>
           
           <div className="p-6">
              {isLoadingBills ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
              ) : bills.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">Chưa có hóa đơn nào.</div>
              ) : (
                <div className="space-y-4">
                  {bills.map((bill: any) => (
                    <div key={bill.id} className="flex justify-between items-center p-4 border rounded-xl bg-white">
                       <div>
                             <h4 className="font-bold text-gray-900">Kỳ tháng {bill.month}/{bill.year}</h4>
                             <p className="text-sm text-gray-500 mt-1">Hạn chót: {new Date(bill.deadline).toLocaleDateString()}</p>
                       </div>
                       <div className="text-right flex items-center gap-4">
                          <p className="text-xl font-black text-primary">{(bill.totalAmount).toLocaleString()}đ</p>
                          {bill.status === 'PAID' ? (
                            <span className="text-green-600 font-bold text-sm">Đã thu</span>
                          ) : bill.status === 'PENDING' ? (
                            <span className="text-orange-600 font-bold text-sm bg-orange-50 px-3 py-1 rounded-full border border-orange-200">Chờ xác nhận</span>
                          ) : (
                            user?.role === 'TENANT' && (
                              contract.signMethod === 'BLOCKCHAIN' ? (
                                <Button size="sm" onClick={() => handlePayWeb3(bill)} isLoading={isPaying}>Thanh toán Web3</Button>
                              ) : (
                                <Button size="sm" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => openTraditionalPaymentModal(bill)}>Thanh toán C.Khoản</Button>
                              )
                            )
                          )}
                       </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      )}

      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-500" /> Đề xuất chỉnh sửa
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 font-bold mb-3 block">Bạn muốn đề xuất điều gì?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { type: 'EXTENSION', label: user?.role === 'LANDLORD' ? 'Gia hạn Hợp đồng' : 'Xin gia hạn Hợp đồng', desc: 'Đề xuất đổi ngày kết thúc', icon: <Calendar className="w-5 h-5"/>, color: 'text-blue-600 bg-blue-50 border-blue-200 ring-blue-500', hidden: contract.status !== 'ACTIVE' },
                    { type: 'TERMINATION', label: user?.role === 'LANDLORD' ? 'Lấy lại phòng trước hạn' : 'Xin trả phòng trước hạn', desc: 'Chấm dứt hợp đồng sớm', icon: <LogOut className="w-5 h-5"/>, color: 'text-red-600 bg-red-50 border-red-200 ring-red-500', hidden: contract.status !== 'ACTIVE' },
                    { type: 'RENT_INCREASE', label: contract.status === 'ACTIVE' ? 'Điều chỉnh Giá thuê' : 'Thương lượng Giá thuê', desc: contract.status === 'ACTIVE' ? 'Đề xuất tăng/giảm giá' : 'Thương thảo lại giá', icon: <TrendingUp className="w-5 h-5"/>, color: 'text-orange-600 bg-orange-50 border-orange-200 ring-orange-500', hidden: contract.status === 'ACTIVE' && user?.role === 'TENANT' },
                    { type: 'CHANGE_TERMS', label: contract.status === 'ACTIVE' ? (user?.role === 'LANDLORD' ? 'Thay đổi Nội quy' : 'Xin thay đổi Nội quy') : 'Thương lượng Điều khoản', desc: 'Thêm bớt điều khoản', icon: <FileText className="w-5 h-5"/>, color: 'text-green-600 bg-green-50 border-green-200 ring-green-500' },
                    { type: 'CHANGE_SIGN_METHOD', label: 'Sửa cách ký', desc: 'Đổi phương thức ký', icon: <PenTool className="w-5 h-5"/>, color: 'text-purple-600 bg-purple-50 border-purple-200 ring-purple-500', hidden: contract.status === 'ACTIVE' }
                  ].filter(opt => !opt.hidden).map((opt) => (
                    <div 
                      key={opt.type}
                      onClick={() => setChangeForm({...changeForm, type: opt.type as RequestType, newValue: ''})}
                      className={`cursor-pointer rounded-xl p-3 border-2 transition-all flex flex-col items-center text-center gap-1 
                        ${changeForm.type === opt.type ? `ring-2 ring-offset-1 ${opt.color} shadow-sm` : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'}`}
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

              <div>
                <Label>Giá trị mới đề xuất</Label>
                
                {changeForm.type === 'CHANGE_SIGN_METHOD' ? (
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={changeForm.newValue}
                    onChange={(e) => setChangeForm({...changeForm, newValue: e.target.value})}
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
                    onChange={(e) => setChangeForm({...changeForm, newValue: e.target.value})}
                  />
                ) : (changeForm.type === 'EXTENSION' || changeForm.type === 'TERMINATION') ? (
                  <Input 
                    type="date" 
                    className="mt-1"
                    min={new Date().toISOString().split('T')[0]}
                    value={changeForm.newValue}
                    onChange={(e) => setChangeForm({...changeForm, newValue: e.target.value})}
                  />
                ) : (
                  <div className="space-y-3 mt-1">
                    <div className="flex flex-wrap gap-2">
                      {(user?.role === 'LANDLORD' ? LANDLORD_SUGGESTED_TERMS : TENANT_SUGGESTED_TERMS).map((term, idx) => {
                          const isAdded = changeForm.newValue.includes(term);
                          return (
                              <span
                                  key={idx}
                                  onClick={() => !isAdded && handleAddTerm(term)}
                                  className={`text-[11px] px-3 py-1.5 rounded-full transition-all shadow-sm flex items-center gap-1 border ${
                                      isAdded 
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
                      className="flex w-full rounded-xl border border-input bg-gray-50/50 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[150px] resize-y placeholder:text-gray-400"
                      value={changeForm.newValue}
                      onChange={(e) => setChangeForm({...changeForm, newValue: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Lý do đề xuất</Label>
                <textarea 
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 min-h-[80px]"
                  placeholder="Giải thích lý do bạn muốn thay đổi..."
                  value={changeForm.reason}
                  onChange={(e) => setChangeForm({...changeForm, reason: e.target.value})}
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

      {/* ✅ GIAO DIỆN KHÓA CỨNG PHƯƠNG THỨC KÝ TRONG MODAL */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <h2 className="text-xl font-bold mb-2">Xác nhận ký Hợp đồng</h2>
              <p className="text-sm text-gray-500 mb-6">Bạn đang ký hợp đồng cho phòng <span className="font-bold text-gray-800">{contract.roomName}</span>.</p>

              <div className="space-y-3 mb-8">
                  {contract.signMethod === 'BLOCKCHAIN' ? (
                      <div className="flex gap-4 p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50/50">
                          <div className="mt-1 shrink-0 text-indigo-600">
                              <CheckCircle className="h-6 w-6 fill-indigo-100" />
                          </div>
                          <div>
                              <h4 className="font-bold text-sm flex items-center gap-2 text-indigo-900">
                                  Ký bằng Smart Contract <Blocks className="h-4 w-4 text-indigo-500"/>
                                  <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full ml-1">Đã chốt</span>
                              </h4>
                              <p className="text-xs text-gray-500 mt-1 leading-relaxed">Sử dụng MetaMask để xác nhận giao dịch và lưu trên mạng lưới Sepolia.</p>
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
                                  <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full ml-2">Đã chốt</span>
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                  Kích hoạt ngay bằng cách xác nhận đồng ý các điều khoản trên hệ thống. Không dùng Web3.
                              </p>
                          </div>
                      </div>
                  )}

                  {/* Phần yêu cầu thanh toán cọc cho KHÁCH THUÊ */}
                  {user?.role === 'TENANT' && contract.depositStatus !== 'DEPOSITED' && (
                    <div className="mt-4 p-4 rounded-xl border-2 border-orange-200 bg-orange-50 space-y-3">
                       <h4 className="font-bold text-orange-900 flex items-center gap-2">
                         💰 Cần Thanh toán Cọc: {contract.depositAmount?.toLocaleString()}đ
                       </h4>
                       {contract.signMethod === 'BLOCKCHAIN' ? (
                         <p className="text-xs text-orange-800 leading-relaxed">
                           Khi bấm "Ký Web3 ngay", MetaMask sẽ yêu cầu bạn chuyển khoản trực tiếp khoản Tiền cọc tương đương <strong>{((contract.depositAmount || 0) / 80000000).toFixed(4)} ETH</strong> tới ví của Chủ trọ để làm bằng chứng xác nhận ký.
                         </p>
                       ) : (
                         <div className="space-y-3">
                           <p className="text-xs text-orange-800 font-medium">Bạn vui lòng chuyển khoản cọc theo thông tin sau và xác nhận bên dưới:</p>
                           <div className="bg-white p-3 rounded-lg border border-orange-200 text-xs shadow-sm flex gap-4 items-center">
                             {contract.landlordBankQrUrl && (
                               <div className="shrink-0 relative group rounded-lg overflow-hidden border border-gray-100 shadow-sm w-24 h-24">
                                 <img 
                                   src={contract.landlordBankQrUrl} 
                                   alt="Mã QR Thanh Toán" 
                                   className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                 />
                               </div>
                             )}
                             <div className="flex-1">
                               <p className="text-gray-500 mb-1 uppercase font-bold text-[10px]">Tài khoản thụ hưởng</p>
                               <p className="font-bold text-gray-800">{contract.landlordBankName || 'Đang cập nhật'}</p>
                               <p className="font-mono text-lg text-primary my-1">{contract.landlordBankAccountNumber || 'Chưa cung cấp STK'}</p>
                               <p className="font-semibold text-gray-700">{contract.landlordBankAccountHolder || contract.landlordName}</p>
                             </div>
                           </div>
                           <label className="flex items-start gap-2 cursor-pointer mt-2 group bg-white/50 p-2 rounded border border-orange-200/50">
                              <input 
                                type="checkbox" 
                                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer" 
                                checked={isDepositPaid} 
                                onChange={(e) => setIsDepositPaid(e.target.checked)} 
                              />
                              <span className="text-xs text-gray-800 font-bold group-hover:text-black">
                                Tôi xác nhận đã chuyển khoản thành công Tiền cọc trên.
                              </span>
                           </label>
                         </div>
                       )}
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
                  >
                      {contract.signMethod === 'BLOCKCHAIN' ? 'Ký Web3 ngay' : 'Xác nhận ngay'}
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

                <div className="space-y-2">
                    <p><strong>Điều 3: Các thỏa thuận bổ sung / Nội quy phòng trọ</strong></p>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-md whitespace-pre-wrap italic">
                        {contract.additionalTerms || "Không có thỏa thuận bổ sung nào khác."}
                    </div>
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

      {/* --- MODAL THANH TOÁN TRUYỀN THỐNG (Khách Thuê) --- */}
      {isTraditionalPaymentModalOpen && selectedBillToPay && contract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
              <Receipt className="h-5 w-5 text-orange-500" />
              Thanh toán Hóa đơn tháng {selectedBillToPay.month}/{selectedBillToPay.year}
            </h2>
            
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 mb-6 relative overflow-hidden group">
              {contract.landlordBankQrUrl ? (
                <div className="mb-4 flex justify-center">
                  <img src={contract.landlordBankQrUrl} alt="Mã QR Chuyển Khoản" className="w-40 h-40 object-contain rounded-lg shadow-sm border border-orange-200 bg-white p-2" />
                </div>
              ) : (
                <div className="absolute top-0 right-0 p-2 opacity-10"><QrCode className="h-24 w-24 text-orange-600" /></div>
              )}
              <p className="text-sm text-orange-800 font-medium mb-2">Thông tin tài khoản ngân hàng của Chủ trọ:</p>
              <div className="space-y-1 relative z-10">
                <p className="text-xs text-gray-500">Ngân hàng:</p>
                <p className="font-bold text-gray-900">{contract.landlordBankName || "Chưa cập nhật"}</p>
                <p className="text-xs text-gray-500 mt-2">Số tài khoản:</p>
                <p className="font-mono text-xl font-bold tracking-wider text-orange-700 bg-white inline-block px-2 py-1 rounded border border-orange-200">{contract.landlordBankAccountNumber || "Chưa cập nhật"}</p>
                <p className="text-xs text-gray-500 mt-2">Chủ tài khoản:</p>
                <p className="font-bold text-gray-900 uppercase">{contract.landlordBankAccountHolder || "Chưa cập nhật"}</p>
                
                <div className="pt-3 mt-3 border-t border-orange-200/50">
                    <p className="text-xs text-gray-500">Số tiền cần chuyển:</p>
                    <p className="text-2xl font-black text-red-600">{Number(selectedBillToPay.totalAmount).toLocaleString('vi-VN')}đ</p>
                    <p className="text-xs text-gray-500 mt-2">Nội dung chuyển khoản (gợi ý):</p>
                    <p className="font-mono text-sm bg-white p-2 rounded text-gray-800 border border-orange-100 font-medium">THANH TOAN TIEN PHONG {contract.roomName} THANG {selectedBillToPay.month}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={() => setIsTraditionalPaymentModalOpen(false)}>Quay lại</Button>
              <Button 
                onClick={handleNotifyTraditionalPayment} 
                isLoading={isNotifyingPayment}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Tôi đã chuyển khoản thành công
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}