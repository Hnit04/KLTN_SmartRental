import axiosClient from "./axiosClient";

export interface ChatResponse {
  status: string;
  sessionId: string;
  reply: string;
}

export interface QueryDataResponse {
  status: string;
  question: string;
  data: string;
}

export const aiApi = {
  chat: async (message: string, sessionId?: string): Promise<ChatResponse> => {
    const response = await axiosClient.post('/ai/chat', { message, sessionId });
    return response.data;
  },

  queryData: async (question: string): Promise<QueryDataResponse> => {
    const response = await axiosClient.post('/ai/query-data', { question });
    return response.data;
  },

  // Admin: thống kê AI NLP
  getAnalytics: () => {
    return axiosClient.get("/ai/admin/analytics");
  },

  // Admin: sửa 1 câu AI đã học
  updateCache: (id: number, generatedSql: string) => {
    return axiosClient.put(`/ai/admin/cache/${id}`, { generatedSql });
  },

  // Admin: xóa 1 câu AI đã học
  deleteCache: (id: number) => {
    return axiosClient.delete(`/ai/admin/cache/${id}`);
  },

  // Admin: xóa cache AI
  clearCache: () => {
    return axiosClient.post("/ai/clear-cache");
  },

  // Actionable AI: Nhắc đóng tiền hàng loạt
  generateReminders: async () => {
    const response = await axiosClient.post('/ai/actions/generate-reminders');
    return response.data;
  },

  sendReminders: async (approvedReminders: any[]) => {
    const response = await axiosClient.post('/ai/actions/send-reminders', approvedReminders);
    return response.data;
  },

  analyzeAnomalies: async () => {
    const response = await axiosClient.post('/ai/actions/analyze-anomalies');
    return response.data;
  }
};
