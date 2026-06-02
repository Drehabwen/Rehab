/** Data and types extracted from ParentPushCenter.tsx. */

import type { ScaleAssessmentData } from '@/types/assessment';
import type { Patient } from '@/types/patient';

// ── Scale options ──

export type ScaleAdminLevel = 'parent' | 'parent_adapted' | 'clinician_only';

export const SCALE_OPTIONS: { id: string; name: string; desc: string; adminLevel: ScaleAdminLevel; levelNote: string }[] = [
  { id: 'SRS-22', name: 'SRS-22 脊柱侧弯问卷', desc: '功能/疼痛/自我形象/精神健康/满意度', adminLevel: 'parent', levelNote: '患者自评量表（PROM），适合家长端填写' },
  { id: 'ODI',   name: 'ODI 功能障碍指数',    desc: '下背痛日常活动障碍评估',           adminLevel: 'parent', levelNote: '患者自评量表（PROM），适合家长端填写' },
  { id: 'VAS',   name: 'VAS 视觉模拟疼痛评分', desc: '疼痛强度快速评估',                 adminLevel: 'parent', levelNote: '简单直观，家长可独立完成' },
];

// ── Plan template ──

export const PLAN_TEMPLATE = `# 个人化脊柱侧弯康复训练方案

## 训练原则
- Schroth 三维脊柱侧弯矫正体操
- 重点矫正（待填写）侧凸
- 配合旋转呼吸训练
- 每天坚持，循序渐进

## 热身（5分钟）
- 猫牛式：缓慢进行，配合呼吸，10次
- 骨盆前后倾：激活核心肌群，10次
- 肩胛骨回缩：改善驼背姿势，10次

## 核心训练（15分钟）
- 侧平板支撑：增强核心力量，3组×30秒
- 死虫式：核心稳定训练，3组×10次
- Schroth旋转呼吸：在矫正位进行深呼吸，5分钟

## 拉伸放松（10分钟）
- 胸椎凹侧拉伸：针对性拉伸，3组×30秒
- 胸肌拉伸：改善前侧紧张，2组×30秒
- 儿童式放松：结束放松，2分钟

## 注意事项
1. 训练时穿着舒适运动服
2. 训练前确保支具已取下
3. 如出现疼痛立即停止，联系康复师
4. 每天记录训练完成情况`;

// ── Types (component-internal) ──

export interface AssessmentInfo {
  exists: boolean; riskLabel?: string; summaryText?: string; createdAt?: string;
}

export interface PlanInfo {
  exists: boolean; planId?: string; content?: string; status?: string; createdAt?: string;
}

export interface ScaleInfo {
  taskId: string; scaleId: string; sessionId: string; status: string;
  createdAt: string; submittedAt?: string | null; scaleData?: ScaleAssessmentData | null;
}

export interface TrackingRecord {
  tracking_date: string; total_duration_min: number;
  exercises_completed: Array<{ name: string; duration: number; completed: boolean }>;
  symptoms: Record<string, any>; notes: string;
}

export interface ParentPushCenterProps {
  patient: Patient; sessionId?: string | null; therapistName?: string;
}
