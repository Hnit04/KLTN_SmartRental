import React, { useEffect, useState } from 'react';
import { propertyApi } from '@/api/propertyApi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Building, MapPin, ExternalLink, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { Property } from '@/types/index';
import { Link } from 'react-router-dom';

export default function AdminApprovalPage() {
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await propertyApi.getPendingProperties();
      setPendingProperties((res as any).data || res);
    } catch (error) {
      toast.error('Không thể tải danh sách chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setSubmitting(id);
      await propertyApi.approveProperty(id);
      toast.success('Đã duyệt khu trọ thành công!');
      fetchPending();
    } catch (error) {
      toast.error('Duyệt thất bại');
    } finally {
      setSubmitting(null);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setSubmitting(id);
      await propertyApi.rejectProperty(id);
      toast.success('Đã từ chối khu trọ');
      fetchPending();
    } catch (error) {
      toast.error('Thao tác thất bại');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Duyệt tin đăng</h1>
        <p className="text-gray-500 mt-2">Duyệt các khu trọ mới đăng hoặc vừa cập nhật thông tin.</p>
      </div>

      {pendingProperties.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50 border-dashed border-2">
          <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-600">Tuyệt vời! Không có tin nào đang chờ duyệt.</h3>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingProperties.map((p) => (
            <Card key={p.id} className="p-6 overflow-hidden flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-64 h-40 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                {p.images && p.images.length > 0 ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Building className="h-12 w-12" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{p.name}</h2>
                    <p className="flex items-center text-gray-500 text-sm mt-1">
                      <MapPin className="h-4 w-4 mr-1" /> {p.address}, {p.district}, {p.city}
                    </p>
                    <p className="mt-2 text-gray-600 text-sm line-clamp-2">{p.description}</p>
                    <div className="mt-4 flex gap-4 text-xs font-medium text-gray-500">
                       <span>Điện: {p.elecPrice?.toLocaleString()}đ</span>
                       <span>Nước: {p.waterPrice?.toLocaleString()}đ</span>
                       <span>Internet: {p.internetPrice?.toLocaleString()}đ</span>
                    </div>

                    {/* AI Safety Score */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Kiểm duyệt AI</span>
                        <span className={`text-sm font-bold ${
                          (p.safetyScore || 0) >= 80 ? 'text-green-600' : 
                          (p.safetyScore || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {p.safetyScore || 0}/100
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(p.safetyScore || 0) >= 80 ? (
                          <div className="flex items-center text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Độ an toàn cao
                          </div>
                        ) : (p.safetyScore || 0) >= 50 ? (
                          <div className="flex items-center text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Cần xem kỹ nội dung
                          </div>
                        ) : (
                          <div className="flex items-center text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                            <ShieldAlert className="h-3 w-3 mr-1" /> Nguy cơ vi phạm cao
                          </div>
                        )}
                        <span className="text-[10px] text-gray-400 italic font-normal">
                          Dựa trên phân tích tự động từ AI
                        </span>
                      </div>
                      
                      {/* Lý do chi tiết */}
                      {p.moderationReason && (
                        <div className="mt-2 text-xs text-gray-600 bg-white border border-gray-100 p-2 rounded">
                          <span className="font-semibold text-gray-700">Lý do chấm điểm:</span> {p.moderationReason}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => handleApprove(p.id)}
                      disabled={submitting === p.id}
                      className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                    >
                      {submitting === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-2" /> Duyệt tin</>}
                    </Button>
                    <Button 
                      onClick={() => handleReject(p.id)}
                      disabled={submitting === p.id}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 min-w-[120px]"
                    >
                      {submitting === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-2" /> Từ chối</>}
                    </Button>
                    <Link to={`/properties/${p.id}`} target="_blank">
                      <Button variant="ghost" size="sm" className="w-full text-blue-600">
                        <ExternalLink className="h-4 w-4 mr-2" /> Xem chi tiết
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
