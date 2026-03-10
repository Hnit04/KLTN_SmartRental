import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FileText, Download, PenTool, CheckCircle, Calendar, 
  MapPin, Printer, ArrowLeft, Blocks, Receipt, Wallet, 
  AlertCircle, Clock, CheckCircle2, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { contractApi } from "@/api/contractApi"; 
import { billApi } from "@/api/billApi"; 
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import type { Contract, ContractSignMethod } from "@/types";
import { useAuth } from "@/context/AuthContext"; 

// Interface mở rộng để hứng dữ liệu chi tiết
interface ContractDetail extends Contract {
  roomName?: string;
  propertyAddress?: string;
  landlordName?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantCccd?: string;
}

export default function ContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // --- STATE CŨ ---
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State xử lý Ký
  const [isSigning, setIsSigning] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signMethod, setSignMethod] = useState<ContractSignMethod>('TRADITIONAL');

  // --- STATE MỚI (HƯỚNG 2) ---
  const [activeTab, setActiveTab] = useState<'INFO' | 'BILLS'>('INFO');
  const [bills, setBills] = useState<any[]>([]);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // 1. Lấy chi tiết hợp đồng
  useEffect(() => {
    const fetchContractDetail = async () => {
      try {
        // Đã sửa từ getContractById thành getDetail theo API của bạn
        const res = await contractApi.getDetail(Number(id));
        setContract(res.data);
      } catch (error) {
        toast.error("Không thể tải thông tin hợp đồng.");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchContractDetail();
  }, [id]);

  // 2. Lấy danh sách hóa đơn (Chỉ gọi khi bấm sang Tab Hóa đơn)
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

  // 3. Xử lý ký hợp đồng
  const handleSignContract = async () => {
    setIsSigning(true);
    try {
      if (signMethod === 'BLOCKCHAIN') {
        if (!window.ethereum) {
          toast.error("Vui lòng cài đặt ví MetaMask để ký Smart Contract!");
          setIsSigning(false);
          return;
        }
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        toast.info("Đang gọi Web3 Provider...");
      }

      // Đã sửa cú pháp truyền dữ liệu theo API signContract
      await contractApi.signContract(Number(id), { signMethod });
      
      toast.success("Ký hợp đồng thành công!");
      setIsSignModalOpen(false);
      
      // Tải lại thông tin hợp đồng sau khi ký
      const res = await contractApi.getDetail(Number(id));
      setContract(res.data);
    } catch (error) {
      toast.error("Lỗi khi ký hợp đồng.");
    } finally {
      setIsSigning(false);
    }
  };

  // 4. Xử lý thanh toán qua Web3 (MetaMask)
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
        params: [{
          from: senderAddress,
          to: targetAddress,
          value: weiAmount, 
        }],
      });

      toast.success(`Giao dịch đã được gửi! Hash: ${txHash.substring(0, 10)}...`);
      
      // await billApi.payBillWeb3(bill.id, txHash);
      
      const res = await billApi.getBillsByContract(Number(id));
      setBills(res.data);

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Thanh toán bị hủy hoặc thất bại.");
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) return <div className="py-20 flex justify-center"><LoadingSpinner /></div>;
  if (!contract) return <div className="text-center py-20">Không tìm thấy hợp đồng.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Chi tiết hợp đồng</h1>
          <p className="text-sm text-gray-500">Mã hợp đồng: #{contract.id} • {contract.roomName}</p>
        </div>
      </div>

      {/* --- MENU TABS --- */}
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
          <Receipt className="w-4 h-4" /> Hóa đơn & Thanh toán
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: THÔNG TIN HỢP ĐỒNG */}
      {/* ==================================================== */}
      {activeTab === 'INFO' && (
        <div className="grid md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="md:col-span-2 space-y-6">
            {/* THÔNG TIN CƠ BẢN */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Thông tin cơ bản
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Khu trọ / Địa chỉ</p>
                  <p className="font-semibold flex items-start gap-1"><MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0"/> {contract.propertyAddress || "Đang cập nhật..."}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Thời hạn thuê</p>
                  <p className="font-semibold flex items-center gap-1"><Calendar className="w-4 h-4 text-gray-400"/> {contract.startDate} - {contract.endDate}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Người thuê</p>
                  <p className="font-semibold">{contract.tenantName || "Đang cập nhật..."}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Đại diện cho thuê</p>
                  <p className="font-semibold">{contract.landlordName || "Đang cập nhật..."}</p>
                </div>
              </div>
            </div>

            {/* BLOCKCHAIN INFO */}
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
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-indigo-700">Mã băm (Contract Hash)</span>
                    <span className="font-mono text-indigo-900 truncate max-w-[200px]" title={contract.contractHash}>
                      {contract.contractHash || 'Đang chờ ký...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* TRẠNG THÁI KÝ & CỌC */}
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

              <p className="font-bold text-lg mb-1">{contract.status === 'ACTIVE' ? 'Đã có hiệu lực' : 'Đang chờ ký xác nhận'}</p>
              
              {contract.status !== 'ACTIVE' && user?.role === 'TENANT' && (
                <Button className="w-full mt-6 gap-2 h-11" onClick={() => setIsSignModalOpen(true)}>
                  <PenTool className="h-4 w-4" /> Ký Hợp Đồng Ngay
                </Button>
              )}
            </div>
            
            <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-white">
              <Download className="w-4 h-4 text-gray-500" /> Tải bản PDF
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-white">
              <Printer className="w-4 h-4 text-gray-500" /> In hợp đồng
            </Button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: HÓA ĐƠN & THANH TOÁN */}
      {/* ==================================================== */}
      {activeTab === 'BILLS' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
           <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><Receipt className="text-primary w-5 h-5"/> Lịch sử Hóa đơn</h2>
                <p className="text-sm text-gray-500 mt-1">Quản lý và thanh toán các khoản phí hàng tháng.</p>
             </div>
           </div>
           
           <div className="p-6">
              {isLoadingBills ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
              ) : bills.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Chưa có hóa đơn nào cho hợp đồng này.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bills.map((bill: any) => (
                    <div key={bill.id} className="flex flex-col md:flex-row items-center justify-between p-4 border rounded-xl hover:shadow-md transition-shadow bg-white">
                       <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${bill.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                             <Calendar className="w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="font-bold text-gray-900 text-lg">Kỳ tháng {bill.month}/{bill.year}</h4>
                             <div className="flex items-center gap-3 text-sm mt-1">
                               {bill.status === 'PAID' ? (
                                 <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle2 className="w-4 h-4"/> Đã thu</span>
                               ) : bill.status === 'LATE' ? (
                                 <span className="flex items-center gap-1 text-red-600 font-semibold"><AlertCircle className="w-4 h-4"/> Trễ hạn</span>
                               ) : (
                                 <span className="flex items-center gap-1 text-orange-600 font-semibold"><Clock className="w-4 h-4"/> Chờ thanh toán</span>
                               )}
                               <span className="text-gray-400">|</span>
                               <span className="text-gray-500">Hạn chót: {new Date(bill.deadline).toLocaleDateString('vi-VN')}</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                          <div className="text-left md:text-right">
                             <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Tổng tiền</p>
                             <p className="text-xl font-black text-primary">{(bill.totalAmount).toLocaleString('vi-VN')}đ</p>
                          </div>
                          
                          {/* Xử lý hiển thị Nút thanh toán theo Role */}
                          {bill.status === 'PAID' ? (
                            <Button variant="outline" className="gap-2">
                               <Printer className="w-4 h-4" /> Xem biên lai
                            </Button>
                          ) : (
                            user?.role === 'TENANT' ? (
                              <Button 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-200"
                                onClick={() => handlePayWeb3(bill)}
                                isLoading={isPaying}
                              >
                                 <Wallet className="w-4 h-4" /> Thanh toán Web3
                              </Button>
                            ) : (
                              <Button variant="secondary" className="gap-2" disabled>
                                 Chờ khách đóng
                              </Button>
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

      {/* --- MODAL CHỌN PHƯƠNG THỨC KÝ HỢP ĐỒNG --- */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <h2 className="text-xl font-bold mb-2">Xác nhận ký Hợp đồng</h2>
              <p className="text-sm text-gray-500 mb-6">Bạn đang ký hợp đồng cho phòng <span className="font-bold text-gray-800">{contract.roomName}</span>. Vui lòng chọn phương thức chữ ký số.</p>

              <div className="space-y-3 mb-8">
                  {/* Option Blockchain */}
                  <div 
                      className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${signMethod === 'BLOCKCHAIN' ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 hover:border-indigo-200'}`}
                      onClick={() => setSignMethod("BLOCKCHAIN")}
                  >
                      <div className={`mt-1 shrink-0 ${signMethod === 'BLOCKCHAIN' ? 'text-indigo-600' : 'text-gray-300'}`}>
                          {signMethod === 'BLOCKCHAIN' ? <CheckCircle className="h-6 w-6 fill-indigo-100" /> : <div className="h-6 w-6 rounded-full border-2" />}
                      </div>
                      <div>
                          <h4 className={`font-bold text-sm flex items-center gap-2 ${signMethod === 'BLOCKCHAIN' ? 'text-indigo-900' : 'text-gray-900'}`}>
                             Ký bằng Smart Contract <Blocks className="h-4 w-4 text-indigo-500"/>
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                             Sử dụng ví MetaMask để ký số. Hợp đồng sẽ được mã hóa và lưu trữ vĩnh viễn trên mạng lưới Blockchain.
                          </p>
                      </div>
                  </div>

                  {/* Option Thường */}
                  <div 
                      className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${signMethod === 'TRADITIONAL' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200'}`}
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
    </div>
  );
}