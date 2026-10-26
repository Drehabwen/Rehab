import React, { useState } from 'react';
import { VisitsScreen } from './screens/VisitsScreen';
import { NewVisitScreen } from './screens/NewVisitScreen';
import { ScaleScreen } from './screens/ScaleScreen';
import { ReportScreen } from './screens/ReportScreen';

type MobileRoute = 'visits' | 'new' | 'scale' | 'report' | 'sync';

/**
 * 移动端 v1 壳（PWA）。
 * 路由顺序对应 docs/PRD_MOBILE_V1.md 的主流程，逐屏实现。
 */
export const MobileApp: React.FC = () => {
  const [route, setRoute] = useState<MobileRoute>('visits');
  const [visit, setVisit] = useState<{ patientId: string; sessionId: string; total?: number } | null>(null);
  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-800">
      <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-white">
        <header className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
          <span className="text-[15px] font-bold text-slate-900">
            {route === 'visits' ? '今日接诊' : route === 'new' ? '新建接诊' : route === 'scale' ? '量表' : route === 'report' ? '接诊报告' : '待同步'}
          </span>
          <span className="text-[11px] text-slate-400">青跃智衡</span>
        </header>
        <section className="flex-1 overflow-hidden p-4">
          {route === 'visits' ? (
            <VisitsScreen
              onStartVisit={() => setRoute('new')}
              onOpenPatient={() => setRoute('scale')}
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
                onSaved={(total) => { setVisit({ ...visit, total }); setRoute('report'); }}
                onBack={() => setRoute('visits')}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">请先新建接诊</div>
            )
          ) : route === 'report' ? (
            <ReportScreen
              total={visit?.total ?? 0}
              onContinue={() => setRoute('visits')}
              onBack={() => setRoute('visits')}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="text-sm font-bold text-slate-900">待同步</div>
              <div className="max-w-[240px] text-xs text-slate-500">弱网与失败重试队列（下一屏实现）</div>
            </div>
          )}
        </section>
        <nav className="flex h-14 items-center justify-around border-t border-slate-200 text-[11px] text-slate-400">
          <button onClick={() => setRoute('visits')} className={route === 'visits' ? 'font-bold text-[#0f9b8e]' : ''}>接诊</button>
          <button onClick={() => setRoute('new')} className={route === 'new' ? 'font-bold text-[#0f9b8e]' : ''}>新建</button>
          <button onClick={() => setRoute('scale')} className={route === 'scale' ? 'font-bold text-[#0f9b8e]' : ''}>量表</button>
          <button onClick={() => setRoute('report')} className={route === 'report' ? 'font-bold text-[#0f9b8e]' : ''}>报告</button>
          <button onClick={() => setRoute('sync')} className={route === 'sync' ? 'font-bold text-[#0f9b8e]' : ''}>同步</button>
        </nav>
      </main>
    </div>
  );
};
