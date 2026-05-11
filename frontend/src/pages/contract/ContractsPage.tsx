import ContractList from "@/features/contract/components/ContractList";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Quản lý hợp đồng" description="Danh sách các hợp đồng thuê nhà của bạn." />
      <ContractList />
    </div>
  );
}