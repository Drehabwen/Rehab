import React, { useState, useEffect } from 'react';
import { X, Search, User, History, ChevronRight, RefreshCw, Stethoscope } from 'lucide-react';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { getRelativeTime } from '@/lib/session-utils';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (session: Session) => void;
}

export const PatientSearchModal: React.FC<PatientSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelectPatient 
}) => {
  const [query, setQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSessions, setPatientSessions] = useState<Session[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  const { searchPatients, loadPatients } = usePatientStore();
  const { loadSessions, startSession } = useSessionStore();

  useEffect(() => {
    if (isOpen) {
      loadPatients();
      setQuery('');
      setSelectedPatient(null);
      setPatientSessions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (selectedPatient) {
      loadSessions(selectedPatient.id).then(() => {
        const allSessions = useSessionStore.getState().sessions;
        setPatientSessions(allSessions.filter(s => s.patientId === selectedPatient.id));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient]);

  const filteredPatients = searchPatients(query);

  const handleContinueSession = async (session: Session) => {
    setIsCreatingSession(true);
    try {
      const nextSession = await startSession(session.patientId);
      onSelectPatient(nextSession);
      onClose();
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleViewHistory = (session: Session) => {
    useSessionStore.getState().setCurrentSession(session);
    onSelectPatient(session);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-antey-primary/10 flex items-center justify-center">
              <Search className="text-antey-primary" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">查找患者</h2>
              <p className="text-slate-400 font-medium text-sm">搜索姓名或编号</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-all group"
          >
            <X size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>

        <div className="p-8 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入患者姓名或编号..."
              autoFocus
              className="w-full px-6 py-5 pl-16 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-antey-primary/10 focus:border-antey-primary/30 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {!selectedPatient ? (
            <div className="space-y-3">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <User size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-medium">
                    {query ? '未找到匹配的患者' : '暂无患者记录'}
                  </p>
                </div>
              ) : (
                filteredPatients.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-antey-primary/5 rounded-2xl transition-all group text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <User size={20} className="text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-slate-900">
                          {patient.name || '匿名患者'}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-black">
                          {patient.id}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 mt-1">
                        创建于 {getRelativeTime(patient.createdAt)}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-antey-primary transition-colors" />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedPatient(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-[11px] font-black uppercase tracking-wider"
              >
                <ChevronRight size={14} className="rotate-180" />
                返回搜索
              </button>

              <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] text-white">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <User size={28} className="text-white/80" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-black">
                      {selectedPatient.name || '匿名患者'}
                    </span>
                    <span className="px-3 py-1 bg-white/20 rounded-lg text-[12px] font-black">
                      {selectedPatient.id}
                    </span>
                  </div>
                  <p className="text-white/50 text-sm font-medium">
                    共接诊 {patientSessions.length} 次
                  </p>
                </div>
              </div>

              {patientSessions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <History size={14} />
                    历史接诊记录
                  </h3>
                  {patientSessions.map(session => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-black text-slate-900">{session.id}</span>
                          <span className="text-[10px] font-medium text-slate-400">
                            第 {session.sequence} 次接诊
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-400 mt-1">
                          {getRelativeTime(session.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewHistory(session)}
                          className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => handleContinueSession(session)}
                          disabled={isCreatingSession}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 bg-antey-primary text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                            "hover:shadow-lg hover:shadow-antey-primary/20",
                            isCreatingSession && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Stethoscope size={14} />
                          继续接诊
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  const newSession = { id: '', patientId: selectedPatient.id, sequence: 0 } as Session;
                  handleContinueSession(patientSessions[0] || newSession);
                }}
                disabled={isCreatingSession}
                className={cn(
                  "w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-antey-primary to-teal-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all hover:shadow-lg hover:shadow-antey-primary/20",
                  isCreatingSession && "opacity-50 cursor-not-allowed"
                )}
              >
                {isCreatingSession ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Stethoscope size={18} />
                )}
                新增接诊记录
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
