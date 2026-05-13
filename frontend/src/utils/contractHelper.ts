import { ethers } from "ethers";
import RentalContractABI from "../abis/RentalContract.json";
import { trackEvent } from "@/utils/analytics";

type ContractAction =
  | "deposit"
  | "pay_bill"
  | "pay_external_bill"
  | "propose_deduction"
  | "consent_end_contract"
  | "execute_end_contract"
  | "withdraw_funds";

function trackBlockchainTx(
  action: ContractAction,
  phase: "started" | "confirmed" | "failed",
  payload?: Record<string, unknown>
) {
  trackEvent(`blockchain_tx_${phase}`, {
    action,
    ...payload,
  });
}

function trackTxHash(action: ContractAction, contractAddress: string, hash: string, payload?: Record<string, unknown>) {
  trackEvent("blockchain_tx_hash_received", {
    action,
    contractAddress,
    hash,
    ...payload,
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Unknown blockchain error";
}

export const getSmartContract = async (contractAddress: string) => {
  if (!window.ethereum) {
    throw new Error("Vui long cai dat MetaMask!");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(contractAddress, RentalContractABI, signer);
};

export const depositContract = async (
  contractAddress: string,
  amountWei: string,
  onHash?: (hash: string) => void
) => {
  try {
    trackBlockchainTx("deposit", "started", { contractAddress, amountWei });
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.deposit({ value: amountWei });

    if (onHash) onHash(tx.hash as string);
    trackTxHash("deposit", contractAddress, tx.hash as string, { amountWei });

    const receipt = await tx.wait();
    trackBlockchainTx("deposit", "confirmed", { contractAddress, txHash: receipt.hash, amountWei });
    return receipt.hash;
  } catch (error) {
    trackBlockchainTx("deposit", "failed", {
      contractAddress,
      amountWei,
      message: getErrorMessage(error),
    });
    throw error;
  }
};

export const payBill = async (
  contractAddress: string,
  billId: number,
  amountWei: string,
  onHash?: (hash: string) => void
) => {
  try {
    trackBlockchainTx("pay_bill", "started", { contractAddress, billId, amountWei });
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.payBill(billId, { value: amountWei });

    if (onHash) onHash(tx.hash as string);
    trackTxHash("pay_bill", contractAddress, tx.hash as string, { billId, amountWei });

    const receipt = await tx.wait();
    trackBlockchainTx("pay_bill", "confirmed", {
      contractAddress,
      billId,
      amountWei,
      txHash: receipt.hash,
    });
    return receipt.hash;
  } catch (error) {
    trackBlockchainTx("pay_bill", "failed", {
      contractAddress,
      billId,
      amountWei,
      message: getErrorMessage(error),
    });
    throw error;
  }
};

export const payExternalBill = async (
  contractAddress: string,
  backendBillId: number,
  amountWei: string,
  onHash?: (hash: string) => void
) => {
  try {
    trackBlockchainTx("pay_external_bill", "started", {
      contractAddress,
      backendBillId,
      amountWei,
    });
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.payExternalBill(backendBillId, { value: amountWei });

    if (onHash) onHash(tx.hash as string);
    trackTxHash("pay_external_bill", contractAddress, tx.hash as string, {
      backendBillId,
      amountWei,
    });

    const receipt = await tx.wait();
    trackBlockchainTx("pay_external_bill", "confirmed", {
      contractAddress,
      backendBillId,
      amountWei,
      txHash: receipt.hash,
    });
    return receipt.hash;
  } catch (error) {
    trackBlockchainTx("pay_external_bill", "failed", {
      contractAddress,
      backendBillId,
      amountWei,
      message: getErrorMessage(error),
    });
    throw error;
  }
};

export const proposeDeduction = async (
  contractAddress: string,
  amountWei: string,
  isEarly: boolean,
  onHash?: (hash: string) => void
) => {
  try {
    trackBlockchainTx("propose_deduction", "started", { contractAddress, amountWei, isEarly });
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.proposeDeduction(amountWei, isEarly);

    if (onHash) onHash(tx.hash as string);
    trackTxHash("propose_deduction", contractAddress, tx.hash as string, { amountWei, isEarly });

    const receipt = await tx.wait();
    trackBlockchainTx("propose_deduction", "confirmed", {
      contractAddress,
      amountWei,
      isEarly,
      txHash: receipt.hash,
    });
    return receipt.hash;
  } catch (error) {
    trackBlockchainTx("propose_deduction", "failed", {
      contractAddress,
      amountWei,
      isEarly,
      message: getErrorMessage(error),
    });
    throw error;
  }
};

export const consentEndContract = async (
  contractAddress: string,
  onHash?: (hash: string) => void
) => {
  try {
    trackBlockchainTx("consent_end_contract", "started", { contractAddress });
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.consentEndContract();

    if (onHash) onHash(tx.hash as string);
    trackTxHash("consent_end_contract", contractAddress, tx.hash as string);

    const receipt = await tx.wait();
    trackBlockchainTx("consent_end_contract", "confirmed", {
      contractAddress,
      txHash: receipt.hash,
    });
    return receipt.hash;
  } catch (error) {
    trackBlockchainTx("consent_end_contract", "failed", {
      contractAddress,
      message: getErrorMessage(error),
    });
    throw error;
  }
};

export const executeEndContract = async (
  contractAddress: string,
  onHash?: (hash: string) => void
) => {
  try {
    trackBlockchainTx("execute_end_contract", "started", { contractAddress });
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.endContract();

    if (onHash) onHash(tx.hash as string);
    trackTxHash("execute_end_contract", contractAddress, tx.hash as string);

    const receipt = await tx.wait();
    trackBlockchainTx("execute_end_contract", "confirmed", {
      contractAddress,
      txHash: receipt.hash,
    });
    return receipt.hash;
  } catch (error) {
    trackBlockchainTx("execute_end_contract", "failed", {
      contractAddress,
      message: getErrorMessage(error),
    });
    throw error;
  }
};

export const withdrawFunds = async (
  contractAddress: string,
  onHash?: (hash: string) => void
) => {
  try {
    trackBlockchainTx("withdraw_funds", "started", { contractAddress });
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.withdraw();

    if (onHash) onHash(tx.hash as string);
    trackTxHash("withdraw_funds", contractAddress, tx.hash as string);

    const receipt = await tx.wait();
    trackBlockchainTx("withdraw_funds", "confirmed", {
      contractAddress,
      txHash: receipt.hash,
    });
    return receipt.hash;
  } catch (error) {
    trackBlockchainTx("withdraw_funds", "failed", {
      contractAddress,
      message: getErrorMessage(error),
    });
    throw error;
  }
};
