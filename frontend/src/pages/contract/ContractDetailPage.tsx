import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FileText, Download, PenTool, CheckCircle, Calendar, 
  MapPin, Printer, ArrowLeft, Blocks, Receipt, Wallet, 
  AlertCircle, Clock, CheckCircle2, Loader2, Star,
  MessageSquare, XCircle, Check
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { contractApi } from "@/api/contractApi"; 
import { billApi } from "@/api/billApi"; 
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import type { 
  Contract, 
  ContractSignMethod, 
  ContractChangeRequest, 
  RequestType 
} from "@/types";
import { useAuth } from "@/context/AuthContext"; 
import ReviewModal from "@/features/interaction/components/ReviewModal";

interface ContractDetail extends Contract {
  roomName?: string;
  propertyAddress?: string;
  landlordName?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantCccd?: string;
  additionalTerms?: string; 
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

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [changeRequests, setChangeRequests] = useState<ContractChangeRequest[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [changeForm, setChangeForm] = useState<{type: RequestType, newValue: string, reason: string}>({
    type: 'RENT_INCREASE',
    newValue: '',
    reason: ''
  });

  // ✅ DANH SÁCH GỢI Ý ĐIỀU KHOẢN THEO ROLE (Copy từ CreateContractPage)
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

  // ✅ HÀM XỬ LÝ CLICK GỢI Ý
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

  const handleSignContract = async () => {
    setIsSigning(true);
    try {
      if (signMethod === 'BLOCKCHAIN') {
        if (!window.ethereum) {
          toast.error("Vui lòng cài đặt ví MetaMask để ký Smart Contract!");
          return;
        }
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        toast.info("Đang gọi Web3 Provider...");
      }

      await contractApi.signContract(Number(id), { signMethod });
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
    setIsPaying(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const senderAddress = accounts[0];

      const ethAmount = (bill.totalAmount / 80000000).toFixed(6); 
      const weiAmount = '0x' + (parseFloat(ethAmount) * 1e18).toString(16);

      const targetAddress = contract?.smartContractAddress || '0x0000000000000000000000000000000000000000'; 
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: senderAddress, to: targetAddress, value: weiAmount }],
      });

      toast.success(`Giao dịch đã được gửi! Hash: ${txHash.substring(0, 10)}...`);
      const res = await billApi.getBillsByContract(Number(id));
      setBills(res.data);
    } catch (error: any) {
      toast.error(error.message || "Thanh toán bị hủy hoặc thất bại.");
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

  if (isLoading) return <div className="py-20 flex justify-center"><LoadingSpinner /></div>;
  if (!contract) return <div className="text-center py-20">Không tìm thấy hợp đồng.</div>;

  const pendingRequest = changeRequests.find(req => req.status === 'PENDING');

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
                    <h4 className="font-bold text-orange-800 text-lg">Đang có yêu cầu chỉnh sửa</h4>
                    <p className="text-sm text-orange-700 mt-1 mb-3">
                      Lý do: <span className="italic">"{pendingRequest.reason}"</span>
                    </p>
                    <div className="flex items-center gap-6 text-sm bg-white p-3 rounded-lg border border-orange-100 w-fit">
                      <div>
                        <p className="text-gray-500 text-xs uppercase font-bold">Loại yêu cầu</p>
                        <p className="font-semibold text-gray-900">{pendingRequest.type}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase font-bold">Giá trị mới đề xuất</p>
                        <p className="font-bold text-primary whitespace-pre-wrap">{pendingRequest.newValue}</p>
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

            {contract.additionalTerms && (
              <div className="bg-yellow-50/80 rounded-2xl border border-yellow-200 shadow-sm p-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-5 w-5 text-yellow-600" /> Điều khoản thỏa thuận thêm
                </h3>
                <div className="text-sm text-yellow-900 whitespace-pre-wrap leading-relaxed bg-white/60 p-4 rounded-xl border border-yellow-100/50">
                  {contract.additionalTerms}
                </div>
              </div>
            )}

            {changeRequests.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h3 className="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <Clock className="h-4 w-4 text-gray-500" /> Lịch sử Đề xuất chỉnh sửa
                </h3>
                <div className="space-y-3">
                  {changeRequests.map((req) => (
                    <div key={req.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                      <div>
                        <span className="font-medium">{req.type}</span> 
                        <span className="text-gray-500 ml-2">({new Date(req.requestDate).toLocaleDateString()})</span>
                        <span className="text-xs ml-2 px-2 py-0.5 bg-gray-100 rounded text-gray-600 border border-gray-200">
                          Gửi bởi: {req.requestedByRole === 'LANDLORD' ? 'Chủ nhà' : 'Khách thuê'}
                        </span>
                      </div>
                      <div>
                        {req.status === 'ACCEPTED' && <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Đã duyệt</span>}
                        {req.status === 'REJECTED' && <span className="text-red-600 font-bold flex items-center gap-1"><XCircle className="w-4 h-4"/> Đã từ chối</span>}
                        {req.status === 'PENDING' && <span className="text-orange-600 font-bold">Đang chờ</span>}
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
                    <a href={`https://sepolia.etherscan.io/address/${contract.smartContractAddress}`} target="_blank" rel="noreferrer" className="font-mono text-indigo-900 hover:underline">
                      {contract.smartContractAddress.substring(0, 10)}...{contract.smartContractAddress.substring(38)}
                    </a>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-indigo-200/50 pb-2">
                    <span className="text-indigo-700">Tx Deploy Hash</span>
                    <a href={`https://sepolia.etherscan.io/tx/${contract.deployTxHash}`} target="_blank" rel="noreferrer" className="font-mono text-indigo-900 hover:underline">
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
                  <Button 
                    className="w-full gap-2 h-11" 
                    onClick={() => setIsSignModalOpen(true)}
                    disabled={!!pendingRequest}
                  >
                    <PenTool className="h-4 w-4" /> Ký Hợp Đồng Ngay
                  </Button>
                  
                  {!pendingRequest && (
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
            
            <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-white">
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

      {/* ==================== MODAL: GỬI ĐỀ XUẤT ==================== */}
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
                </select>
              </div>

              <div>
                <Label>Giá trị mới đề xuất</Label>
                {changeForm.type === 'RENT_INCREASE' ? (
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
                  // ✅ GIAO DIỆN MỚI CÓ TAGS CHỌN ĐIỀU KHOẢN
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

      {/* ==================== MODAL: KÝ HỢP ĐỒNG ==================== */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <h2 className="text-xl font-bold mb-2">Xác nhận ký Hợp đồng</h2>
              <p className="text-sm text-gray-500 mb-6">Bạn đang ký hợp đồng cho phòng <span className="font-bold text-gray-800">{contract.roomName}</span>.</p>

              <div className="space-y-3 mb-8">
                  <div 
                      className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${signMethod === 'BLOCKCHAIN' ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200'}`}
                      onClick={() => setSignMethod("BLOCKCHAIN")}
                  >
                      <div className={`mt-1 shrink-0 ${signMethod === 'BLOCKCHAIN' ? 'text-indigo-600' : 'text-gray-300'}`}>
                          {signMethod === 'BLOCKCHAIN' ? <CheckCircle className="h-6 w-6 fill-indigo-100" /> : <div className="h-6 w-6 rounded-full border-2" />}
                      </div>
                      <div>
                          <h4 className={`font-bold text-sm flex items-center gap-2 ${signMethod === 'BLOCKCHAIN' ? 'text-indigo-900' : 'text-gray-900'}`}>
                             Ký bằng Smart Contract <Blocks className="h-4 w-4 text-indigo-500"/>
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">Sử dụng MetaMask.</p>
                      </div>
                  </div>

                  <div 
                      className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${signMethod === 'TRADITIONAL' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'}`}
                      onClick={() => setSignMethod("TRADITIONAL")}
                  >
                      <div className={`mt-1 shrink-0 ${signMethod === 'TRADITIONAL' ? 'text-blue-600' : 'text-gray-300'}`}>
                          {signMethod === 'TRADITIONAL' ? <CheckCircle className="h-6 w-6 fill-blue-100" /> : <div className="h-6 w-6 rounded-full border-2" />}
                      </div>
                      <div>
                          <h4 className={`font-bold text-sm ${signMethod === 'TRADITIONAL' ? 'text-blue-700' : 'text-gray-900'}`}>Xác nhận điện tử (Nhanh)</h4>
                          <p className="text-xs text-gray-500 mt-1">
                             Kích hoạt ngay bằng cách xác nhận đồng ý điều khoản. Không lưu hash.
                          </p>
                      </div>
                  </div>
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
                      {signMethod === 'BLOCKCHAIN' ? 'Ký Web3 ngay' : 'Xác nhận ngay'}
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
    </div>
  );
}