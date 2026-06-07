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
  sendMessage: (content: string, image?: string, language?: string) => Promise<void>;
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

  sendMessage: async (content: string, image?: string, language: string = 'English') => {
    set({ isLoading: true });
    try {
      const token = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
        : null;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content, image, language }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get response');
      }

      const data = await response.json();
      const aiText = data.response || data.message || data.answer || 'Sorry, I could not generate a response.';

      get().addMessage({
        id: Date.now().toString(),
        role: 'ai',
        content: aiText,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Chat error:', error);
      // Show error as an AI message so the user sees it
      get().addMessage({
        id: Date.now().toString(),
        role: 'ai',
        content: `⚠️ ${(error as Error).message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  clearChat: () => set({ messages: [], currentImage: null }),
}));
