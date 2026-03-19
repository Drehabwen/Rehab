import { APP_CONFIG } from '../config/appConfig';
import type { Assessment, AssessmentRecord, TreatmentPlanVersion } from '../types/assessment';

interface ScreeningArchiveStorage {
  assessments: Assessment[];
  treatmentPlans: TreatmentPlanVersion[];
  records: AssessmentRecord[];
  lastUpdated: string;
  version: string;
}

export interface ScreeningArchiveStatistics {
  totalAssessments: number;
  totalRecords: number;
  totalTreatmentPlans: number;
  storageUsed: number;
  storageAvailable: boolean;
  recentAssessments: Assessment[];
}

export class ScreeningArchiveService {
  private static readonly STORAGE_KEY = 'rehab_data_center';
  private static readonly VERSION = '1.0';

  static saveAssessment(assessment: Assessment): boolean {
    try {
      const archive = this.loadArchive();
      const existingIndex = archive.assessments.findIndex((item) => item.id === assessment.id);

      if (existingIndex >= 0) {
        archive.assessments[existingIndex] = assessment;
      } else {
        archive.assessments.push(assessment);
      }

      archive.lastUpdated = new Date().toISOString();
      return this.saveArchive(archive);
    } catch (error) {
      console.error('保存筛查结果失败:', error);
      return false;
    }
  }

  static saveInterventionPlan(plan: TreatmentPlanVersion): boolean {
    try {
      const archive = this.loadArchive();
      const existingIndex = archive.treatmentPlans.findIndex((item) => item.id === plan.id);

      if (existingIndex >= 0) {
        archive.treatmentPlans[existingIndex] = plan;
      } else {
        archive.treatmentPlans.push(plan);
      }

      archive.lastUpdated = new Date().toISOString();
      return this.saveArchive(archive);
    } catch (error) {
      console.error('保存干预建议失败:', error);
      return false;
    }
  }

  static saveRecord(record: AssessmentRecord): boolean {
    try {
      const archive = this.loadArchive();
      const normalizedRecord = this.normalizeRecord(record);
      const existingIndex = archive.records.findIndex((item) => item.id === normalizedRecord.id);

      if (existingIndex >= 0) {
        archive.records[existingIndex] = normalizedRecord;
      } else {
        archive.records.push(normalizedRecord);
      }

      archive.records.sort((left, right) => this.toTimestamp(right.timestamp) - this.toTimestamp(left.timestamp));
      archive.lastUpdated = new Date().toISOString();
      return this.saveArchive(archive);
    } catch (error) {
      console.error('保存筛查记录失败:', error);
      return false;
    }
  }

  static loadAssessments(patientId?: string): Assessment[] {
    const archive = this.loadArchive();
    return patientId
      ? archive.assessments.filter((item) => item.patientId === patientId)
      : archive.assessments;
  }

  static loadInterventionPlans(patientId?: string): TreatmentPlanVersion[] {
    const archive = this.loadArchive();
    return patientId
      ? archive.treatmentPlans.filter((item) => item.patientId === patientId)
      : archive.treatmentPlans;
  }

  static loadRecords(patientId?: string): AssessmentRecord[] {
    const archive = this.loadArchive();
    const sortedRecords = [...archive.records].sort(
      (left, right) => this.toTimestamp(right.timestamp) - this.toTimestamp(left.timestamp),
    );
    return patientId
      ? sortedRecords.filter((item) => item.patientId === patientId)
      : sortedRecords;
  }

  static getAssessment(id: string): Assessment | null {
    const archive = this.loadArchive();
    return archive.assessments.find((item) => item.id === id) ?? null;
  }

  static getInterventionPlan(id: string): TreatmentPlanVersion | null {
    const archive = this.loadArchive();
    return archive.treatmentPlans.find((item) => item.id === id) ?? null;
  }

  static getRecord(id: string): AssessmentRecord | null {
    const archive = this.loadArchive();
    return archive.records.find((item) => item.id === id) ?? null;
  }

  static deleteAssessment(id: string): boolean {
    try {
      const archive = this.loadArchive();
      archive.assessments = archive.assessments.filter((item) => item.id !== id);
      archive.lastUpdated = new Date().toISOString();
      return this.saveArchive(archive);
    } catch (error) {
      console.error('删除筛查结果失败:', error);
      return false;
    }
  }

  static deleteInterventionPlan(id: string): boolean {
    try {
      const archive = this.loadArchive();
      archive.treatmentPlans = archive.treatmentPlans.filter((item) => item.id !== id);
      archive.lastUpdated = new Date().toISOString();
      return this.saveArchive(archive);
    } catch (error) {
      console.error('删除干预建议失败:', error);
      return false;
    }
  }

  static deleteRecord(id: string): boolean {
    try {
      const archive = this.loadArchive();
      archive.records = archive.records.filter((item) => item.id !== id);
      archive.lastUpdated = new Date().toISOString();
      return this.saveArchive(archive);
    } catch (error) {
      console.error('删除筛查记录失败:', error);
      return false;
    }
  }

  static getStatistics(patientId?: string): ScreeningArchiveStatistics {
    const archive = this.loadArchive();
    let assessments = archive.assessments;
    let records = archive.records;
    let treatmentPlans = archive.treatmentPlans;

    if (patientId) {
      assessments = assessments.filter((item) => item.patientId === patientId);
      records = records.filter((item) => item.patientId === patientId);
      treatmentPlans = treatmentPlans.filter((item) => item.patientId === patientId);
    }

    const storageUsed = this.getStorageUsed();
    const storageAvailable = storageUsed < APP_CONFIG.STORAGE_LIMITS.CRITICAL_THRESHOLD;
    const recentAssessments = [...assessments].sort((left, right) => right.createdAt - left.createdAt).slice(0, 5);

    return {
      totalAssessments: assessments.length,
      totalRecords: records.length,
      totalTreatmentPlans: treatmentPlans.length,
      storageUsed,
      storageAvailable,
      recentAssessments,
    };
  }

  static exportArchive(patientId?: string): string {
    const archive = this.loadArchive();
    let scopedArchive: ScreeningArchiveStorage = { ...archive };

    if (patientId) {
      scopedArchive = {
        ...archive,
        assessments: archive.assessments.filter((item) => item.patientId === patientId),
        records: archive.records.filter((item) => item.patientId === patientId),
        treatmentPlans: archive.treatmentPlans.filter((item) => item.patientId === patientId),
      };
    }

    const sortedRecords = [...scopedArchive.records].sort(
      (left, right) => this.toTimestamp(right.timestamp) - this.toTimestamp(left.timestamp),
    );
    const recordOverview = {
      total: sortedRecords.length,
      latestAt: sortedRecords[0]?.timestamp ?? null,
      byType: {
        front: sortedRecords.filter((record) => record.assessmentType === 'front').length,
        side: sortedRecords.filter((record) => record.assessmentType === 'side').length,
        back: sortedRecords.filter((record) => record.assessmentType === 'back').length,
      },
      fatigueInterventions: {
        interventionCount: new Set(
          sortedRecords
            .map((record) => record.intervention?.interventionId)
            .filter((value): value is string => Boolean(value)),
        ).size,
        beforeAfterPairCount: this.countBeforeAfterPairs(sortedRecords),
      },
    };

    return JSON.stringify(
      {
        ...scopedArchive,
        records: sortedRecords,
        recordOverview,
        exportDate: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  static importArchive(jsonStr: string): boolean {
    try {
      const importedArchive = JSON.parse(jsonStr);
      const currentArchive = this.loadArchive();

      if (importedArchive.assessments) {
        currentArchive.assessments = this.upsertById(currentArchive.assessments, importedArchive.assessments);
      }

      if (importedArchive.records) {
        currentArchive.records = this.upsertById(
          currentArchive.records,
          importedArchive.records.map((record: AssessmentRecord) => this.normalizeRecord(record)),
          (left, right) => this.toTimestamp(right.timestamp) >= this.toTimestamp(left.timestamp),
        ).sort((left, right) => this.toTimestamp(right.timestamp) - this.toTimestamp(left.timestamp));
      }

      if (importedArchive.treatmentPlans) {
        currentArchive.treatmentPlans = this.upsertById(
          currentArchive.treatmentPlans,
          importedArchive.treatmentPlans,
        );
      }

      currentArchive.lastUpdated = new Date().toISOString();
      return this.saveArchive(currentArchive);
    } catch (error) {
      console.error('导入归档数据失败:', error);
      return false;
    }
  }

  static clearArchive(patientId?: string): boolean {
    try {
      if (!patientId) {
        localStorage.removeItem(this.STORAGE_KEY);
        return true;
      }

      const archive = this.loadArchive();
      archive.assessments = archive.assessments.filter((item) => item.patientId !== patientId);
      archive.records = archive.records.filter((item) => item.patientId !== patientId);
      archive.treatmentPlans = archive.treatmentPlans.filter((item) => item.patientId !== patientId);
      archive.lastUpdated = new Date().toISOString();
      return this.saveArchive(archive);
    } catch (error) {
      console.error('清空归档数据失败:', error);
      return false;
    }
  }

  private static loadArchive(): ScreeningArchiveStorage {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (!dataStr) {
        return this.getDefaultArchive();
      }

      const archive = JSON.parse(dataStr);
      if (archive.version !== this.VERSION) {
        console.warn('检测到旧版归档数据，已回退到默认结构。');
        return this.getDefaultArchive();
      }

      return {
        assessments: archive.assessments || [],
        treatmentPlans: archive.treatmentPlans || [],
        records: archive.records || [],
        lastUpdated: archive.lastUpdated || new Date().toISOString(),
        version: archive.version || this.VERSION,
      };
    } catch (error) {
      console.error('加载归档数据失败:', error);
      return this.getDefaultArchive();
    }
  }

  private static saveArchive(archive: ScreeningArchiveStorage): boolean {
    try {
      const dataStr = JSON.stringify(archive);
      const dataSize = new Blob([dataStr]).size;

      if (dataSize > APP_CONFIG.STORAGE_LIMITS.CRITICAL_THRESHOLD) {
        console.error('归档数据已达到本地存储上限。');
        return false;
      }

      localStorage.setItem(this.STORAGE_KEY, dataStr);
      return true;
    } catch (error) {
      console.error('保存归档数据失败:', error);
      return false;
    }
  }

  private static getDefaultArchive(): ScreeningArchiveStorage {
    return {
      assessments: [],
      treatmentPlans: [],
      records: [],
      lastUpdated: new Date().toISOString(),
      version: this.VERSION,
    };
  }

  private static getStorageUsed(): number {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      return dataStr ? new Blob([dataStr]).size : 0;
    } catch {
      return 0;
    }
  }

  private static upsertById<T extends { id: string }>(
    existing: T[],
    incoming: T[],
    shouldReplace: (currentItem: T, incomingItem: T) => boolean = () => true,
  ): T[] {
    const items = new Map<string, T>();
    existing.forEach((item) => items.set(item.id, item));
    incoming.forEach((item) => {
      const currentItem = items.get(item.id);
      if (!currentItem || shouldReplace(currentItem, item)) {
        items.set(item.id, item);
      }
    });
    return Array.from(items.values());
  }

  private static normalizeTimestamp(value: string): string {
    const timestamp = this.toTimestamp(value);
    return timestamp <= 0 ? new Date().toISOString() : new Date(timestamp).toISOString();
  }

  private static toTimestamp(value: string): number {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private static normalizeRecord(record: AssessmentRecord): AssessmentRecord {
    return {
      ...record,
      timestamp: this.normalizeTimestamp(record.timestamp),
      fatigueMetrics: this.normalizeFatigueMetrics(record.fatigueMetrics),
      intervention: this.normalizeIntervention(record.intervention),
    };
  }

  private static normalizeFatigueMetrics(
    metrics?: AssessmentRecord['fatigueMetrics'],
  ): AssessmentRecord['fatigueMetrics'] {
    if (!metrics) {
      return undefined;
    }

    const normalized = {
      rpe: this.normalizeNumeric(metrics.rpe),
      stabilityScore: this.normalizeNumeric(metrics.stabilityScore),
      jitterIndex: this.normalizeNumeric(metrics.jitterIndex),
      fatigueScore: this.normalizeNumeric(metrics.fatigueScore),
      recoveryScore: this.normalizeNumeric(metrics.recoveryScore),
    };

    return Object.values(normalized).some((value) => typeof value === 'number') ? normalized : undefined;
  }

  private static normalizeIntervention(
    intervention?: AssessmentRecord['intervention'],
  ): AssessmentRecord['intervention'] {
    if (!intervention?.interventionId) {
      return undefined;
    }

    const phase = intervention.phase.toLowerCase();
    const normalizedPhase: AssessmentRecord['intervention']['phase'] =
      phase === 'before' || phase === 'during' || phase === 'after' ? phase : 'during';

    return {
      ...intervention,
      phase: normalizedPhase,
    };
  }

  private static normalizeNumeric(value: unknown): number | undefined {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return undefined;
    }
    return Number(value.toFixed(4));
  }

  private static countBeforeAfterPairs(records: AssessmentRecord[]): number {
    const interventionPhaseMap = new Map<string, Set<'before' | 'during' | 'after'>>();

    records.forEach((record) => {
      const interventionId = record.intervention?.interventionId;
      const phase = record.intervention?.phase;
      if (!interventionId || !phase) {
        return;
      }

      const phases = interventionPhaseMap.get(interventionId) ?? new Set<'before' | 'during' | 'after'>();
      phases.add(phase);
      interventionPhaseMap.set(interventionId, phases);
    });

    return Array.from(interventionPhaseMap.values()).filter(
      (phases) => phases.has('before') && phases.has('after'),
    ).length;
  }

  static saveTreatmentPlan(plan: TreatmentPlanVersion): boolean {
    return this.saveInterventionPlan(plan);
  }

  static loadTreatmentPlans(patientId?: string): TreatmentPlanVersion[] {
    return this.loadInterventionPlans(patientId);
  }

  static getTreatmentPlan(id: string): TreatmentPlanVersion | null {
    return this.getInterventionPlan(id);
  }

  static deleteTreatmentPlan(id: string): boolean {
    return this.deleteInterventionPlan(id);
  }

  static exportData(patientId?: string): string {
    return this.exportArchive(patientId);
  }

  static importData(jsonStr: string): boolean {
    return this.importArchive(jsonStr);
  }

  static clearData(patientId?: string): boolean {
    return this.clearArchive(patientId);
  }
}

export { ScreeningArchiveService as DataCenterService };
export type DataStatistics = ScreeningArchiveStatistics;
