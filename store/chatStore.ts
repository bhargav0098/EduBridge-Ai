import { create } from 'zustand';
import { Message } from '@/types';

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  currentImage: string | null;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setCurrentImage: (image: string | null) => void;
  sendMessage: (content: string, image?: string) => Promise<void>;
  clearChat: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  currentImage: null,

  addMessage: (message: Message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages: Message[]) => set({ messages }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setCurrentImage: (image: string | null) => set({ currentImage: image }),

  sendMessage: async (content: string, image?: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, image }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      get().addMessage({
        id: Date.now().toString(),
        role: 'ai',
        content: data.response || data.message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearChat: () => set({ messages: [], currentImage: null }),
}));
