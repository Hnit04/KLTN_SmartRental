import axiosClient from "./axiosClient";

export interface RoomReportRequest {
  roomId: number;
  reason: string;
  details?: string;
  evidenceUrls?: string[];
}

export interface RoomReportResponse {
  id: number;
  reporterId: number;
  reporterName: string;
  roomId: number;
  roomName: string;
  propertyId?: number;
  propertyName?: string;
  reason: string;
  details: string;
  evidenceUrls: string[];
  status: "PENDING" | "RESOLVED_CLEAN" | "RESOLVED_VIOLATING";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolveReportRequest {
  status: "RESOLVED_CLEAN" | "RESOLVED_VIOLATING";
  adminNotes?: string;
}

export const reportApi = {
  // Tenant gửi báo cáo
  createReport: (data: RoomReportRequest) =>
    axiosClient.post<RoomReportResponse>("/reports", data),

  // Admin lấy danh sách báo cáo
  getAdminReports: () =>
    axiosClient.get<RoomReportResponse[]>("/admin/reports"),

  // Admin xử lý báo cáo
  resolveReport: (id: number, data: ResolveReportRequest) =>
    axiosClient.put<RoomReportResponse>(`/admin/reports/${id}/resolve`, data),
};
