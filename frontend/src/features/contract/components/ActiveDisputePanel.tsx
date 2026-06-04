import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { contractApi } from '@/api/contractApi';

interface ActiveDisputePanelProps {
  contractId: number;
}

export default function ActiveDisputePanel({ contractId }: ActiveDisputePanelProps) {
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDispute = async () => {
      try {
        const res = await contractApi.getOpenDispute(contractId);
        if (res.data) {
          setDispute(res.data);
        }
      } catch (err) {
        console.error("Failed to load open dispute", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDispute();
  }, [contractId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    );
  }

  if (!dispute) {
    return null;
  }

  let evidenceUrls: string[] = [];
  if (dispute.evidenceUrls) {
    try {
      evidenceUrls = JSON.parse(dispute.evidenceUrls);
    } catch (e) {
      if (typeof dispute.evidenceUrls === 'string' && dispute.evidenceUrls.startsWith('http')) {
        evidenceUrls = [dispute.evidenceUrls];
      }
    }
  }

  return (
    <div className="mt-4 p-4 border border-red-300 bg-red-50 rounded-xl space-y-4 shadow-sm animate-in fade-in zoom-in-95">
      <h3 className="font-bold text-red-700 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" /> Tranh Chấp Đang Mở
      </h3>
      <div className="bg-white p-4 rounded-lg border border-red-100 text-sm space-y-3 text-red-900">
        <div>
          <span className="font-semibold text-red-700">Loại vi phạm:</span> {dispute.violationType}
        </div>
        <div>
          <span className="font-semibold text-red-700">Người tố cáo:</span> {dispute.openedByName} ({dispute.openedByRole})
        </div>
        <div>
          <span className="font-semibold text-red-700">Thời gian tạo:</span> {new Date(dispute.createdAt).toLocaleString('vi-VN')}
        </div>
        <div>
          <span className="font-semibold text-red-700">Mô tả:</span>
          <p className="mt-1 p-2 bg-red-50 rounded border border-red-100">{dispute.description}</p>
        </div>
        {evidenceUrls.length > 0 && (
          <div>
            <span className="font-semibold text-red-700">Bằng chứng:</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              {evidenceUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-red-200 hover:opacity-80 transition-opacity">
                  <img src={url} alt="Evidence" className="w-full h-24 object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 p-3 bg-red-100 rounded-lg text-center font-medium text-red-800">
          Vui lòng chờ Ban Quản Trị xem xét và giải quyết.
        </div>
      </div>
    </div>
  );
}
