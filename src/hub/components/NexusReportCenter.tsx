import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  Database,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  FileText,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { usePatientStore } from '@/store/usePatientStore';
import type { Assessment } from '@/types/assessment';
import { PageTitleSection, StatePanel, UnifiedStatusBadge } from '@/components/layout';

interface NexusReportCenterProps {
  mode?: 'datacenter' | 'reports';
}

type StatusFilter = 'all' | Assessment['status'];
type TypeFilter = 'all' | Assessment['type'];

const typeLabelMap: Record<Assessment['type'], string> = {
  posture: '体态评估',
  rom: '关节活动度',
  medvoice: '语音接诊',
  combined: '综合评估',
};

const modeLabelMap: Record<Assessment['mode'], string> = {
  realtime: '实时',
  stepped: '分步',
  voice: '语音',
};

const statusToneMap: Record<Assessment['status'], 'success' | 'processing' | 'warning'> = {
  completed: 'success',
  reviewed: 'processing',
  pending: 'warning',
};

const statusTextMap: Record<Assessment['status'], string> = {
  completed: '已完成',
  reviewed: '已复核',
  pending: '待处理',
};

function hasReportPayload(assessment: Assessment): boolean {
  if (assessment.data.posture?.markdownReport || assessment.data.posture?.auxiliaryDiagnosis) return true;
  if (assessment.data.medvoice?.structuredCase || assessment.data.medvoice?.transcript) return true;
  if (assessment.data.rom?.summary || (assessment.data.rom?.items?.length || 0) > 0) return true;
  return false;
}

function getReportStatus(assessment: Assessment): { tone: 'success' | 'processing' | 'warning'; text: string } {
  if (assessment.type === 'posture') {
    if (assessment.data.posture?.markdownReport) return { tone: 'success', text: '深度报告' };
    if (assessment.data.posture?.auxiliaryDiagnosis) return { tone: 'processing', text: '基础报告' };
    return { tone: 'warning', text: '待生成' };
  }

  if (assessment.type === 'rom') {
    if (assessment.data.rom?.summary) return { tone: 'success', text: 'ROM报告' };
    if ((assessment.data.rom?.items?.length || 0) > 0) return { tone: 'processing', text: '原始数据' };
    return { tone: 'warning', text: '待生成' };
  }

  if (assessment.type === 'medvoice') {
    if (assessment.data.medvoice?.structuredCase) return { tone: 'success', text: '病历已结构化' };
    if (assessment.data.medvoice?.transcript) return { tone: 'processing', text: '仅转写' };
    return { tone: 'warning', text: '待生成' };
  }

  return { tone: 'processing', text: '可查看' };
}

function getReportPreview(assessment: Assessment): string | null {
  if (assessment.data.posture?.markdownReport) return assessment.data.posture.markdownReport;
  if (assessment.data.posture?.auxiliaryDiagnosis) return assessment.data.posture.auxiliaryDiagnosis;
  if (assessment.data.rom?.summary) return assessment.data.rom.summary;

  if (assessment.data.medvoice?.structuredCase) {
    const lines = Object.entries(assessment.data.medvoice.structuredCase)
      .filter(([, value]) => Boolean(value && String(value).trim().length > 0))
      .map(([key, value]) => `## ${key}\n${String(value)}`);
    return lines.join('\n\n');
  }

  if (assessment.data.medvoice?.transcript) {
    return assessment.data.medvoice.transcript;
  }

  return null;
}

function getReportExportLabel(assessment: Assessment): string {
  if (assessment.type === 'posture') return 'JSON / CSV / 报告文本';
  if (assessment.type === 'medvoice') return 'JSON / CSV / 病历文本';
  if (assessment.type === 'rom') return 'JSON / CSV / 摘要文本';
  return 'JSON / CSV';
}

export const NexusReportCenter: React.FC<NexusReportCenterProps> = ({ mode = 'datacenter' }) => {
  const { assessments, loadAssessments, deleteAssessment } = useAssessmentStore();
  const { patients, loadPatients } = usePatientStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [selectedReportMarkdown, setSelectedReportMarkdown] = useState<string | null>(null);

  useEffect(() => {
    loadPatients();
    loadAssessments();
  }, [loadPatients, loadAssessments]);

  const patientMap = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach((p) => map.set(p.id, p.name || `患者 ${p.id}`));
    return map;
  }, [patients]);

  const searchLower = searchQuery.toLowerCase();

  const filteredPatients = useMemo(() => {
    return patients.filter((p) =>
      (p.name || '').toLowerCase().includes(searchLower) ||
      p.id.toLowerCase().includes(searchLower)
    );
  }, [patients, searchLower]);

  const scopedAssessments = useMemo(() => {
    let list = selectedPatientId
      ? assessments.filter((a) => a.patientId === selectedPatientId)
      : assessments;

    if (mode === 'reports') {
      list = list.filter(hasReportPayload);
    }

    if (statusFilter !== 'all') {
      list = list.filter((item) => item.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      list = list.filter((item) => item.type === typeFilter);
    }

    return list;
  }, [assessments, selectedPatientId, mode, statusFilter, typeFilter]);

  const filteredAssessments = useMemo(() => {
    if (!searchLower) return scopedAssessments;

    return scopedAssessments.filter((assessment) => {
      const patientName = (patientMap.get(assessment.patientId) || '').toLowerCase();
      return (
        assessment.id.toLowerCase().includes(searchLower) ||
        assessment.patientId.toLowerCase().includes(searchLower) ||
        patientName.includes(searchLower)
      );
    });
  }, [scopedAssessments, searchLower, patientMap]);

  const stats = useMemo(() => {
    const weeklyCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyCount = scopedAssessments.filter((a) => a.createdAt > weeklyCutoff).length;
    const reportReadyCount = scopedAssessments.filter((a) => getReportStatus(a).tone === 'success').length;

    return [
      {
        label: mode === 'reports' ? '可查看报告' : '评估记录',
        value: scopedAssessments.length,
        icon: Database,
        tone: 'text-blue-600 bg-blue-50',
      },
      { label: '患者人数', value: patients.length, icon: User, tone: 'text-emerald-600 bg-emerald-50' },
      {
        label: mode === 'reports' ? '报告就绪' : '近7天新增',
        value: mode === 'reports' ? reportReadyCount : weeklyCount,
        icon: Activity,
        tone: 'text-amber-600 bg-amber-50',
      },
    ];
  }, [scopedAssessments, patients.length, mode]);

  const exportToJson = (assessment: Assessment) => {
    const dataStr = JSON.stringify(assessment, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-${assessment.id}-${new Date(assessment.createdAt).toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCsv = (assessment: Assessment) => {
    let csvContent = '';

    if (assessment.data.posture?.metrics) {
      const metrics = assessment.data.posture.metrics;
      csvContent = 'metric,value\n' + Object.entries(metrics).map(([k, v]) => `${k},${v}`).join('\n');
    } else if (assessment.data.rom?.items) {
      csvContent = 'joint,direction,side,angle,maxAngle,minAngle,confidence\n';
      assessment.data.rom.items.forEach((item) => {
        csvContent += `${item.joint},${item.direction},${item.side},${item.angle},${item.maxAngle},${item.minAngle},${item.confidence}\n`;
      });
    } else if (assessment.data.medvoice) {
      const mv = assessment.data.medvoice;
      csvContent = 'field,value\n';
      csvContent += `patient_name,${mv.patientInfo.name}\n`;
      csvContent += `visit_date,${mv.patientInfo.visit_date}\n`;
      csvContent += `view_mode,${mv.viewMode}\n`;
      if (mv.structuredCase) {
        Object.entries(mv.structuredCase).forEach(([k, v]) => {
          if (v) csvContent += `${k},${String(v).replace(/\n/g, ' ')}\n`;
        });
      }
    }

    if (!csvContent) return;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-${assessment.id}-${new Date(assessment.createdAt).toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openReportText = (assessment: Assessment) => {
    const content = getReportPreview(assessment);
    if (!content) return;
    setSelectedReportMarkdown(content);
  };

  const exportReportText = (assessment: Assessment) => {
    const content = getReportPreview(assessment);
    if (!content) return;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${assessment.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner">
        <PageTitleSection
          title={mode === 'reports' ? '报告中心' : '数据中心'}
          description={
            selectedPatientId
              ? `已筛选：${patientMap.get(selectedPatientId) || 'Unknown Patient'}`
              : mode === 'reports'
                ? '突出报告状态、生成时间与查看入口'
                : '高密度列表查看评估记录、时间、类型与状态'
          }
          right={<span className="status-badge status-disabled">共 {filteredAssessments.length} 条</span>}
        />

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((item) => (
            <div key={item.label} className="bento-card p-5 flex items-center justify-between">
              <div>
                <div className="text-2xl font-semibold text-slate-900">{item.value}</div>
                <div className="text-sm text-slate-500 mt-1">{item.label}</div>
              </div>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.tone)}>
                <item.icon size={18} />
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <aside className="bento-card p-4">
            <div className="text-sm font-semibold text-slate-900 mb-3">筛选条件</div>

            <label className="relative block mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索患者或记录"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-sm"
              />
            </label>

            <div className="space-y-2 mb-3">
              <div className="text-xs text-slate-500">记录状态</div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'all', label: '全部' },
                  { id: 'completed', label: '已完成' },
                  { id: 'reviewed', label: '已复核' },
                  { id: 'pending', label: '待处理' },
                ] as Array<{ id: StatusFilter; label: string }>).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setStatusFilter(item.id)}
                    className={cn(
                      'h-8 rounded-lg text-xs border',
                      statusFilter === item.id
                        ? 'border-antey-primary bg-antey-primary/10 text-antey-primary'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">记录类型</div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value="all">全部类型</option>
                <option value="posture">体态评估</option>
                <option value="rom">关节活动度</option>
                <option value="medvoice">语音接诊</option>
                <option value="combined">综合评估</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              <button
                onClick={() => setSelectedPatientId(null)}
                className={cn(
                  'w-full px-3 py-2 rounded-xl text-left text-sm border',
                  !selectedPatientId
                    ? 'border-antey-primary bg-antey-primary/10 text-antey-primary'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700',
                )}
              >
                全部患者
              </button>

              {filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl text-left text-sm border',
                    selectedPatientId === patient.id
                      ? 'border-antey-primary bg-antey-primary/10 text-antey-primary'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700',
                  )}
                >
                  <div className="font-medium truncate">{patient.name || `患者 ${patient.id}`}</div>
                  <div className="text-xs text-slate-500 truncate">{patient.id}</div>
                </button>
              ))}
            </div>
          </aside>

          <div className="bento-card p-0 overflow-hidden">
            {mode === 'reports' ? (
              <>
                <div className="px-4 py-3 border-b border-slate-200 text-xs text-slate-500 grid grid-cols-[1.6fr_1fr_0.9fr_1fr_auto] gap-3">
                  <span>报告主信息</span>
                  <span>生成时间</span>
                  <span>报告状态</span>
                  <span>导出方式</span>
                  <span>查看</span>
                </div>

                {filteredAssessments.length === 0 ? (
                  <div className="p-5">
                    <StatePanel
                      title="暂无报告记录"
                      description="完成评估并生成报告后会显示在这里。"
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {filteredAssessments.map((assessment) => {
                      const reportStatus = getReportStatus(assessment);
                      const reportText = getReportPreview(assessment);

                      return (
                        <div key={assessment.id} className="px-4 py-3 grid grid-cols-[1.6fr_1fr_0.9fr_1fr_auto] gap-3 items-center hover:bg-slate-50">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{typeLabelMap[assessment.type]}</div>
                            <div className="text-xs text-slate-500 truncate">{patientMap.get(assessment.patientId) || assessment.patientId}</div>
                          </div>

                          <div className="text-sm text-slate-600">
                            {new Date(assessment.createdAt).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>

                          <UnifiedStatusBadge status={reportStatus.tone} text={reportStatus.text} />
                          <span className="text-xs text-slate-500">{getReportExportLabel(assessment)}</span>

                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => exportToJson(assessment)}
                              className="btn-icon"
                              title="导出 JSON"
                            >
                              <FileJson size={14} />
                            </button>
                            <button
                              onClick={() => exportToCsv(assessment)}
                              className="btn-icon"
                              title="导出 CSV"
                            >
                              <FileSpreadsheet size={14} />
                            </button>
                            <button
                              onClick={() => exportReportText(assessment)}
                              className={cn('btn-icon', !reportText && 'opacity-50 cursor-not-allowed')}
                              disabled={!reportText}
                              title="导出文本"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              onClick={() => reportText ? openReportText(assessment) : setSelectedAssessment(assessment)}
                              className="btn-secondary h-9 px-3"
                            >
                              查看
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-slate-200 text-xs text-slate-500 grid grid-cols-[1.8fr_1fr_1fr_1fr_auto] gap-3">
                  <span>主信息</span>
                  <span>患者</span>
                  <span>时间</span>
                  <span>状态</span>
                  <span>操作</span>
                </div>

                {filteredAssessments.length === 0 ? (
                  <div className="p-5">
                    <StatePanel
                      title="暂无评估记录"
                      description="请先完成评估流程。"
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {filteredAssessments.map((assessment) => (
                      <div key={assessment.id} className="px-4 py-3 grid grid-cols-[1.8fr_1fr_1fr_1fr_auto] gap-3 items-center hover:bg-slate-50">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{typeLabelMap[assessment.type]}</div>
                          <div className="text-xs text-slate-500 truncate">{assessment.id}</div>
                        </div>

                        <div className="text-sm text-slate-700 truncate">{patientMap.get(assessment.patientId) || assessment.patientId}</div>
                        <div className="text-sm text-slate-500">
                          {new Date(assessment.createdAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>

                        <div className="flex items-center gap-2">
                          <UnifiedStatusBadge status={statusToneMap[assessment.status]} text={statusTextMap[assessment.status]} />
                          <span className="text-xs text-slate-500">{modeLabelMap[assessment.mode]}</span>
                        </div>

                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => exportToJson(assessment)} className="btn-icon" title="导出 JSON"><FileJson size={14} /></button>
                          <button onClick={() => exportToCsv(assessment)} className="btn-icon" title="导出 CSV"><FileSpreadsheet size={14} /></button>
                          <button onClick={() => deleteAssessment(assessment.id)} className="btn-icon" title="删除"><Trash2 size={14} /></button>
                          <button onClick={() => setSelectedAssessment(assessment)} className="btn-secondary h-9 px-3">详情<ExternalLink size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {selectedAssessment ? (
        <div className="fixed inset-0 z-[90] bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center p-4 md:p-8">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_20px_40px_rgba(15,23,42,0.18)] w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900">{typeLabelMap[selectedAssessment.type]} 详情</div>
                <div className="text-xs text-slate-500 mt-1 inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><Calendar size={12} />{new Date(selectedAssessment.createdAt).toLocaleString('zh-CN')}</span>
                  <span className="inline-flex items-center gap-1"><User size={12} />{patientMap.get(selectedAssessment.patientId) || selectedAssessment.patientId}</span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedAssessment(null)}><X size={14} /></button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar max-h-[calc(85vh-146px)] space-y-4">
              {selectedAssessment.data.posture ? (
                <section className="bento-card p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-2">体态评估数据</div>
                  {selectedAssessment.data.posture.issues?.length ? (
                    <div className="text-sm text-slate-600">检出问题 {selectedAssessment.data.posture.issues.length} 项</div>
                  ) : (
                    <div className="text-sm text-slate-500">暂无问题列表</div>
                  )}

                  {(selectedAssessment.data.posture.markdownReport || selectedAssessment.data.posture.auxiliaryDiagnosis) ? (
                    <button
                      className="btn-primary mt-3"
                      onClick={() => setSelectedReportMarkdown(selectedAssessment.data.posture?.markdownReport || selectedAssessment.data.posture?.auxiliaryDiagnosis || null)}
                    >
                      <FileText size={14} />
                      查看报告内容
                    </button>
                  ) : null}
                </section>
              ) : null}

              {selectedAssessment.data.rom ? (
                <section className="bento-card p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-2">关节活动度数据</div>
                  <div className="text-sm text-slate-600">记录项：{selectedAssessment.data.rom.items.length}</div>
                  {selectedAssessment.data.rom.summary ? <div className="text-sm text-slate-500 mt-2">{selectedAssessment.data.rom.summary}</div> : null}
                </section>
              ) : null}

              {selectedAssessment.data.medvoice ? (
                <section className="bento-card p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-2">语音接诊数据</div>
                  <div className="text-sm text-slate-600">模式：{selectedAssessment.data.medvoice.viewMode}</div>
                  <div className="text-sm text-slate-500 mt-2 line-clamp-4">{selectedAssessment.data.medvoice.transcript || '暂无转写文本'}</div>
                </section>
              ) : null}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => exportToJson(selectedAssessment)}><FileJson size={14} /> JSON</button>
              <button className="btn-secondary" onClick={() => exportToCsv(selectedAssessment)}><FileSpreadsheet size={14} /> CSV</button>
              <button className="btn-primary" onClick={() => setSelectedAssessment(null)}>关闭</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedReportMarkdown ? (
        <div className="fixed inset-0 z-[95] bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4 md:p-8">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_20px_40px_rgba(15,23,42,0.18)] w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">报告内容</div>
              <button className="btn-icon" onClick={() => setSelectedReportMarkdown(null)}><X size={14} /></button>
            </div>
            <pre className="p-5 overflow-auto custom-scrollbar text-sm text-slate-700 whitespace-pre-wrap max-h-[calc(85vh-76px)]">{selectedReportMarkdown}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
};
