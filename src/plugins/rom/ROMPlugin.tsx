import React, { useState } from 'react';
import { useROMAnalysis, useROMCamera } from './hooks';
import { ROMEntryHub } from './components/ROMEntryHub';
import { ROMCameraStage } from './components/ROMCameraStage';
import { ROMReport } from './components/ROMReport';
import { ROMService } from './services/ROMService';
import type { JointType, MovementDirection, ROMAssessment } from './types';
import { ROM_TEXTS } from './constants/uiText';
import { StatePanel } from '@/components/layout';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';

const directionFromMeasurement = (direction: string): MovementDirection => {
  return direction.replace('-', '_') as MovementDirection;
};

export const ROMPlugin: React.FC = () => {
  const [isEntryMode, setIsEntryMode] = useState(true);
  const [isReportMode, setIsReportMode] = useState(false);
  const [selectedJoint, setSelectedJoint] = useState<JointType>('shoulder');
  const [selectedDirection, setSelectedDirection] = useState<MovementDirection>('flexion');
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');
  const [assessment, setAssessment] = useState<ROMAssessment | null>(null);
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
    setIsEntryMode(false);
    setIsReportMode(false);
  };

  const handleStopAssessment = async () => {
    stopROMAssessment();

    const normalizedData = activeMeasurements.map((m) => ({
      joint: m.joint as JointType,
      direction: directionFromMeasurement(m.direction),
      side: m.side === 'left' || m.side === 'right' ? m.side : selectedSide,
      angle: Number.isFinite(m.currentAngle) ? m.currentAngle : 0,
      maxAngle: Number.isFinite(m.maxAngle) ? m.maxAngle : 0,
      minAngle: Number.isFinite(m.minAngle) ? m.minAngle : 0,
      timestamp: Date.now(),
      confidence: 0.95,
    }));

    if (normalizedData.length === 0) {
      return;
    }

    if (!currentPatient) {
      console.error('[ROMPlugin] No current patient, assessment will not be saved');
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
    setIsReportMode(true);
  };

  const handleResetAssessment = () => {
    setIsEntryMode(true);
    setIsReportMode(false);
    setAssessment(null);
  };

  const selectedSideLabel = selectedSide === 'left' ? '左侧' : '右侧';
  const selectedJointLabel = ROM_TEXTS.joints[selectedJoint];
  const selectedDirectionLabel = ROM_TEXTS.directions[selectedDirection];

  const handleExport = (target: ROMAssessment) => {
    const exportedData = ROMService.exportAssessment(target);
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rom-assessment-${target.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
                title="未获得有效测量数据"
                description="请返回测量页，保持动作稳定后重新开始测量。"
                actions={<button onClick={handleResetAssessment} className="btn-primary">返回重新测量</button>}
              />
            ) : (
              <ROMReport assessment={assessment} onExport={handleExport} />
            )}
            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleResetAssessment} className="btn-primary">重新评估</button>
              <button onClick={() => setIsEntryMode(true)} className="btn-secondary">返回选择</button>
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
      startROMAssessment={startROMAssessment}
      stopROMAssessment={handleStopAssessment}
      resetROMAssessment={handleResetAssessment}
      setIsCameraOn={setIsCameraOn}
      toggleFullscreen={toggleFullscreen}
    />
  );
};
