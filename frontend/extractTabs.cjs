const fs = require('fs');
const path = require('path');

const contractDetailPath = path.join(__dirname, 'src', 'pages', 'contract', 'ContractDetailPage.tsx');
const infoTabPath = path.join(__dirname, 'src', 'features', 'contract', 'components', 'ContractInfoTab.tsx');
const billsTabPath = path.join(__dirname, 'src', 'features', 'contract', 'components', 'ContractBillsTab.tsx');

const content = fs.readFileSync(contractDetailPath, 'utf8');
const lines = content.split('\n');

// 1. Extract INFO tab (from 1339 to 2399 roughly)
// We will look for `{activeTab === 'INFO' && (` and the corresponding closing.
let infoStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("{activeTab === 'INFO' && (")) {
    infoStart = i;
    break;
  }
}

let infoEnd = -1;
let openBraces = 0;
for (let i = infoStart; i < lines.length; i++) {
  openBraces += (lines[i].match(/\{/g) || []).length;
  openBraces -= (lines[i].match(/\}/g) || []).length;
  if (openBraces === 0) {
    infoEnd = i;
    break;
  }
}

// 2. Extract BILLS tab
let billsStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("{activeTab === 'BILLS' && (")) {
    billsStart = i;
    break;
  }
}

let billsEnd = -1;
openBraces = 0;
for (let i = billsStart; i < lines.length; i++) {
  openBraces += (lines[i].match(/\{/g) || []).length;
  openBraces -= (lines[i].match(/\}/g) || []).length;
  if (openBraces === 0) {
    billsEnd = i;
    break;
  }
}

const infoJsx = lines.slice(infoStart + 1, infoEnd - 1).join('\n'); // strip `{activeTab === 'INFO' && (` and `)}`
const billsJsx = lines.slice(billsStart + 1, billsEnd - 1).join('\n');

const infoComponent = `import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FileText, MapPin, Calendar, Users, User, Trash2, Clock, CheckCircle2, XCircle, PenTool, Sparkles, AlertTriangle, LogOut, TrendingUp, CheckCircle, Bot, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import ContractDisputePanel from '@/features/contract/components/ContractDisputePanel';
import AdminDisputeResolutionPanel from '@/features/contract/components/AdminDisputeResolutionPanel';
import BlockchainLifecycleTimeline from '@/features/contract/components/BlockchainLifecycleTimeline';
import { renderMarkdown } from '@/utils/markdownRender';
import { config } from '@/config';
import { useNavigate } from 'react-router-dom';

interface ContractInfoTabProps {
  contract: any;
  user: any;
  onRefresh: () => void;
  // Các handlers giữ nguyên từ Phase 1, pass as props for now
  handleConsentSettlement: () => void;
  handleExecuteSettlement: () => void;
  handleWithdrawFunds: () => void;
  handleAnalyzeChangeRequest: (req: any) => void;
  handleRejectRequest: (id: number) => void;
  handleCounterPropose: (req: any) => void;
  handleApproveRequest: (id: number) => void;
  handleUpdateResidentStatus: (id: number, status: string) => void;
  handleRequestRemoval: (member: any) => void;
  isConsenting: boolean;
  isExecuting: boolean;
  isWithdrawing: boolean;
  isAnalyzingRequest: boolean;
  isApprovingRequest: number | null;
  isUpdatingResident: boolean;
  requestAnalysisResult: string | null;
  withdrawableBalance: number;
}

export default function ContractInfoTab({
  contract, user, onRefresh,
  handleConsentSettlement, handleExecuteSettlement, handleWithdrawFunds,
  handleAnalyzeChangeRequest, handleRejectRequest, handleCounterPropose,
  handleApproveRequest, handleUpdateResidentStatus, handleRequestRemoval,
  isConsenting, isExecuting, isWithdrawing, isAnalyzingRequest,
  isApprovingRequest, isUpdatingResident, requestAnalysisResult, withdrawableBalance
}: ContractInfoTabProps) {
  const navigate = useNavigate();
  const id = contract?.id;
  const prefix = user?.role === 'ADMIN' ? '/admin' : '/portal';
  const members = contract?.members || [];
  const residentRequests = contract?.residentRequests || [];
  const changeRequests = contract?.changeRequests || [];
  const pendingRequest = changeRequests.find((r: any) => r.status === 'PENDING');

  return (
    <>
${infoJsx}
    </>
  );
}
`;

const billsComponent = `import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Receipt, Download, AlertCircle, TrendingUp, CreditCard } from 'lucide-react';
import DashboardPanel from '@/components/ui/DashboardPanel';
import PaymentNotice from '@/components/shared/PaymentNotice';
import { formatCurrency } from '@/utils/formatCurrency';

interface ContractBillsTabProps {
  contract: any;
  user: any;
  bills: any[];
  onRefresh: () => void;
  handleWithdrawFunds: () => void;
  handlePayWeb3: (bill: any) => void;
  handleGeneratePdf: (bill: any) => void;
  isWithdrawing: boolean;
  isPayingWeb3: number | null;
  withdrawableBalance: number;
  openPaymentModal: (bill: any) => void;
}

export default function ContractBillsTab({
  contract, user, bills, onRefresh,
  handleWithdrawFunds, handlePayWeb3, handleGeneratePdf,
  isWithdrawing, isPayingWeb3, withdrawableBalance, openPaymentModal
}: ContractBillsTabProps) {
  const isLandlord = user?.role === 'LANDLORD';
  
  return (
    <>
${billsJsx}
    </>
  );
}
`;

fs.writeFileSync(infoTabPath, infoComponent);
fs.writeFileSync(billsTabPath, billsComponent);
console.log('Successfully extracted ContractInfoTab and ContractBillsTab!');
