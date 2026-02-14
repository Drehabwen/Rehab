import { create } from 'zustand';
import { db } from '@/lib/db';
import type { Session } from '@/types/session';
import type { Assessment } from '@/types/assessment';
import { generateSessionId } from '@/lib/session-utils';

interface SessionState {
  sessions: Session[];
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;
  
  setCurrentSession: (session: Session | null) => void;
  startSession: (patientId: string) => Promise<Session>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  loadSessions: (patientId?: string) => Promise<void>;
  loadRecentSessions: (limit?: number) => Promise<void>;
  addAssessment: (sessionId: string, assessment: Omit<Assessment, 'id' | 'sessionId' | 'createdAt'>) => Promise<void>;
  getSessionById: (id: string) => Session | undefined;
  getNextSequence: (patientId: string) => Promise<number>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,
  
  setCurrentSession: (session) => set({ currentSession: session }),
  
  getNextSequence: async (patientId) => {
    const sessions = await db.sessions
      .where('patientId')
      .equals(patientId)
      .toArray();
    
    if (sessions.length === 0) return 1;
    
    const maxSequence = Math.max(...sessions.map(s => s.sequence));
    return maxSequence + 1;
  },
  
  startSession: async (patientId) => {
    set({ isLoading: true, error: null });
    
    const sequence = await get().getNextSequence(patientId);
    const sessionId = generateSessionId(patientId, sequence);
    
    const session: Session = {
      id: sessionId,
      patientId,
      sequence,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      assessments: [],
      status: 'active'
    };
    
    await db.sessions.add(session);
    
    set(state => ({ 
      sessions: [session, ...state.sessions],
      currentSession: session,
      isLoading: false 
    }));
    
    return session;
  },
  
  updateSession: async (id, updates) => {
    set({ isLoading: true, error: null });
    
    const existing = await db.sessions.get(id);
    if (!existing) {
      throw new Error('接诊记录不存在');
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };
    
    await db.sessions.put(updated);
    
    set(state => ({
      sessions: state.sessions.map(s => s.id === id ? updated : s),
      currentSession: state.currentSession?.id === id ? updated : state.currentSession,
      isLoading: false
    }));
  },
  
  deleteSession: async (id) => {
    set({ isLoading: true, error: null });
    
    await db.sessions.delete(id);
    await db.assessments.where('sessionId').equals(id).delete();
    
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== id),
      currentSession: state.currentSession?.id === id ? null : state.currentSession,
      isLoading: false
    }));
  },
  
  loadSessions: async (patientId) => {
    set({ isLoading: true, error: null });
    
    let query = db.sessions.orderBy('createdAt').reverse();
    
    if (patientId) {
      query = db.sessions.where('patientId').equals(patientId).reverse();
    }
    
    const sessions = await query.toArray();
    
    set({ sessions, isLoading: false });
  },
  
  loadRecentSessions: async (limit = 10) => {
    set({ isLoading: true, error: null });
    
    const sessions = await db.sessions
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray();
    
    set({ sessions, isLoading: false });
  },
  
  addAssessment: async (sessionId, assessmentData) => {
    set({ isLoading: true, error: null });
    
    const assessment: Assessment = {
      id: crypto.randomUUID(),
      sessionId,
      createdAt: Date.now(),
      ...assessmentData
    };
    
    await db.assessments.add(assessment);
    
    const session = await db.sessions.get(sessionId);
    if (session) {
      const updatedSession = {
        ...session,
        assessments: [...session.assessments, assessment],
        updatedAt: Date.now()
      };
      await db.sessions.put(updatedSession);
      
      set(state => ({
        sessions: state.sessions.map(s => s.id === sessionId ? updatedSession : s),
        currentSession: state.currentSession?.id === sessionId ? updatedSession : state.currentSession,
        isLoading: false
      }));
    } else {
      set({ isLoading: false });
    }
  },
  
  getSessionById: (id) => {
    const { sessions } = get();
    return sessions.find(s => s.id === id);
  }
}));
