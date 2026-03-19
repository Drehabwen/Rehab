import React, { useState } from 'react';
import { useROMAnalysis, useROMCamera } from './hooks';
import { ROMEntryHub } from './components/ROMEntryHub';
import { ROMCameraStage } from './components/ROMCameraStage';
import { ROMReport } from './components/ROMReport';
import { ROMService } from './services/ROMService';
import type { JointType, MovementDirection, ROMAssessment } from './types';
import { ROM_TEXTS, getROMDirectionLabel, getROMSideLabel } from './constants/uiText';
import { StatePanel } from '@/components/layout';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import type { ActiveMeasurement } from '@/store/useMeasurementStore';

const directionFromMeasurement = (direction: string): MovementDirection => {
  return direction.replace('-', '_') as MovementDirection;
};

const MIN_CAPTURE_SECONDS = 3;
const MIN_SAMPLE_COUNT = 24;
const MIN_EFFECTIVE_ROM = 5;

const calculateMeasurementConfidence = (measurement: ActiveMeasurement): number => {
  const sampleCount = measurement.data.length;
  const durationSec = sampleCount > 0 ? measurement.data[sampleCount - 1].timestamp : 0;
  const hasFiniteBounds = Number.isFinite(measurement.maxAngle) && Number.isFinite(measurement.minAngle);
  const effectiveRom = hasFiniteBounds ? Math.max(0, measurement.maxAngle - measurement.minAngle) : 0;
  const sampleScore = Math.min(1, sampleCount / 60);
  const durationScore = Math.min(1, durationSec / 6);
  const romScore = Math.min(1, effectiveRom / 60);
  const weighted = sampleScore * 0.4 + durationScore * 0.4 + romScore * 0.2;
  return Math.max(0.35, Math.min(0.99, Number(weighted.toFixed(2))));
};

export const ROMPlugin: React.FC = () => {
  const [isEntryMode, setIsEntryMode] = useState(true);
  const [isReportMode, setIsReportMode] = useState(false);
  const [selectedJoint, setSelectedJoint] = useState<JointType>('shoulder');
  const [selectedDirection, setSelectedDirection] = useState<MovementDirection>('flexion');
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');
  const [assessment, setAssessment] = useState<ROMAssessment | null>(null);
  const [qualityFeedback, setQualityFeedback] = useState<{
    tone: 'warning' | 'error' | 'success';
    text: string;
  } | null>(null);
  const currentPatient = usePatientStore((state) => state.currentPatient);
  const currentSession = useSessionStore((state) => state.currentSession);
  const sessions = useSessionStore((state) => state.sessions);
  const startSession = useSessionStore((state) => state.startSession);

  const {
    activeMeasurements,
    isMeasuring,
    configureAssessment,
    startROMAssessment,
    stopROMAssessment,
    handleResults,
  } = useROMAnalysis();

  const {
    videoContainerRef,
    isFullscreen,
    isCameraOn,
    isMirrored,
    toggleFullscreen,
    setIsCameraOn,
  } = useROMCamera();

  const handleStartAssessment = (joint: JointType, direction: MovementDirection, side: 'left' | 'right') => {
    setSelectedJoint(joint);
    setSelectedDirection(direction);
    setSelectedSide(side);
    configureAssessment(joint, direction, side);
    setQualityFeedback(null);
    setIsEntryMode(false);
    setIsReportMode(false);
  };

  const handleStartCapture = () => {
    setQualityFeedback(null);
    startROMAssessment();
  };

  const handleStopAssessment = async () => {
    stopROMAssessment();

    const captureSummary = activeMeasurements.map((measurement) => {
      const sampleCount = measurement.data.length;
      const durationSec = sampleCount > 0 ? measurement.data[sampleCount - 1].timestamp : 0;
      const hasFiniteBounds = Number.isFinite(measurement.maxAngle) && Number.isFinite(measurement.minAngle);
      const effectiveRom = hasFiniteBounds ? Math.max(0, measurement.maxAngle - measurement.minAngle) : 0;
      return { sampleCount, durationSec, effectiveRom };
    });

    const captureValid = captureSummary.some(
      (item) =>
        item.sampleCount >= MIN_SAMPLE_COUNT &&
        item.durationSec >= MIN_CAPTURE_SECONDS &&
        item.effectiveRom >= MIN_EFFECTIVE_ROM,
    );

    if (!captureValid) {
      setQualityFeedback({
        tone: 'warning',
        text: `采样不足，请至少完成 ${MIN_CAPTURE_SECONDS} 秒、${MIN_SAMPLE_COUNT} 帧的稳定动作后再停止。`,
      });
      return;
    }

    const normalizedData = activeMeasurements.map((measurement) => ({
      joint: measurement.joint as JointType,
      direction: directionFromMeasurement(measurement.direction),
      side: measurement.side === 'left' || measurement.side === 'right' ? measurement.side : selectedSide,
      angle: Number.isFinite(measurement.currentAngle) ? measurement.currentAngle : 0,
      maxAngle: Number.isFinite(measurement.maxAngle) ? measurement.maxAngle : 0,
      minAngle: Number.isFinite(measurement.minAngle) ? measurement.minAngle : 0,
      timestamp: Date.now(),
      confidence: calculateMeasurementConfidence(measurement),
    }));

    if (normalizedData.length === 0) {
      return;
    }

    if (!currentPatient) {
      console.error('[ROMPlugin] No current patient, assessment will not be saved');
      setQualityFeedback({
        tone: 'error',
        text: '当前未选择学生档案，无法保存本次测量。请先在工作区选择学生。',
      });
      return;
    }

    const patientId = currentPatient.id;
    const sessionId =
      (currentSession?.patientId === patientId ? currentSession.id : undefined) ??
      sessions.find((session) => session.patientId === patientId)?.id ??
      (await startSession(patientId)).id;

    const newAssessment = await ROMService.saveAssessment({
      patientId,
      sessionId,
      data: normalizedData,
      status: 'completed',
    });

    setAssessment(newAssessment);
    setQualityFeedback({
      tone: 'success',
      text: '测量已保存，可继续导出结果或返回重新筛查。',
    });
    setIsReportMode(true);
  };

  const handleResetAssessment = () => {
    setIsEntryMode(true);
    setIsReportMode(false);
    setAssessment(null);
    setQualityFeedback(null);
  };

  const selectedSideLabel = getROMSideLabel(selectedJoint, selectedSide);
  const selectedJointLabel = ROM_TEXTS.joints[selectedJoint];
  const selectedDirectionLabel = getROMDirectionLabel(selectedJoint, selectedDirection);

  const handleExport = (target: ROMAssessment) => {
    const exportedData = ROMService.exportAssessment(target);
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rom-assessment-${target.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  if (isEntryMode) {
    return <ROMEntryHub onStartAssessment={handleStartAssessment} />;
  }

  if (isReportMode && assessment) {
    return (
      <div className="rehab-page custom-scrollbar">
        <div className="rehab-page-inner">
          <section className="rehab-page-title">
            <h1>关节活动度结果</h1>
            <p>{`测量部位：${selectedJointLabel} / ${selectedDirectionLabel} / ${selectedSideLabel}`}</p>
          </section>

          <div className="bento-card p-6">
            {assessment.data.length === 0 ? (
              <StatePanel
                title="未获取到有效测量数据"
                description="请返回测量页，保持动作稳定后重新开始采集。"
                actions={
                  <button onClick={handleResetAssessment} className="btn-primary">
                    返回重新测量
                  </button>
                }
              />
            ) : (
              <ROMReport assessment={assessment} onExport={handleExport} />
            )}
            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleResetAssessment} className="btn-primary">
                重新筛查
              </button>
              <button onClick={() => setIsEntryMode(true)} className="btn-secondary">
                返回选择
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ROMCameraStage
      videoContainerRef={videoContainerRef}
      isFullscreen={isFullscreen}
      isCameraOn={isCameraOn}
      isMirrored={isMirrored}
      isMeasuring={isMeasuring}
      activeMeasurements={activeMeasurements}
      selectedJoint={selectedJoint}
      selectedDirection={selectedDirection}
      selectedSide={selectedSide}
      onResults={handleResults}
      stopROMAssessment={handleStopAssessment}
      resetROMAssessment={handleResetAssessment}
      setIsCameraOn={setIsCameraOn}
      toggleFullscreen={toggleFullscreen}
      startROMAssessment={handleStartCapture}
      qualityFeedback={qualityFeedback}
    />
  );
};
