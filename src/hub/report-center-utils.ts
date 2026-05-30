import type { Assessment } from '@/types/assessment';
import type {
  AssessmentOutputSummary,
  SessionReportGenerationRequest,
  SessionReportInput,
  SessionReportInputStatus,
  SessionReportInputType,
} from '@/types/report-center';
import { sanitizeReadableText } from '@/components/shared/MarkdownReport';

const structuredCaseToMarkdown = (structuredCase: Record<string, string | undefined> | undefined): string | null => {
  if (!structuredCase) {
    return null;
  }

  const sections = Object.entries(structuredCase)
    .filter(([, value]) => Boolean(value && String(value).trim().length > 0))
    .map(([key, value]) => `## ${key}\n${String(value).trim()}`);

  return sections.length > 0 ? sections.join('\n\n') : null;
};

const getPostureStatus = (assessment: Assessment): SessionReportInputStatus => {
  if (assessment.data.posture?.markdownReport || assessment.data.posture?.auxiliaryDiagnosis) {
    return 'ready';
  }

  if (assessment.data.posture?.metrics || (assessment.data.posture?.issues?.length ?? 0) > 0) {
    return 'partial';
  }

  return 'missing';
};

const getRomStatus = (assessment: Assessment): SessionReportInputStatus => {
  if (assessment.data.rom?.summary || (assessment.data.rom?.recommendations?.length ?? 0) > 0) {
    return 'ready';
  }

  if ((assessment.data.rom?.items?.length ?? 0) > 0) {
    return 'partial';
  }

  return 'missing';
};

const getMedVoiceStatus = (assessment: Assessment): SessionReportInputStatus => {
  if (structuredCaseToMarkdown(assessment.data.medvoice?.structuredCase)) {
    return 'ready';
  }

  if (assessment.data.medvoice?.transcript?.trim()) {
    return 'partial';
  }

  return 'missing';
};

const getScaleStatus = (assessment: Assessment): SessionReportInputStatus => {
  if (assessment.data.scale?.aiInterpretation) {
    return 'ready';
  }

  if (assessment.data.scale?.totalScore !== undefined || (assessment.data.scale?.answers?.length ?? 0) > 0) {
    return 'partial';
  }

  return 'missing';
};

const getAdamsStatus = (assessment: Assessment): SessionReportInputStatus => {
  if (assessment.data.adams?.remarks) {
    return 'ready';
  }
  if (assessment.data.adams?.atrDegrees !== undefined) {
    return 'ready';
  }
  return 'missing';
};

export function getAssessmentPreview(assessment: Assessment): string | null {
  const sanitizePreview = (value?: string | null) => {
    const cleaned = sanitizeReadableText(value);
    return cleaned || null;
  };

  if (assessment.data.posture?.markdownReport) {
    return sanitizePreview(assessment.data.posture.markdownReport);
  }

  if (assessment.data.posture?.auxiliaryDiagnosis) {
    return sanitizePreview(assessment.data.posture.auxiliaryDiagnosis);
  }

  if (assessment.data.rom?.summary) {
    return sanitizePreview(assessment.data.rom.summary);
  }

  const structuredCaseMarkdown = structuredCaseToMarkdown(assessment.data.medvoice?.structuredCase);
  if (structuredCaseMarkdown) {
    return sanitizePreview(structuredCaseMarkdown);
  }

  if (assessment.data.medvoice?.transcript) {
    return sanitizePreview(assessment.data.medvoice.transcript);
  }

  if (assessment.data.scale) {
    const scale = assessment.data.scale;
    if (scale.aiInterpretation) {
      return sanitizePreview(scale.aiInterpretation);
    }
    const summary = `### ${scale.scaleName} 评估结果\n- **评估总分**: ${scale.totalScore} / ${scale.maxScore} 分\n- **填写人员**: ${
      scale.filledBy === 'therapist' ? '康复师' : scale.filledBy === 'patient' ? '患者' : '家属'
    }`;
    return sanitizePreview(summary);
  }

  if (assessment.data.adams) {
    const adams = assessment.data.adams;
    const severity = adams.atrDegrees >= 7 ? '重度旋转 (高危)' : adams.atrDegrees >= 5 ? '中度旋转 (中危)' : adams.atrDegrees > 0 ? '轻微偏斜 (低危)' : '水平正常';
    let summary = `### 亚当斯脊柱侧弯早筛结果\n`;
    summary += `- **ATR 躯干旋转角**: ${adams.atrDegrees}° (${adams.atrDirection === 'left' ? '左侧偏高' : adams.atrDirection === 'right' ? '右侧偏高' : '无明显偏斜'})\n`;
    summary += `- **临床筛查风险**: ${severity}\n`;
    if (adams.cobbAngleEstimate !== undefined) {
      summary += `- **估计 Cobb 角**: ${adams.cobbAngleEstimate}°\n`;
    }
    summary += `- **对称性状态**:\n`;
    summary += `  - 双肩高低: ${adams.shoulderAsymmetry === 'symmetrical' ? '水平对称' : adams.shoulderAsymmetry === 'left-higher' ? '左肩偏高' : '右肩偏高'}\n`;
    summary += `  - 肩胛骨对称性: ${adams.scapulaAsymmetry === 'symmetrical' ? '水平对称' : adams.scapulaAsymmetry === 'left-prominent' ? '左侧偏高' : '右侧偏高'}\n`;
    summary += `  - 腰部折痕: ${adams.waistCreaseAsymmetry === 'symmetrical' ? '对称' : adams.waistCreaseAsymmetry === 'left-deeper' ? '左侧折痕深' : '右侧折痕深'}\n`;
    summary += `  - 脊柱大致形态: ${adams.spineCurveEstimate === 'straight' ? '直线对称' : adams.spineCurveEstimate === 'c-shape-left' ? '左 C 形侧弯' : adams.spineCurveEstimate === 'c-shape-right' ? '右 C 形侧弯' : 'S 形侧弯'}\n`;
    if (adams.remarks) {
      summary += `- **康复师备注**: ${adams.remarks}\n`;
    }
    return sanitizePreview(summary);
  }

  return null;
}

export function hasAssessmentReportPayload(assessment: Assessment): boolean {
  return Boolean(getAssessmentPreview(assessment));
}

export function buildAssessmentOutputSummary(assessment: Assessment): AssessmentOutputSummary | null {
  const preview = getAssessmentPreview(assessment);

  if (assessment.type === 'posture') {
    return {
      assessmentId: assessment.id,
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      type: 'posture',
      title: '体态评估',
      status: getPostureStatus(assessment),
      createdAt: assessment.createdAt,
      preview,
      evidenceCount: Object.keys(assessment.data.posture?.metrics ?? {}).length + (assessment.data.posture?.issues?.length ?? 0),
      sourceAssessment: assessment,
    };
  }

  if (assessment.type === 'rom') {
    return {
      assessmentId: assessment.id,
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      type: 'rom',
      title: '关节活动度',
      status: getRomStatus(assessment),
      createdAt: assessment.createdAt,
      preview,
      evidenceCount: assessment.data.rom?.items?.length ?? 0,
      sourceAssessment: assessment,
    };
  }

  if (assessment.type === 'medvoice') {
    return {
      assessmentId: assessment.id,
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      type: 'medvoice',
      title: '语音病历',
      status: getMedVoiceStatus(assessment),
      createdAt: assessment.createdAt,
      preview,
      evidenceCount: Object.values(assessment.data.medvoice?.structuredCase ?? {}).filter((value) => Boolean(value && String(value).trim())).length,
      sourceAssessment: assessment,
    };
  }

  if (assessment.type === 'scale') {
    const scale = assessment.data.scale;
    return {
      assessmentId: assessment.id,
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      type: 'scale',
      title: scale?.scaleName || '量表评估',
      status: getScaleStatus(assessment),
      createdAt: assessment.createdAt,
      preview,
      evidenceCount: scale?.answers?.length ?? 0,
      sourceAssessment: assessment,
    };
  }

  if (assessment.type === 'adams') {
    return {
      assessmentId: assessment.id,
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      type: 'adams',
      title: '亚当斯筛查',
      status: getAdamsStatus(assessment),
      createdAt: assessment.createdAt,
      preview,
      evidenceCount: 6,
      sourceAssessment: assessment,
    };
  }

  return null;
}

const inputTypes: SessionReportInputType[] = ['posture', 'rom', 'medvoice', 'scale', 'adams'];

export function buildSessionReportInputs(
  assessments: Assessment[],
  patientNameById?: Map<string, string>,
): SessionReportInput[] {
  const grouped = new Map<string, SessionReportInput>();

  for (const assessment of assessments) {
    const summary = buildAssessmentOutputSummary(assessment);
    if (!summary) {
      continue;
    }

    const existing = grouped.get(assessment.sessionId) ?? {
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      patientName: patientNameById?.get(assessment.patientId),
      outputs: {},
      latestCreatedAt: assessment.createdAt,
      readiness: {
        readyCount: 0,
        partialCount: 0,
        missingTypes: [...inputTypes],
        availableTypes: [],
      },
    };

    const currentForType = existing.outputs[summary.type];
    if (!currentForType || currentForType.createdAt < summary.createdAt) {
      existing.outputs[summary.type] = summary;
    }

    if (assessment.createdAt > existing.latestCreatedAt) {
      existing.latestCreatedAt = assessment.createdAt;
    }

    grouped.set(assessment.sessionId, existing);
  }

  return Array.from(grouped.values())
    .map((sessionInput) => {
      const availableTypes = inputTypes.filter((type) => Boolean(sessionInput.outputs[type]));
      const readyCount = availableTypes.filter((type) => sessionInput.outputs[type]?.status === 'ready').length;
      const partialCount = availableTypes.filter((type) => sessionInput.outputs[type]?.status === 'partial').length;

      return {
        ...sessionInput,
        readiness: {
          readyCount,
          partialCount,
          availableTypes,
          missingTypes: inputTypes.filter((type) => !sessionInput.outputs[type]),
        },
      };
    })
    .sort((left, right) => right.latestCreatedAt - left.latestCreatedAt);
}

export function buildSessionReportGenerationRequest(sessionInput: SessionReportInput): SessionReportGenerationRequest {
  return {
    sessionId: sessionInput.sessionId,
    patientId: sessionInput.patientId,
    patientName: sessionInput.patientName,
    sourceAssessmentIds: Object.values(sessionInput.outputs).map((output) => output.assessmentId),
    readiness: sessionInput.readiness,
    posture: sessionInput.outputs.posture
      ? {
          title: sessionInput.outputs.posture.title,
          status: sessionInput.outputs.posture.status,
          preview: sessionInput.outputs.posture.preview,
          evidenceCount: sessionInput.outputs.posture.evidenceCount,
        }
      : undefined,
    rom: sessionInput.outputs.rom
      ? {
          title: sessionInput.outputs.rom.title,
          status: sessionInput.outputs.rom.status,
          preview: sessionInput.outputs.rom.preview,
          evidenceCount: sessionInput.outputs.rom.evidenceCount,
        }
      : undefined,
    medvoice: sessionInput.outputs.medvoice
      ? {
          title: sessionInput.outputs.medvoice.title,
          status: sessionInput.outputs.medvoice.status,
          preview: sessionInput.outputs.medvoice.preview,
          evidenceCount: sessionInput.outputs.medvoice.evidenceCount,
        }
      : undefined,
    scale: sessionInput.outputs.scale
      ? {
          title: sessionInput.outputs.scale.title,
          status: sessionInput.outputs.scale.status,
          preview: sessionInput.outputs.scale.preview,
          evidenceCount: sessionInput.outputs.scale.evidenceCount,
        }
      : undefined,
    adams: sessionInput.outputs.adams
      ? {
          title: sessionInput.outputs.adams.title,
          status: sessionInput.outputs.adams.status,
          preview: sessionInput.outputs.adams.preview,
          evidenceCount: sessionInput.outputs.adams.evidenceCount,
        }
      : undefined,
  };
}
