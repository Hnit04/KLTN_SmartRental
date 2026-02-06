import ContractList from "@/features/contract/components/ContractList";

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý hợp đồng</h1>
          <p className="text-sm text-gray-500">Danh sách các hợp đồng thuê nhà của bạn.</p>
        </div>
      </div>
      
      {/* Component hiển thị danh sách (đã có ở các bước trước) */}
      <ContractList />
    </div>
  );
}