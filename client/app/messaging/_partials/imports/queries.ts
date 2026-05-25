import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/lib/store/useAuth";
import { Conversation, Message } from "@/lib/store/useMessaging";

const MESSAGING_URL = process.env.NEXT_PUBLIC_MESSAGING_URL || 'http://localhost:3001';

const getMessagingApi = (accessToken: string | null) => axios.create({
  baseURL: MESSAGING_URL,
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

export const useConversations = () => {
  const { user, accessToken } = useAuthStore();
  const api = getMessagingApi(accessToken);

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await api.get(`/conversations?userId=${user.id}`);
      let data = res.data;
      
      const hasSelf = (data as Conversation[]).some((c) => c.id.includes(user.id));
      if (!hasSelf) {
        data = [{
          id: `self_${user.id}`,
          name: `${user.name} (You)`,
          isGroup: false,
          lastMessage: 'Cloud Terminal: Initialized.',
          participants: [{ userId: user.id }]
        }, ...data];
      }
      return data as Conversation[];
    },
    enabled: !!user?.id && !!accessToken,
  });
};

export const useMessages = (conversationId: string | null) => {
  const { user, accessToken } = useAuthStore();
  const api = getMessagingApi(accessToken);

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId || !user?.id) return [];
      const res = await api.get(`/messages/${conversationId}?userId=${user.id}`);
      return res.data as Message[];
    },
    enabled: !!conversationId && !!user?.id && !!accessToken,
  });
};
