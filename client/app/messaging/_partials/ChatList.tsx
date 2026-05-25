"use client";

import React from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useMessagingStore } from '@/lib/store/useMessaging';
import { useAuthStore } from '@/lib/store/useAuth';
import { cn } from '@/lib/utils';
import { ArrowLeft, Search, Plus, Globe, UserPlus, Mail } from 'lucide-react';
import { GoogleContactsService } from '@/app/messaging/_partials/imports/google-contacts.service';
import { useConversations } from './imports/queries';
import { ConversationItem } from './ConversationItem';
import { Conversation } from '@/lib/store/useMessaging';

const MESSAGING_URL = process.env.NEXT_PUBLIC_MESSAGING_URL || 'http://localhost:3001';

interface Contact {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  source: 'GOOGLE';
}

export const ChatList = () => {
  const { user } = useAuthStore();
  const { 
    activeConversationId, 
    setActiveConversation, 
    setConversations,
    unreadCounts,
    blockedUserIds
  } = useMessagingStore();
  const { data: conversations = [], isLoading: isLoadingConversations } = useConversations();
  const [view, setView] = React.useState<'chats' | 'new-chat'>('chats');
  const [search, setSearch] = React.useState('');
  const [isFetching, setIsFetching] = React.useState(false);
  const [contacts, setContacts] = React.useState<Contact[]>([]);

  const [syncError, setSyncError] = React.useState<string | null>(null);

  const fetchGoogleContacts = async () => {
    setIsFetching(true);
    setSyncError(null);
    
    const { googleAccessToken } = useAuthStore.getState();
    if (!googleAccessToken) {
      setSyncError('NO_TOKEN');
      setIsFetching(false);
      return;
    }
    
    try {
      const googleContacts = await GoogleContactsService.fetchContacts();
      if (googleContacts.length === 0 && syncError !== 'NO_TOKEN') {
        setSyncError('EMPTY');
      }
      const formattedContacts: Contact[] = googleContacts
        .filter(c => c.email && c.email.toLowerCase().trim() !== user?.email?.toLowerCase().trim())
        .map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          avatar: c.photoUrl,
          source: 'GOOGLE' as const
        }));
      setContacts(formattedContacts);
    } catch (error: unknown) {
      const status = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      if (status === 403) {
        setSyncError('API_DISABLED');
      } else {
        setSyncError('UNKNOWN');
      }
      console.error('Failed to sync contacts:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSelectContact = async (contact: Contact) => {
    if (!user?.id) return;

    const { accessToken } = useAuthStore.getState();
    const res = await axios.post<Conversation>(
      `${MESSAGING_URL}/conversations`,
      {
        participantIds: [user.id, contact.email],
        name: contact.name,
        isGroup: false,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const newConv = res.data;
    
    setActiveConversation(newConv.id);
    setConversations([newConv, ...conversations.filter((conversation) => conversation.id !== newConv.id)]);
    setView('chats');
  };

  const filteredConversations = React.useMemo(
    () => conversations.filter((conv) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [
        conv.name,
        conv.lastMessage,
        ...conv.participants.map((participant) => participant.userId),
      ].some((value) => value?.toLowerCase().includes(query));
    }),
    [conversations, search],
  );

  return (
    <div className="w-80 border-r border-border/50 flex flex-col h-full bg-background/50 backdrop-blur-md relative overflow-hidden">
      {/* View Switcher Container */}
      <div className={cn(
        "flex flex-col h-full w-full transition-transform duration-300 ease-in-out",
        view === 'new-chat' ? "-translate-x-full" : "translate-x-0"
      )}>
        {/* Main Chats View */}
        <div className="flex-none flex flex-col h-full w-full">
          <div className="p-5 border-b border-border/10 bg-white/[0.01] flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 group cursor-default">
                <div className="h-4 w-1 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] group-hover:shadow-[0_0_15px_rgba(var(--primary),0.8)] transition-all" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 transition-colors group-hover:text-primary">SECURE_CHANNELS</h2>
              </div>
              <button 
                onClick={() => setView('new-chat')}
                className="p-1.5 hover:bg-primary/10 text-primary rounded-[2px] transition-colors group relative border border-transparent hover:border-primary/20"
              >
                <Plus className="h-4 w-4" />
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-[9px] rounded-[2px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-black tracking-widest z-50">NEW_COMM_LINK</span>
              </button>
            </div>
            <div className="relative group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-hover/search:text-primary/50 transition-colors" />
              <input 
                type="text" 
                placeholder="Search channels..." 
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full bg-background border border-border/40 hover:border-border/80 rounded-[2px] py-1 pl-10 pr-3 text-[13px] text-foreground focus:outline-none focus:border-primary/50 focus:shadow-[0_0_10px_rgba(var(--primary),0.1)] transition-all tracking-wide"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoadingConversations ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-10 w-10 bg-muted/20 rounded-[2px]" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-2 bg-muted/20 rounded w-3/4" />
                      <div className="h-2 bg-muted/10 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={activeConversationId === conv.id}
                  unreadCount={unreadCounts[conv.id] || 0}
                  isBlocked={blockedUserIds.indexOf(conv.participants.find(p => p.userId !== user?.id)?.userId || '') !== -1}
                  onClick={() => setActiveConversation(conv.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Chat Slide-in View */}
      <div className={cn(
        "absolute inset-0 flex flex-col h-full w-full bg-background transition-transform duration-300 ease-in-out z-20",
        view === 'new-chat' ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="p-5 border-b border-border/10 bg-white/[0.01] flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('chats')}
              className="p-1 hover:bg-muted/10 rounded-sm transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-1 bg-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">INITIALIZE_LINK</h2>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="relative group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-hover/search:text-primary/50 transition-colors" />
              <input 
                type="text" 
                placeholder="Search contacts..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full bg-background border border-border/40 hover:border-border/80 rounded-[2px] py-1 pl-10 pr-3 text-[13px] text-foreground focus:outline-none focus:border-primary/50 focus:shadow-[0_0_10px_rgba(var(--primary),0.1)] transition-all tracking-wide"
              />
            </div>
            
            <button 
              onClick={fetchGoogleContacts}
              disabled={isFetching}
              className="w-full h-10 flex items-center justify-center gap-2 bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-all rounded-[2px] disabled:opacity-50 group shadow-[0_0_15px_rgba(var(--primary),0.05)]"
            >
              {isFetching ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Globe className="h-4 w-4 transition-transform group-hover:rotate-12" />
              )}
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                {isFetching ? 'SYNCING_PEOPLE...' : 'SYNC_GOOGLE_PEOPLE'}
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {contacts.length === 0 ? (
            <div className="py-16 px-6 text-center">
              {syncError === 'NO_TOKEN' ? (
                <div className="space-y-3">
                  <UserPlus className="h-8 w-8 mx-auto text-orange-500/60" />
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-orange-500/70">SESSION_TOKEN_MISSING</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground/60">
                    Your current session does not have Google Contacts access. <br/>
                    <strong className="text-foreground/70">Log out and log back in with Google</strong> to enable contact sync.
                  </p>
                </div>
              ) : syncError === 'API_DISABLED' ? (
                <div className="space-y-3">
                  <Globe className="h-8 w-8 mx-auto text-red-500/60" />
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-red-500/70">PEOPLE_API_DISABLED</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground/60">
                    The Google People API is not enabled in your Cloud Console. <br/>
                    <a href="https://console.cloud.google.com/apis/library/people.googleapis.com?project=local-51c92" target="_blank" rel="noopener" className="text-primary underline font-bold">Click here to enable it</a>, then try again.
                  </p>
                </div>
              ) : syncError === 'EMPTY' ? (
                <div className="space-y-3">
                  <UserPlus className="h-8 w-8 mx-auto text-muted-foreground/30" />
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">NO_CONTACTS_FOUND</p>
                  <p className="text-[11px] text-muted-foreground/40">Your Google account has no contacts with email addresses.</p>
                </div>
              ) : (
                <div className="space-y-3 opacity-40">
                  <UserPlus className="h-8 w-8 mx-auto text-muted-foreground/30" />
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] font-mono text-primary/40">DIRECTORY_EMPTY</p>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/40">Click Sync to load your contacts</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())).map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-muted/5 transition-all text-left border-b border-border/5 last:border-b-0 hover:border-l-2 hover:border-l-primary group"
                >
                  <div className="h-10 w-10 bg-white/[0.02] flex items-center justify-center rounded-[2px] shrink-0 border border-border/10 group-hover:border-primary/40 group-hover:shadow-[0_0_10px_rgba(var(--primary),0.2)] transition-all overflow-hidden">
                    {contact.avatar ? (
                      <Image
                        src={contact.avatar}
                        alt={contact.name}
                        width={40}
                        height={40}
                        unoptimized
                        className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                      />
                    ) : (
                      <span className="text-[14px] font-black uppercase text-primary/70">{contact.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-black tracking-wide uppercase truncate text-foreground/80 group-hover:text-primary transition-colors">{contact.name}</h4>
                    <div className="flex items-center gap-2 mt-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Mail className="h-3 w-3 text-primary/60" />
                      <span className="text-[11px] truncate font-mono tracking-widest">{contact.email}</span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-2 py-1 rounded-[2px] text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                      LINK
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


