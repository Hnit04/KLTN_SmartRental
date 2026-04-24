import axiosClient from "./axiosClient";
import type { ResidentRequestResponse, ContractMemberResponse } from "@/types/index";

export interface CreateResidentRequestPayload {
  contractId: number;
  inviteeEmail: string;
  message?: string;
}

export const residentRequestApi = {
  createRequest: (payload: CreateResidentRequestPayload) => {
    return axiosClient.post<ResidentRequestResponse>("/resident-requests", payload);
  },

  requestRemoval: (payload: { contractId: number, userId: number, message?: string }) => {
    return axiosClient.post<ResidentRequestResponse>("/resident-requests/remove", payload);
  },
  
  getRequestsByContract: (contractId: number) => {
    return axiosClient.get<ResidentRequestResponse[]>(`/resident-requests/contract/${contractId}`);
  },

  getMembersByContract: (contractId: number) => {
    return axiosClient.get<ContractMemberResponse[]>(`/resident-requests/contract/${contractId}/members`);
  },

  getMyInvitations: () => {
    return axiosClient.get<ResidentRequestResponse[]>("/resident-requests/invitations/me");
  },

  updateStatus: (requestId: number, status: string) => {
    return axiosClient.patch<ResidentRequestResponse>(`/resident-requests/${requestId}/status`, null, {
      params: { status }
    });
  }
};
