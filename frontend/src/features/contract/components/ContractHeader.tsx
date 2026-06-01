import React from 'react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CancelContractButton from '@/features/contract/components/CancelContractButton';


interface ContractHeaderProps {
  contract: any;
  onRefresh: () => void;
}

export default function ContractHeader({ contract, onRefresh }: ContractHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => navigate(-1)} 
        className="shrink-0 rounded-full" 
        aria-label="Quay lại"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <PageHeader
        className="mb-0 min-w-0 flex-1 border-0 pb-0"
        title="Không gian làm việc hợp đồng"
        description={[ `#${contract.id}`, contract.roomName || 'Phòng', contract.propertyAddress ].filter(Boolean).join(' · ')}
      />
      {['PENDING_APPROVAL', 'PENDING_SIGNATURE', 'LANDLORD_SIGNED', 'FULLY_SIGNED', 'AWAITING_DEPOSIT'].includes(contract.status) && (
        <div className="flex-shrink-0">
          <CancelContractButton contractId={Number(contract.id)} onSuccess={onRefresh} />
        </div>
      )}
    </div>
  );
}
