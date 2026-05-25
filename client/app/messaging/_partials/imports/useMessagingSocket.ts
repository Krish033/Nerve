import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message, useMessagingStore } from '@/lib/store/useMessaging';
import { useAuthStore } from '@/lib/store/useAuth';

const SOCKET_URL = process.env.NEXT_PUBLIC_MESSAGING_URL || 'http://localhost:3001';

export const useMessagingSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuthStore();
  const { addMessage, updateMessage, clearMessages, toggleBlockUser } = useMessagingStore();

  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      query: { userId: user.id },
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SOCKET] Connected to messaging backbone');
    });

    socket.on('newMessage', (message: Message) => {
      addMessage(message.conversationId, message);
    });

    socket.on('messageUpdated', (message: Message) => {
      updateMessage(message.conversationId, message);
    });

    socket.on('messageDeleted', ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      updateMessage(conversationId, { 
        id: messageId,
        isDeleted: true, 
        content: 'SYSTEM: MESSAGE_PURGED_FROM_VECTOR' 
      });
    });

    socket.on('chatHistoryCleared', ({ conversationId }: { conversationId: string }) => {
      clearMessages(conversationId);
    });

    socket.on('userBlocked', ({ blockedId }: { blockedId: string }) => {
      toggleBlockUser(blockedId);
    });

    socket.on('userUnblocked', ({ blockedId }: { blockedId: string }) => {
      toggleBlockUser(blockedId);
    });

    socket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection Error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, addMessage, updateMessage, clearMessages, toggleBlockUser]);

  const sendMessage = useCallback((conversationId: string, content: string, type: string = 'TEXT') => {
    if (socketRef.current && user) {
      const tempId = `temp_${Date.now()}`;
      
      const optimisticMessage = {
        id: tempId,
        conversationId,
        senderId: user.id,
        content,
        type,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };
      
      addMessage(conversationId, optimisticMessage);

      socketRef.current.emit('sendMessage', {
        conversationId,
        senderId: user.id,
        content,
        type
      });
    }
  }, [addMessage, user]);

  const editMessage = useCallback((messageId: string, newContent: string) => {
    if (socketRef.current && user) {
      socketRef.current.emit('editMessage', {
        messageId,
        senderId: user.id,
        newContent
      });
    }
  }, [user]);

  const deleteMessage = useCallback((messageId: string) => {
    if (socketRef.current && user) {
      socketRef.current.emit('deleteMessage', {
        messageId,
        senderId: user.id
      });
    }
  }, [user]);

  const clearChatHistory = useCallback((conversationId: string) => {
    if (socketRef.current && user) {
      socketRef.current.emit('clearChatHistory', {
        conversationId,
        userId: user.id
      });
      clearMessages(conversationId);
    }
  }, [clearMessages, user]);

  const setBlockUser = useCallback((blockedId: string, isBlocked: boolean) => {
    if (socketRef.current && user) {
      socketRef.current.emit(isBlocked ? 'unblockUser' : 'blockUser', {
        blockerId: user.id,
        blockedId,
      });
    }
  }, [user]);

  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('joinConversation', { conversationId });
    }
  }, []);

  return { sendMessage, editMessage, deleteMessage, clearChatHistory, joinConversation, setBlockUser };
};


