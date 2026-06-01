const fs = require('fs');

const contractDetailPath = 'src/pages/contract/ContractDetailPage.tsx';
const content = fs.readFileSync(contractDetailPath, 'utf8');
const lines = content.split('\n');

const newInfo = `      {activeTab === 'INFO' && (
        <ContractInfoTab
          contract={contract}
          user={user}
          onRefresh={fetchContractData}
          handleConsentSettlement={handleConsentSettlement}
          handleExecuteSettlement={handleExecuteSettlement}
          handleWithdrawFunds={handleWithdrawFunds}
          handleAnalyzeChangeRequest={handleAnalyzeChangeRequest}
          handleRejectRequest={handleRejectRequest}
          handleCounterPropose={handleCounterPropose}
          handleApproveRequest={handleApproveRequest}
          handleUpdateResidentStatus={handleUpdateResidentStatus}
          handleRequestRemoval={handleRequestRemoval}
          isConsenting={isConsenting}
          isExecuting={isExecuting}
          isWithdrawing={isWithdrawing}
          isAnalyzingRequest={isAnalyzingRequest}
          isApprovingRequest={isApprovingRequest}
          isUpdatingResident={isUpdatingResident}
          requestAnalysisResult={requestAnalysisResult}
          withdrawableBalance={withdrawableBalance}
          handleAnalyzeTerms={handleAnalyzeTerms}
          isAnalyzing={isAnalyzing}
          analysisResult={analysisResult}
        />
      )}`;

const newBills = `      {activeTab === 'BILLS' && (
        <ContractBillsTab
          contract={contract}
          user={user}
          bills={bills}
          onRefresh={fetchContractData}
          handleWithdrawFunds={handleWithdrawFunds}
          handlePayWeb3={handlePayWeb3}
          handleGeneratePdf={handleGeneratePdf}
          isWithdrawing={isWithdrawing}
          isPayingWeb3={isPaying}
          withdrawableBalance={withdrawableBalance}
          openPaymentModal={openTraditionalPaymentModal}
          isLoadingBills={isLoadingBills}
          contractOperational={contractOperational}
          setSelectedBillForDetail={setSelectedBillForDetail}
          isPaying={isPaying}
          selectedBillForDetail={selectedBillForDetail}
        />
      )}`;

const newHeader = `      <ContractHeader 
        contract={contract} 
        onRefresh={fetchContractData} 
      />`;

let infoStart = -1, infoEnd = -1, billsStart = -1, billsEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("{activeTab === 'INFO' && (")) infoStart = i;
}
let openBraces = 0;
for (let i = infoStart; i < lines.length; i++) {
  openBraces += (lines[i].match(/\\{/g) || []).length;
  openBraces -= (lines[i].match(/\\}/g) || []).length;
  if (openBraces === 0) { infoEnd = i; break; }
}

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("{activeTab === 'BILLS' && (")) billsStart = i;
}
openBraces = 0;
for (let i = billsStart; i < lines.length; i++) {
  openBraces += (lines[i].match(/\\{/g) || []).length;
  openBraces -= (lines[i].match(/\\}/g) || []).length;
  if (openBraces === 0) { billsEnd = i; break; }
}

// Ensure valid ranges
if (infoStart === -1 || billsStart === -1) {
    console.error("Could not find INFO or BILLS tabs.");
    process.exit(1);
}

let result = lines.slice(0, infoStart);
result.push(newInfo);
result = result.concat(lines.slice(infoEnd + 1, billsStart));
result.push(newBills);
result = result.concat(lines.slice(billsEnd + 1));

// Replace Header (Starts around 1241 `      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">`)
let headerStart = -1, headerEnd = -1;
for (let i = 0; i < result.length; i++) {
  if (result[i].includes('<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">')) headerStart = i;
}
openBraces = 0;
// We look for the closing div manually based on indentation.
// The header block is closed at line 1255 in original, which is 14 lines below start.
// Let's just do it cleanly:
if (headerStart !== -1) {
  let openDivs = 0;
  for (let i = headerStart; i < result.length; i++) {
    openDivs += (result[i].match(/<div/g) || []).length;
    openDivs -= (result[i].match(new RegExp('</div>', 'g')) || []).length;
    if (openDivs === 0) { headerEnd = i; break; }
  }
}

if (headerStart !== -1 && headerEnd !== -1) {
    let headerResult = result.slice(0, headerStart);
    headerResult.push(newHeader);
    headerResult = headerResult.concat(result.slice(headerEnd + 1));
    result = headerResult;
}

// Add Imports at top
const imports = [
  "import ContractInfoTab from '@/features/contract/components/ContractInfoTab';",
  "import ContractBillsTab from '@/features/contract/components/ContractBillsTab';",
  "import ContractHeader from '@/features/contract/components/ContractHeader';"
];

result.splice(60, 0, ...imports);

fs.writeFileSync('src/pages/contract/ContractDetailPage.tsx', result.join('\\n'));
console.log('ContractDetailPage updated successfully!');
