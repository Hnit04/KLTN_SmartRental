import { ethers } from "ethers";
import RentalContractABI from "../abis/RentalContract.json"; // Import file JSON vừa tạo

// Hàm lấy đối tượng Contract để tương tác
export const getSmartContract = async (contractAddress: string) => {
  if (!window.ethereum) {
    throw new Error("Vui lòng cài đặt MetaMask!");
  }

  // 1. Kết nối với MetaMask
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner(); // Lấy ví người dùng hiện tại

  // 2. Tạo đối tượng Contract (Address + ABI + Signer)
  const contract = new ethers.Contract(contractAddress, RentalContractABI, signer);

  return contract;
};

// --- Ví dụ các hàm gọi Contract ---

// 1. Hàm Đặt cọc (Deposit)
export const depositContract = async (
  contractAddress: string, 
  amountWei: string,
  onHash?: (hash: string) => void
) => {
  try {
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.deposit({ value: amountWei });
    
    if (onHash) onHash(tx.hash);
    console.log("Đang giao dịch...", tx.hash);
    
    const receipt = await tx.wait(); 
    return receipt.hash;
  } catch (error) {
    console.error("Lỗi đặt cọc:", error);
    throw error;
  }
};

// 2. Hàm Thanh toán hóa đơn (Pay Bill)
export const payBill = async (
  contractAddress: string, 
  billId: number, 
  amountWei: string,
  onHash?: (hash: string) => void
) => {
  try {
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.payBill(billId, { value: amountWei });
    
    if (onHash) onHash(tx.hash);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Lỗi thanh toán:", error);
    throw error;
  }
};

// 3. Hàm Thanh toán hóa đơn từ Backend
export const payExternalBill = async (
  contractAddress: string, 
  backendBillId: number, 
  amountWei: string,
  onHash?: (hash: string) => void
) => {
  try {
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.payExternalBill(backendBillId, { value: amountWei });
    
    if (onHash) onHash(tx.hash);
    const receipt = await tx.wait(); 
    return receipt.hash;
  } catch (error) {
    console.error("Lỗi thanh toán Web3:", error);
    throw error;
  }
};

// 4. Đề xuất khấu trừ và kết thúc (Landlord)
export const proposeDeduction = async (
  contractAddress: string, 
  amountWei: string, 
  isEarly: boolean,
  onHash?: (hash: string) => void
) => {
  try {
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.proposeDeduction(amountWei, isEarly);
    
    if (onHash) onHash(tx.hash);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Lỗi đề xuất khấu trừ:", error);
    throw error;
  }
};

// 5. Đồng ý kết thúc (Tenant)
export const consentEndContract = async (
  contractAddress: string,
  onHash?: (hash: string) => void
) => {
  try {
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.consentEndContract();
    
    if (onHash) onHash(tx.hash);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Lỗi đồng ý kết thúc:", error);
    throw error;
  }
};

// 6. Thực thi kết thúc (Either or Backend)
export const executeEndContract = async (
  contractAddress: string,
  onHash?: (hash: string) => void
) => {
  try {
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.endContract();
    
    if (onHash) onHash(tx.hash);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Lỗi thực thi kết thúc:", error);
    throw error;
  }
};

// 7. Rút tiền (Pull Payment)
export const withdrawFunds = async (
  contractAddress: string,
  onHash?: (hash: string) => void
) => {
  try {
    const contract = await getSmartContract(contractAddress);
    const tx = await contract.withdraw();
    
    if (onHash) onHash(tx.hash);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Lỗi rút tiền:", error);
    throw error;
  }
};