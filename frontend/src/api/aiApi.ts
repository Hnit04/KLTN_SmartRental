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
  }
};
