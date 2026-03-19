import React, { useMemo } from 'react';
import { Building2, School, Settings2, ShieldCheck, Users } from 'lucide-react';
import type { Assessment } from '@/types/assessment';
import type { Session } from '@/types/session';
import type { VisitTaskSummary } from '../workflow';
import { PageHeader } from '@/components/workflow';
import { Button, Card } from '@/components/ui';

interface OrganizationViewProps {
  sessions: Session[];
  assessments: Assessment[];
  visitTasks: VisitTaskSummary[];
  onOpenSettings: () => void;
}

export const OrganizationView: React.FC<OrganizationViewProps> = ({
  sessions,
  assessments,
  visitTasks,
  onOpenSettings,
}) => {
  const metrics = useMemo(() => ({
    studentCount: visitTasks.length,
    sessionCount: sessions.length,
    assessmentCount: assessments.length,
    reportReady: visitTasks.filter((task) => task.reportReady).length,
  }), [assessments.length, sessions.length, visitTasks]);

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="机构 -> 班级 -> 角色 -> 阈值 -> 审计"
          title="机构管理"
          description="当前阶段先提供机构化总览和管理入口，为后续组织结构、权限和授权模型改造预留承载页面。"
          actions={(
            <Button variant="secondary" onClick={onOpenSettings}>
              <Settings2 size={15} />
              打开系统设置
            </Button>
          )}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: '学生档案', value: metrics.studentCount, icon: Users, accent: 'bg-slate-900 text-white' },
            { label: '筛查会话', value: metrics.sessionCount, icon: Building2, accent: 'bg-blue-50 text-blue-700' },
            { label: '评估记录', value: metrics.assessmentCount, icon: School, accent: 'bg-emerald-50 text-emerald-700' },
            { label: '已出报告', value: metrics.reportReady, icon: ShieldCheck, accent: 'bg-violet-50 text-violet-700' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} variant="default" padding="md" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[30px] font-semibold leading-none text-slate-900 tabular-nums">{card.value}</div>
                    <div className="mt-2 text-sm text-slate-500">{card.label}</div>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.accent}`}>
                    <Icon size={18} />
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="text-sm font-semibold text-slate-900">本阶段已落位的机构模块</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>组织结构、角色权限、阈值配置和监护人授权将在本页面继续收敛，不再散落在历史工具页面中。</p>
              <p>当前先提供承载入口，避免后续改造继续把机构级能力挂在“数据中心”或“设置弹窗”里。</p>
            </div>
          </Card>

          <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="text-sm font-semibold text-slate-900">下一步机构化建设</div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>组织与班级结构模型</li>
              <li>角色与访问控制</li>
              <li>监护人授权状态</li>
              <li>导出与审计规则</li>
            </ul>
          </Card>

          <Card variant="default" padding="lg" className="border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="text-sm font-semibold text-slate-900">当前处理原则</div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>本轮仅调整壳层导航和模块归位，不在这一轮直接切换底层权限实现。</p>
              <p>真正的机构化能力会在后续后端模型和权限收敛后进入功能开发。</p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};
