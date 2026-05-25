import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SearchResultsData {
  notifications: SearchResultItem[];
  settings: SearchResultItem[];
  users: SearchResultItem[];
  logs: {
    activity: SearchResultItem[];
    errors: SearchResultItem[];
    access: SearchResultItem[];
  };
  chats: {
    messages: SearchResultItem[];
    conversations: SearchResultItem[];
  };
}

export interface SearchResultItem {
  id: string;
  title?: string;
  name?: string;
  key?: string;
  slug?: string;
  content?: string;
  message?: string;
  lastMessage?: string;
  email?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  sentAt?: string;
  action?: string;
  details?: string;
  type?: string;
  method?: string;
  path?: string;
  ip?: string;
  category?: string;
  severity?: string;
}

export const useSearchResults = (query: string) => {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return null;
      const response = await api.get(`/search?q=${query}`);
      return response.data as SearchResultsData;
    },
    placeholderData: (previousData) => previousData,
  });
};
