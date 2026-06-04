import api from './api';

export const chatService = {
  sendMessage: async (message: string, image?: string) => {
    const response = await api.post('/chat', { message, image });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/chat/history');
    return response.data;
  },

  clearHistory: async () => {
    const response = await api.delete('/chat/history');
    return response.data;
  },
};
