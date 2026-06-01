import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import { contractApi } from '@/api/contractApi';
import { toast } from 'sonner';

interface BlockchainLifecycleTimelineProps {
  contractId: number;
}

export default function BlockchainLifecycleTimeline({ contractId }: BlockchainLifecycleTimelineProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await contractApi.getBlockchainTimeline(contractId);
        setEvents(res.data);
      } catch (error) {
        console.error("Timeline error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTimeline();
  }, [contractId]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        Chưa có dữ liệu lịch sử blockchain cho hợp đồng này.
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
        Vòng Đời Hợp Đồng (Blockchain)
      </h3>
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
        {events.map((evt, idx) => (
          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-slate-900 text-sm">{evt.eventType || 'Cập nhật trạng thái'}</h4>
                <span className="text-xs font-medium text-slate-500">
                  {new Date(evt.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed break-words">
                Trạng thái: <span className="font-semibold text-slate-800">{evt.status}</span>
              </p>
              {evt.txHash && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${evt.txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-500 hover:text-blue-600 font-mono flex items-center gap-1"
                  >
                    TxHash: {evt.txHash.substring(0, 15)}...
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
