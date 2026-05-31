import React, { useEffect, useState, useMemo } from 'react';
import { 
  Cloud, 
  Search, 
  UserPlus, 
  Link, 
  Trash2, 
  X, 
  Activity, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  FileText,
  User,
  ArrowRight,
  TrendingUp,
  RotateCw
} from 'lucide-react';
import { 
  IntegrationService, 
  SyncedScreeningBrief, 
  SyncedScreeningDetail 
} from '@/services/integrationService';
import { usePatientStore } from '@/store/usePatientStore';
import { Button } from '@/components/ui';
import { verifySUC } from '@/utils/suc-utils';


interface SquatLabSyncPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (patientName: string) => void;
}

const getInitialFamilyCode = (payload: any): string | null => {
  const code = String(payload?.subject?.subject_id || '').trim().toUpperCase();
  return /^[A-Z0-9]{4,6}$/.test(code) ? code : null;
};

export const SquatLabSyncPanel: React.FC<SquatLabSyncPanelProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [syncedList, setSyncedList] = useState<SyncedScreeningBrief[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SyncedScreeningDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Link to existing patient states
  const [isLinking, setIsLinking] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  const { patients, importSquatLabScreening, loadPatients } = usePatientStore();

  // Load pending list on open
  useEffect(() => {
    if (isOpen) {
      fetchSyncedList();
      setSelectedSessionId(null);
      setDetail(null);
      setIsLinking(false);
    }
  }, [isOpen]);

  // Load detailed session payload
  useEffect(() => {
    if (selectedSessionId) {
      fetchDetail(selectedSessionId);
    } else {
      setDetail(null);
    }
  }, [selectedSessionId]);

  const fetchSyncedList = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch only 'pending' (non-imported) records to clear therapist's workspace
      const data = await IntegrationService.getSyncedScreenings('pending');
      setSyncedList(data);
    } catch (err) {
      setError('无法获取同步数据，请检查康复网关服务是否正常启动');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await IntegrationService.getSyncedScreeningDetail(id);
      setDetail(data);
    } catch (err) {
      setError('加载早筛档案详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // Perform quick import as brand new patient
  const handleImportNew = async (payload: any) => {
    setActionLoading(true);
    setError(null);
    try {
      const patient = await importSquatLabScreening(payload);
      await IntegrationService.confirmScreeningIntake(payload.session_id, {
        action: 'create_patient',
        patient_id: patient.id,
        family_code: getInitialFamilyCode(payload),
      });
      
      // Success feedback
      if (onImportSuccess) {
        onImportSuccess(patient.name || '新患者');
      }
      
      // Reset layout and refresh lists
      setSelectedSessionId(null);
      fetchSyncedList();
    } catch (err) {
      setError(err instanceof Error ? err.message : '一键建档失败');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform import linking to existing patient
  const handleImportLink = async (payload: any, patientId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const patient = await importSquatLabScreening(payload, patientId);
      await IntegrationService.confirmScreeningIntake(payload.session_id, {
        action: 'link_existing_patient',
        patient_id: patient.id,
        family_code: getInitialFamilyCode(payload),
      });
      
      if (onImportSuccess) {
        onImportSuccess(patient.name || '已绑定患者');
      }
      
      setIsLinking(false);
      setSelectedSessionId(null);
      fetchSyncedList();
    } catch (err) {
      setError(err instanceof Error ? err.message : '关联导入失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRecord = async (sessionId: string) => {
    if (!window.confirm('确认要物理删除此条同步记录吗？该操作不会影响早筛终端的数据。')) return;
    setActionLoading(true);
    try {
      await IntegrationService.deleteSyncedScreening(sessionId);
      setSelectedSessionId(null);
      fetchSyncedList();
    } catch (err) {
      setError('删除失败');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter list by keyword
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return syncedList;
    return syncedList.filter(s => 
      s.subject_display_name.toLowerCase().includes(q) || 
      s.session_id.toLowerCase().includes(q) ||
      (s.subject_id && s.subject_id.toLowerCase().includes(q))
    );
  }, [syncedList, searchQuery]);

  // Filter clinical patients list to select link candidate
  const filteredPatients = useMemo(() => {
    const q = patientSearchQuery.toLowerCase().trim();
    if (!q) return patients.slice(0, 10); // Display top 10 as default
    return patients.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) || 
      p.id.toLowerCase().includes(q)
    );
  }, [patients, patientSearchQuery]);

  if (!isOpen) return null;

  const isSUCLike = searchQuery.trim().startsWith('QY-') || searchQuery.split('-').length === 5;
  const isInvalidSUC = isSUCLike && !verifySUC(searchQuery.trim());

  return (
    <div className="fixed inset-0 z-[999] flex justify-end overflow-hidden bg-slate-900/30 backdrop-blur-sm animate-fade-in">
      {/* CSS overrides inside panel for perfect isolated glassmorphism styling */}
      <style>{`
        .glass-blur-panel {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border-left: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: -10px 0 40px rgba(15, 23, 42, 0.15);
        }
        .detail-glow-card {
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .detail-glow-card:hover {
          background: rgba(255, 255, 255, 0.65);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.03);
        }
        .animate-fade-in {
          animation: panelFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes panelFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Click backdrop to close */}
      <div className="flex-1" onClick={onClose}></div>

      {/* Synchronize Master Drawer Panel */}
      <div className="glass-blur-panel slide-in-right relative flex h-full w-[450px] flex-col text-slate-800 md:w-[600px] xl:w-[720px]">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-200/60 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Cloud className="animate-pulse" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">早筛同步中心</h2>
              <p className="text-xs text-slate-500">从学校体态与脊柱侧弯三联筛查终端实时接入数据</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="m-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 shrink-0" size={16} />
            <div className="flex-1">
              <p className="font-medium">同步服务异常</p>
              <p className="mt-0.5 text-xs text-red-700/90">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-xs font-semibold text-red-500 hover:text-red-700">忽略</button>
          </div>
        )}

        {/* Session master split view */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT LIST PANEL */}
          <div className="flex flex-1 flex-col overflow-y-auto border-r border-slate-200/50 p-4 custom-scrollbar">
            {/* Search Input bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索姓名、早筛ID或SUC编码..."
                className={`w-full rounded-xl border bg-white/70 py-2 pl-9 pr-4 text-sm focus:outline-none transition-all ${
                  isInvalidSUC 
                    ? 'border-red-400 focus:border-red-500 text-red-900 bg-red-50/30' 
                    : 'border-slate-200/80 focus:border-blue-500'
                }`}
              />
              {isInvalidSUC && (
                <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 pl-1 animate-pulse">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>统一编码校验位(Luhn-10)有误，请核对</span>
                </p>
              )}
            </div>

            {/* List entries */}
            {loading ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-slate-400">
                <RotateCw className="animate-spin text-blue-500" size={24} />
                <p className="mt-2 text-xs">正在轮询最新的早筛记录...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400">
                <Cloud size={40} className="stroke-[1.2] text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">暂无待入档的筛查记录</p>
                <p className="mt-1 text-xs text-slate-400 max-w-[240px]">
                  请在早筛端 (Port 5174) 报告底部点击“同步至康复工作台”按钮推送记录
                </p>
                <Button variant="secondary" className="mt-4" onClick={fetchSyncedList}>
                  刷新列表
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>待处理数据 ({filteredList.length} 条)</span>
                  <button onClick={fetchSyncedList} className="flex items-center gap-1 hover:text-slate-700">
                    <RotateCw size={11} /> 刷新
                  </button>
                </div>
                {filteredList.map((item) => {
                  const isSelected = selectedSessionId === item.session_id;
                  const isHighRisk = item.overall_risk !== 'low';
                  
                  return (
                    <div
                      key={item.session_id}
                      onClick={() => setSelectedSessionId(item.session_id)}
                      className={`group relative flex cursor-pointer flex-col rounded-xl border p-3.5 transition-all duration-300 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500/5 shadow-[0_4px_20px_rgba(59,130,246,0.08)]' 
                          : 'border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white/80'
                      }`}
                    >
                      {/* Alert Tag on top corner */}
                      {isHighRisk && (
                        <span className="absolute right-3.5 top-3 flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                        </span>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold text-xs ${
                            isHighRisk ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'
                          }`}>
                            {item.subject_display_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800 group-hover:text-slate-900">
                              {item.subject_display_name}
                            </div>
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              ID: {item.subject_id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={`text-slate-400 transition-transform duration-200 ${
                          isSelected ? 'translate-x-1 text-blue-500' : ''
                        }`} size={16} />
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                        <span>筛查: {new Date(item.created_at).toLocaleDateString()}</span>
                        <span className={`rounded px-1.5 py-0.5 font-semibold ${
                          item.overall_risk === 'low' ? 'bg-green-50 text-green-700' : 
                          item.overall_risk === 'attention' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {item.overall_risk === 'low' ? '低风险' : 
                           item.overall_risk === 'attention' ? '需关注' : '高危审核'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT DETAIL INSPECT PANEL */}
          <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50/50 p-4 custom-scrollbar">
            {detailLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                <RotateCw className="animate-spin text-blue-500" size={24} />
                <p className="mt-2 text-xs">正在解析筛查档案与证据链...</p>
              </div>
            ) : detail && detail.payload ? (
              <div className="flex flex-col h-full">
                {/* Subject brief info */}
                <div className="mb-4 rounded-xl bg-white/70 border border-slate-200/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <User size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-800">{detail.payload.subject.display_name}</span>
                        <span className="text-xs text-slate-400">
                          {detail.payload.subject.sex === 'male' ? '男' : detail.payload.subject.sex === 'female' ? '女' : '未知'} · {detail.payload.subject.age ?? '年龄未知'}岁
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">筛查时间: {new Date(detail.payload.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Sub details tabs */}
                <div className="flex-1 space-y-4">
                  {/* Risks and integrated reports */}
                  {detail.payload.integrated_report && (
                    <div className="detail-glow-card p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">早筛综合诊断</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          detail.payload.integrated_report.overall_risk === 'low' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {detail.payload.integrated_report.overall_risk === 'low' ? '低风险' : '脊柱侧弯待审'}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-slate-800">{detail.payload.integrated_report.title}</h4>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed bg-white/40 p-2.5 rounded-lg border border-slate-200/30">
                        {detail.payload.integrated_report.summary}
                      </p>
                      
                      {detail.payload.integrated_report.recommendations && detail.payload.integrated_report.recommendations.length > 0 && (
                        <div className="mt-2.5">
                          <div className="text-[10px] font-bold text-slate-400">推荐建议:</div>
                          <ul className="mt-1 list-inside list-disc text-xs text-slate-500 space-y-0.5">
                            {detail.payload.integrated_report.recommendations.slice(0, 3).map((r, i) => (
                              <li key={i} className="truncate">{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Protocols indicators */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">三联筛查核心指标</div>
                    {detail.payload.protocol_results.map((result) => {
                      const isPosture = result.protocol === 'static_posture';
                      const isAdams = result.protocol === 'adams_forward_bend';
                      
                      return (
                        <div key={result.result_id} className="rounded-xl border border-slate-200 bg-white/60 p-3 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-800">
                              {isPosture ? '静态姿势评估' : isAdams ? 'Adams前屈侧弯筛查' : '深蹲动力学筛查'}
                            </span>
                            <span className={result.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}>
                              {result.status === 'completed' ? '已完成' : '未进行'}
                            </span>
                          </div>
                          
                          {/* Metrics readout */}
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-50/50 p-2 rounded-lg">
                            <div>质量评分: <span className="font-semibold text-slate-700">{result.capture_quality}</span></div>
                            {result.psi_score != null && (
                              <div>对称指数 (PSI): <span className="font-semibold text-slate-700">{result.psi_score}</span></div>
                            )}
                            {result.severity_grades && Object.entries(result.severity_grades).map(([key, val]) => (
                              <div key={key} className="capitalize">{key}偏离: <span className="font-semibold text-red-600">{val}</span></div>
                            ))}
                          </div>

                          {result.findings && result.findings.length > 0 && (
                            <div className="mt-2 text-slate-600">
                              <span className="font-bold text-slate-700">主要发现:</span> {result.findings.join(' · ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* LLM clinical context */}
                  {detail.payload.llm_analysis && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                      <div className="flex items-center gap-1 text-xs font-bold text-blue-800">
                        <TrendingUp size={14} />
                        <span>AI 辅助康复评估</span>
                      </div>
                      {detail.payload.llm_analysis.clinical_context && (
                        <div className="mt-2 text-xs text-slate-600 leading-relaxed">
                          <p className="font-bold text-slate-700">医学背景:</p>
                          <p className="mt-0.5">{detail.payload.llm_analysis.clinical_context}</p>
                        </div>
                      )}
                      {detail.payload.llm_analysis.suggestions && detail.payload.llm_analysis.suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-bold text-slate-500">康复建议规划:</p>
                          <ul className="mt-1 list-inside list-disc text-xs text-slate-600 space-y-0.5">
                            {detail.payload.llm_analysis.suggestions.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Operations Footer */}
                <div className="mt-6 border-t border-slate-200/60 pt-4 space-y-2 bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  {isLinking ? (
                    <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/80 p-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-blue-900">请选择临床患者进行档案关联</h5>
                        <button onClick={() => setIsLinking(false)} className="text-xs text-slate-400 hover:text-slate-600">取消</button>
                      </div>
                      
                      {/* Search clinical patients */}
                      <input
                        type="text"
                        value={patientSearchQuery}
                        onChange={(e) => setPatientSearchQuery(e.target.value)}
                        placeholder="输入姓名或ID进行搜索..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                        autoFocus
                      />

                      {/* Matching list */}
                      <div className="max-h-[140px] overflow-y-auto space-y-1 custom-scrollbar">
                        {filteredPatients.length === 0 ? (
                          <div className="text-center py-2 text-[10px] text-slate-400">无匹配临床患者档案</div>
                        ) : (
                          filteredPatients.map(p => (
                            <div 
                              key={p.id}
                              onClick={() => handleImportLink(detail.payload, p.id)}
                              className="flex items-center justify-between cursor-pointer rounded-lg bg-white p-2 text-xs border border-slate-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{p.name || '未命名'}</span>
                                <span className="text-[10px] text-slate-400 ml-2">ID: {p.id}</span>
                              </div>
                              <ArrowRight size={13} className="text-blue-500" />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        onClick={() => handleImportNew(detail.payload)}
                        disabled={actionLoading}
                        className="flex-1 justify-center gap-1.5 py-2.5"
                      >
                        <UserPlus size={16} />
                        一键建档导入
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setIsLinking(true)}
                        disabled={actionLoading}
                        className="flex-1 justify-center gap-1.5 py-2.5"
                      >
                        <Link size={16} />
                        关联已有患者
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleDeleteRecord(detail.session_id)}
                        disabled={actionLoading}
                        className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200/50"
                        aria-label="删除记录"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-400">
                <FileText size={48} className="stroke-[1] text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">未选择筛查档案</p>
                <p className="text-xs text-slate-400 max-w-[200px] mt-1">请从左侧列表选择一条数据，进行诊断分析与入档操作</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
