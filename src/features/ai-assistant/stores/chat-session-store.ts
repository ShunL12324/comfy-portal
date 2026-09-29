import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UIMessage } from 'ai';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ChatSessionData {
  /**
   * AI SDK UI messages, the single source of truth for a transcript.
   *
   * Previously this was split into a UI list and a parallel LLM history list,
   * which drifted apart whenever a turn errored (the user message landed in one
   * but not the other).
   */
  messages: UIMessage[];
  lastUpdated: number;
}

type SessionKey = string; // "serverId:workflowId"

const buildKey = (serverId: string, workflowId: string): SessionKey =>
  `${serverId}:${workflowId}`;

interface ChatSessionState {
  sessions: Record<SessionKey, ChatSessionData>;

  /** Replace a session's transcript (called as the agent streams). */
  setMessages: (serverId: string, workflowId: string, messages: UIMessage[]) => void;

  /** Remove a single session */
  clearSession: (serverId: string, workflowId: string) => void;

  /** Remove all sessions belonging to a server */
  clearServerSessions: (serverId: string) => void;
}

export const useChatSessionStore = create<ChatSessionState>()(
  persist(
    (set) => ({
      sessions: {},

      setMessages: (serverId, workflowId, messages) => {
        const key = buildKey(serverId, workflowId);
        set((state) => ({
          sessions: {
            ...state.sessions,
            [key]: { messages, lastUpdated: Date.now() },
          },
        }));
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
      // v1 switched transcripts to UIMessage. The old shape can't be converted
      // faithfully (tool activity was never persisted), so drop it.
      version: 1,
      migrate: () => ({ sessions: {} }) as Partial<ChatSessionState>,
    },
  ),
);
