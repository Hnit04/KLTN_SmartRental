import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import StatusBadge from '@/components/shared/StatusBadge';
import { Receipt, Download, AlertCircle, TrendingUp, CreditCard } from 'lucide-react';
import { DashboardPanel } from '@/components/dashboard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';

import { formatCurrency } from '@/utils/format';

interface ContractBillsTabProps {
  contract: any;
  user: any;
  bills: any[];
  onRefresh: () => void;
  handleWithdrawFunds: () => void;
  handlePayWeb3: (bill: any) => void;
  isWithdrawing: boolean;
  isPayingWeb3: number | null;
  withdrawableBalance: number;
  openPaymentModal: (bill: any) => void;
  isLoadingBills: boolean;
  setSelectedBillForDetail: (bill: any) => void;
  isPaying: boolean;
  selectedBillForDetail: any;
}

export default function ContractBillsTab({
  contract, user, bills, onRefresh,
  handleWithdrawFunds, handlePayWeb3,
  isWithdrawing, isPayingWeb3, withdrawableBalance, openPaymentModal,
  isLoadingBills, setSelectedBillForDetail, isPaying, selectedBillForDetail
}: ContractBillsTabProps) {
  const isLandlord = user?.role === 'LANDLORD';
  
  return (
    <>
        <div className="space-y-6">
          {contract.smartContractAddress && (
            <DashboardPanel
              title="Ví Web3 (Sổ dư chờ rút)"
              description={user?.role === 'LANDLORD' 
                ? "Khoản tiền hóa đơn khách đã thanh toán được lưu trong Smart Contract, chờ bạn rút về ví MetaMask."
                : "Khoản tiền cọc được hoàn trả (nếu có) lưu trong Smart Contract, chờ bạn rút về ví MetaMask."}
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
                {bills.map((bill: any) => {
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
                      <Button size="sm" variant="ghost" onClick={() => setSelectedBillForDetail(bill)}>
                        Chi tiết
                      </Button>
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
                            <Button size="sm" variant="outline" className="min-h-9 border-primary/30" onClick={() => openPaymentModal(bill)}>
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
    </>
  );
}
