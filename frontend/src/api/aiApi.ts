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
  source?: string;
  verifiable?: boolean;
}

export interface QueryDataLocationPayload {
  lat: number;
  lng: number;
}

export const aiApi = {
  chat: async (message: string, sessionId?: string): Promise<ChatResponse> => {
    const response = await axiosClient.post('/ai/chat', { message, sessionId });
    return response.data;
  },

  queryData: async (
    question: string,
    location?: QueryDataLocationPayload | null
  ): Promise<QueryDataResponse> => {
    const payload: { question: string; lat?: number; lng?: number } = { question };
    if (location) {
      payload.lat = location.lat;
      payload.lng = location.lng;
    }
    const response = await axiosClient.post('/ai/query-data', payload);
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

  // Actionable AI: generate reminder drafts for overdue or due-soon bills
  generateReminders: async (
    scope: "OVERDUE" | "DUE_SOON" = "OVERDUE",
    daysAhead = 3
  ) => {
    const response = await axiosClient.post('/ai/actions/generate-reminders', null, {
      params: {
        scope,
        daysAhead,
      },
    });
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
