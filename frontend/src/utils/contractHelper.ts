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
export const depositContract = async (contractAddress: string, amountWei: string) => {
  try {
    const contract = await getSmartContract(contractAddress);
    
    // Gọi hàm deposit() trong Smart Contract và gửi kèm ETH (value)
    const tx = await contract.deposit({ value: amountWei });
    
    console.log("Đang giao dịch...", tx.hash);
    await tx.wait(); // Chờ giao dịch được xác nhận trên Blockchain
    console.log("Đặt cọc thành công!");
    return tx.hash;
  } catch (error) {
    console.error("Lỗi đặt cọc:", error);
    throw error;
  }
};

// 2. Hàm Thanh toán hóa đơn (Pay Bill) - On-chain bill
export const payBill = async (contractAddress: string, billId: number, amountWei: string) => {
  try {
    const contract = await getSmartContract(contractAddress);
    
    // Gọi hàm payBill(_billId)
    const tx = await contract.payBill(billId, { value: amountWei });
    
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Lỗi thanh toán:", error);
    throw error;
  }
};

// 3. Hàm Thanh toán hóa đơn từ Backend (Payment Gateway)
// Gọi payExternalBill() trên Smart Contract -> Tiền chuyển thẳng cho chủ trọ + Ghi log on-chain
export const payExternalBill = async (contractAddress: string, backendBillId: number, amountWei: string) => {
  try {
    const contract = await getSmartContract(contractAddress);
    
    // Gọi hàm payExternalBill(_backendBillId) trên smart contract
    const tx = await contract.payExternalBill(backendBillId, { value: amountWei });
    
    console.log("Đang chờ xác nhận giao dịch...", tx.hash);
    const receipt = await tx.wait(); // Chờ blockchain xác nhận
    console.log("Thanh toán thành công!", receipt.hash);
    return receipt.hash;
  } catch (error) {
    console.error("Lỗi thanh toán Web3:", error);
    throw error;
  }
};