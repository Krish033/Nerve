import { create } from 'zustand';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  lastMessage: string | null;
  lastMessageAt?: string;
  participants: { userId: string }[];
}

interface MessagingState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  unreadCounts: Record<string, number>;
  blockedUserIds: string[];
  editingMessage: Message | null;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, message: Partial<Message> & { id: string }) => void;
  clearMessages: (conversationId: string) => void;
  setLoadingConversations: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
  setUnreadCounts: (counts: Record<string, number>) => void;
  setBlockedUserIds: (ids: string[]) => void;
  setEditingMessage: (message: Message | null) => void;
  toggleBlockUser: (userId: string) => void;
}

export const useMessagingStore = create<MessagingState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  unreadCounts: {},
  blockedUserIds: [],
  editingMessage: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (conversationId, messages) => 
    set((state) => ({ 
      messages: { ...state.messages, [conversationId]: messages } 
    })),
  addMessage: (conversationId, message) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      const withoutOptimistic = currentMessages.filter((m) => {
        if (!m.id.startsWith('temp_')) return true;
        return !(
          m.senderId === message.senderId &&
          m.content === message.content &&
          m.type === message.type &&
          Math.abs(new Date(message.createdAt).getTime() - new Date(m.createdAt).getTime()) < 15000
        );
      });
      return {
        messages: {
          ...state.messages,
          [conversationId]: withoutOptimistic.some((m) => m.id === message.id)
            ? withoutOptimistic
            : [...withoutOptimistic, message]
        },
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessage: message.isDeleted ? conversation.lastMessage : message.content,
                lastMessageAt: message.createdAt,
              }
            : conversation,
        ),
      };
    }),
  updateMessage: (conversationId, message) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: currentMessages.map((m) => m.id === message.id ? { ...m, ...message } : m)
        }
      };
    }),
  setLoadingConversations: (loading) => set({ isLoadingConversations: loading }),
  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
  setUnreadCounts: (counts) => set({ unreadCounts: counts }),
  setBlockedUserIds: (ids) => set({ blockedUserIds: ids }),
  setEditingMessage: (message) => set({ editingMessage: message }),
  clearMessages: (conversationId) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: [] },
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, lastMessage: null, lastMessageAt: new Date().toISOString() }
          : conversation,
      ),
    })),
  toggleBlockUser: (userId) => set((state) => ({
    blockedUserIds: state.blockedUserIds.indexOf(userId) !== -1
      ? state.blockedUserIds.filter(id => id !== userId)
      : [...state.blockedUserIds, userId]
  })),
}));

