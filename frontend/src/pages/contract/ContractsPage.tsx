import ContractList from "@/features/contract/components/ContractList";

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div className="section-card p-4 md:p-6 flex items-center justify-between">
        <div>
          <h1 className="page-title text-foreground">Quản lý hợp đồng</h1>
          <p className="page-subtitle">Danh sách các hợp đồng thuê nhà của bạn.</p>
        </div>
      </div>
      
      {/* Component hiển thị danh sách (đã có ở các bước trước) */}
      <ContractList />
    </div>
  );
}