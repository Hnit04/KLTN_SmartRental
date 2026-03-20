import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FileText, Download, PenTool, CheckCircle, Calendar, 
  MapPin,  ArrowLeft, Blocks, Receipt,
  AlertCircle, Clock, CheckCircle2, Loader2, Star,
  MessageSquare, XCircle, Check, Sparkles, Home, User
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
}

export default function ContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSigning, setIsSigning] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
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

  const fetchContractData = async () => {
    setIsLoading(true);
    try {
      const contractRes = await contractApi.getDetail(Number(id));
      setContract(contractRes.data);

      try {
        const reqRes = await contractApi.getChangeRequests(Number(id));
        setChangeRequests((reqRes as any).data || reqRes);
      } catch (err) {
        console.log("Chưa có đề xuất nào hoặc lỗi tải lịch sử");
      }
    } catch (error) {
      toast.error("Không thể tải thông tin hợp đồng.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchContractData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setIsSigning(true);
    try {
      if (contract?.signMethod === 'BLOCKCHAIN') {
        if (!window.ethereum) {
          toast.error("Vui lòng cài đặt ví MetaMask để ký Smart Contract!");
          setIsSigning(false);
          return;
        }
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        toast.info("Đang gọi Web3 Provider...");
      }

      await contractApi.signContract(Number(id), { signMethod: contract?.signMethod || 'TRADITIONAL' });
      toast.success("Ký hợp đồng thành công!");
      setIsSignModalOpen(false);
      fetchContractData(); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi ký hợp đồng.");
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

      // Tính số ETH cần chuyển từ tỷ giá trong hóa đơn
      const exchangeRate = bill.exchangeRate || 80000000; // VND/ETH
      const ethAmount = (bill.totalAmount / exchangeRate).toFixed(18);
      const weiAmount = ethers.parseEther(ethAmount).toString();

      toast.info("Đang gọi Smart Contract...");

      // Kết nối Smart Contract và gọi hàm payExternalBill
      // Hàm này: Nhận tiền -> Chuyển thẳng cho chủ trọ -> Ghi log on-chain
      const smartContract = await getSmartContract(contract.smartContractAddress);
      const tx = await smartContract.payExternalBill(bill.id, { value: weiAmount });

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
                  <p className="text-gray-500 mb-1">Giá thuê & Tiền cọc</p>
                  <p className="font-bold text-primary">
                    {contract.actualPrice ? `${contract.actualPrice.toLocaleString()}đ` : "Đang cập nhật..."} 
                    <span className="text-gray-400 font-normal"> /tháng</span>
                  </p>
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
                      onClick={() => setIsRequestModalOpen(true)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" /> Đề xuất chỉnh sửa
                    </Button>
                  )}
                </div>
              )}

              {contract.status === 'ACTIVE' && user?.role === 'TENANT' && (
                <Button 
                  className="w-full mt-6 gap-2 h-11 bg-yellow-500 hover:bg-yellow-600 text-white shadow-md shadow-yellow-200" 
                  onClick={() => setIsReviewModalOpen(true)}
                >
                  <Star className="h-4 w-4 fill-white" /> Viết Đánh Giá
                </Button>
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
                          ) : (
                            user?.role === 'TENANT' && (
                              <Button size="sm" onClick={() => handlePayWeb3(bill)} isLoading={isPaying}>Thanh toán Web3</Button>
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
                <Label>Loại thay đổi</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={changeForm.type}
                  onChange={(e) => setChangeForm({...changeForm, type: e.target.value as RequestType, newValue: ''})}
                >
                  <option value="RENT_INCREASE">Điều chỉnh Giá thuê (VNĐ)</option>
                  <option value="EXTENSION">Gia hạn / Đổi ngày kết thúc</option>
                  <option value="CHANGE_TERMS">Thay đổi điều khoản khác</option>
                  <option value="CHANGE_SIGN_METHOD">Thay đổi Phương thức ký hợp đồng</option> 
                </select>
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
                ) : changeForm.type === 'EXTENSION' ? (
                  <Input 
                    type="date" 
                    className="mt-1"
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
                  
                  <p className="text-[11px] text-gray-400 text-center italic mt-3">
                      * Phương thức ký đã được chốt. Nếu muốn thay đổi, vui lòng đóng hộp thoại này và sử dụng tính năng "Đề xuất chỉnh sửa".
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
    </div>
  );
}