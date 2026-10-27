import React, { useState } from 'react';
import { VisitsScreen } from './screens/VisitsScreen';
import { NewVisitScreen } from './screens/NewVisitScreen';
import { ScaleScreen } from './screens/ScaleScreen';
import { ReportScreen } from './screens/ReportScreen';
import { VoiceScreen } from './screens/VoiceScreen';
import { SyncScreen } from './screens/SyncScreen';
import { ImportScreen } from './screens/ImportScreen';
import { InterventionScreen } from './screens/InterventionScreen';

type MobileRoute = 'visits' | 'new' | 'scale' | 'intervention' | 'voice' | 'report' | 'sync' | 'import';

/**
 * 移动端 v1 壳（PWA）。
 * 路由顺序对应 docs/PRD_MOBILE_V1.md 的主流程，逐屏实现。
 */
export const MobileApp: React.FC = () => {
  const [route, setRoute] = useState<MobileRoute>('visits');
  const [visit, setVisit] = useState<{ patientId: string; sessionId: string; total?: number; points?: string[]; enrollable?: boolean } | null>(null);
  return (
    <div className="min-h-screen w-screen max-w-[100vw] overflow-x-hidden bg-[#eef2f7] text-slate-800">
      <main className="mx-auto flex min-h-screen w-full flex-col overflow-x-hidden bg-white">
        <header className="flex h-12 w-full items-center justify-between gap-2 overflow-hidden border-b border-slate-200 px-3">
          <span className="text-[15px] font-bold text-slate-900">
            {route === 'visits' ? '今日接诊' : route === 'new' ? '新建接诊' : route === 'scale' ? '量表' : route === 'report' ? '接诊报告' : '待同步'}
          </span>
          <span className="shrink-0 truncate text-[11px] text-slate-400">青跃智衡</span>
        </header>
        <section className="flex-1 overflow-hidden p-4">
          {route === 'import' ? (
            <ImportScreen onDone={() => setRoute('visits')} onCancel={() => setRoute('visits')} />
          ) : route === 'visits' ? (
            <VisitsScreen
              onStartVisit={() => setRoute('new')}
              onOpenPatient={() => setRoute('scale')}
              onImport={() => setRoute('import')}
            />
          ) : route === 'new' ? (
            <NewVisitScreen
              onStarted={(patientId, sessionId) => { setVisit({ patientId, sessionId }); setRoute('scale'); }}
              onCancel={() => setRoute('visits')}
            />
          ) : route === 'scale' ? (
            visit ? (
              <ScaleScreen
                patientId={visit.patientId}
                sessionId={visit.sessionId}
                onSaved={(total) => { setVisit({ ...visit, total }); setRoute('intervention'); }}
                onBack={() => setRoute('visits')}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">请先新建接诊</div>
            )
          ) : route === 'report' ? (
            <ReportScreen
              total={visit?.total ?? 0}
              voicePoints={visit?.points}
              onContinue={() => setRoute('visits')}
              onBack={() => setRoute('visits')}
            />
          ) : route === 'intervention' ? (
            visit ? (
              <InterventionScreen
                sessionId={visit.sessionId}
                onSaved={(_followUpAt, enrollable) => { setVisit({ ...visit, enrollable }); setRoute('report'); }}
                onBack={() => setRoute('scale')}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">请先新建接诊</div>
            )
          ) : route === 'voice' ? (
            visit ? (
              <VoiceScreen
                patientId={visit.patientId}
                sessionId={visit.sessionId}
                onSaved={(_duration, points) => { setVisit({ ...visit, points }); setRoute('report'); }}
                onBack={() => setRoute('visits')}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">请先新建接诊</div>
            )
          ) : (
            <SyncScreen onBack={() => setRoute('visits')} />
          )}
        </section>
        <nav className="flex h-14 w-full items-center justify-around gap-1 overflow-hidden border-t border-slate-200 px-1 text-[11px] text-slate-400">
          <button onClick={() => setRoute('visits')} className={route === 'visits' ? 'font-bold text-[#0f9b8e]' : ''}>接诊</button>
          <button onClick={() => setRoute('new')} className={route === 'new' ? 'font-bold text-[#0f9b8e]' : ''}>新建</button>
          <button onClick={() => setRoute('voice')} className={route === 'voice' ? 'font-bold text-[#0f9b8e]' : ''}>语音</button>
          <button onClick={() => setRoute('report')} className={route === 'report' ? 'font-bold text-[#0f9b8e]' : ''}>报告</button>
          <button onClick={() => setRoute('sync')} className={route === 'sync' ? 'font-bold text-[#0f9b8e]' : ''}>同步</button>
        </nav>
      </main>
    </div>
  );
};
