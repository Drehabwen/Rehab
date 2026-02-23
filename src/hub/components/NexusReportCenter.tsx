import React from 'react';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { useReportCenter } from '../hooks/useReportCenter';
import { ReportStats } from './ReportStats';
import { ReportPatientFilter } from './ReportPatientFilter';
import { ReportList } from './ReportList';
import { ReportDetailModal } from './ReportDetailModal';
import { ReportViewer } from './ReportViewer';

export const NexusReportCenter: React.FC = () => {
  const { deleteAssessment } = useAssessmentStore();
  const {
    searchQuery,
    setSearchQuery,
    selectedPatientId,
    setSelectedPatientId,
    selectedReportHtml,
    setSelectedReportHtml,
    selectedReport,
    setSelectedReport,
    selectedAssessment,
    setSelectedAssessment,
    isFullscreen,
    setIsFullscreen,
    reportContainerRef,
    patients,
    assessments,
    filteredPatients,
    filteredAssessments,
    stats,
    exportToJson,
    exportToCsv
  } = useReportCenter();

  return (
    <div className="h-full p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
              数据与报告
            </h1>
            <p className="text-slate-400 font-medium text-lg flex items-center gap-2">
              <span className="w-8 h-[1px] bg-slate-200" />
              {selectedPatientId 
                ? `筛选: ${patients.find(p => p.id === selectedPatientId)?.name || '未知患者'}`
                : '全部患者的评估记录'
              }
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-white/50 shadow-sm">
            <div className="px-4 py-2 bg-white/80 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {assessments.length} 条记录
            </div>
          </div>
        </section>

        <ReportStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <ReportPatientFilter
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedPatientId={selectedPatientId}
            setSelectedPatientId={setSelectedPatientId}
            filteredPatients={filteredPatients}
            patients={patients}
            assessments={assessments}
          />

          <div className="lg:col-span-3">
            <ReportList
              filteredAssessments={filteredAssessments}
              patients={patients}
              onViewDetail={setSelectedAssessment}
              onExportJson={exportToJson}
              onExportCsv={exportToCsv}
              onDelete={deleteAssessment}
            />
          </div>
        </div>
      </div>

      {selectedAssessment && (
        <ReportDetailModal
          assessment={selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
          onExportJson={exportToJson}
          onExportCsv={exportToCsv}
        />
      )}

      {selectedReportHtml && selectedReport && (
        <ReportViewer
          reportHtml={selectedReportHtml}
          report={selectedReport}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onClose={() => { setSelectedReportHtml(null); setSelectedReport(null); setIsFullscreen(false); }}
          reportContainerRef={reportContainerRef}
        />
      )}
    </div>
  );
};
