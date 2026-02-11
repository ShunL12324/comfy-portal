import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AgentChatMessage, ChatMessage } from '../types';

export interface ChatSessionData {
  messages: AgentChatMessage[];
  chatHistory: ChatMessage[];
  lastUpdated: number;
}

type SessionKey = string; // "serverId:workflowId"

const buildKey = (serverId: string, workflowId: string): SessionKey =>
  `${serverId}:${workflowId}`;

interface ChatSessionState {
  sessions: Record<SessionKey, ChatSessionData>;

  /** Append a UI message and optionally the corresponding LLM history entries */
  addMessage: (
    serverId: string,
    workflowId: string,
    message: AgentChatMessage,
    historyItems?: ChatMessage[],
  ) => void;

  /** Remove a single session */
  clearSession: (serverId: string, workflowId: string) => void;

  /** Remove all sessions belonging to a server */
  clearServerSessions: (serverId: string) => void;
}

export const useChatSessionStore = create<ChatSessionState>()(
  persist(
    (set) => ({
      sessions: {},

      addMessage: (serverId, workflowId, message, historyItems) => {
        const key = buildKey(serverId, workflowId);
        set((state) => {
          const current = state.sessions[key] || {
            messages: [],
            chatHistory: [],
            lastUpdated: Date.now(),
          };
          return {
            sessions: {
              ...state.sessions,
              [key]: {
                messages: [...current.messages, message],
                chatHistory: historyItems
                  ? [...current.chatHistory, ...historyItems]
                  : current.chatHistory,
                lastUpdated: Date.now(),
              },
            },
          };
        });
      },

      clearSession: (serverId, workflowId) => {
        const key = buildKey(serverId, workflowId);
        set((state) => {
          const { [key]: _, ...rest } = state.sessions;
          return { sessions: rest };
        });
      },

      clearServerSessions: (serverId) => {
        const prefix = `${serverId}:`;
        set((state) => {
          const filtered: Record<SessionKey, ChatSessionData> = {};
          for (const [k, v] of Object.entries(state.sessions)) {
            if (!k.startsWith(prefix)) {
              filtered[k] = v;
            }
          }
          return { sessions: filtered };
        });
      },
    }),
    {
      name: 'chat-sessions-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
