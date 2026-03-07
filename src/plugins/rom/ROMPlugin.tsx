import React, { useState } from 'react';
import { useROMAnalysis, useROMCamera } from './hooks';
import { ROMEntryHub } from './components/ROMEntryHub';
import { ROMCameraStage } from './components/ROMCameraStage';
import { ROMReport } from './components/ROMReport';
import { ROMService } from './services/ROMService';
import type { JointType, MovementDirection, ROMAssessment } from './types';

export const ROMPlugin: React.FC = () => {
  const [isEntryMode, setIsEntryMode] = useState(true);
  const [isReportMode, setIsReportMode] = useState(false);
  const [selectedJoint, setSelectedJoint] = useState<JointType>('shoulder');
  const [selectedDirection, setSelectedDirection] = useState<MovementDirection>('flexion');
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');
  const [assessment, setAssessment] = useState<ROMAssessment | null>(null);
  
  const { 
    activeMeasurements,
    isMeasuring,
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
    setIsEntryMode(false);
    setIsReportMode(false);
  };
  
  const handleStopAssessment = async () => {
    stopROMAssessment();
    
    // 保存评估数据
    const newAssessment = await ROMService.saveAssessment({
      patientId: 'temp-patient', // 实际应用中从患者选择获取
      sessionId: 'temp-session',
      data: activeMeasurements.map(m => ({
        joint: m.joint as any,
        direction: m.direction as any,
        side: m.side,
        angle: m.currentAngle,
        maxAngle: m.maxAngle,
        minAngle: m.minAngle,
        timestamp: Date.now(),
        confidence: 0.95,
      })),
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
  
  const handleExport = (assessment: ROMAssessment) => {
    // 实现导出逻辑
    const exportedData = ROMService.exportAssessment(assessment);
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rom-assessment-${assessment.id}.json`;
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
      <div className="h-full p-8 overflow-y-auto">
        <ROMReport assessment={assessment} onExport={handleExport} />
        <div className="mt-8 flex gap-4">
          <button
            onClick={handleResetAssessment}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
          >
            重新评估
          </button>
          <button
            onClick={() => setIsEntryMode(true)}
            className="px-6 py-3 bg-slate-200 text-slate-800 rounded-xl hover:bg-slate-300 transition-all"
          >
            返回选择
          </button>
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
      onResults={handleResults}
      startROMAssessment={startROMAssessment}
      stopROMAssessment={handleStopAssessment}
      resetROMAssessment={handleResetAssessment}
      setIsCameraOn={setIsCameraOn}
      toggleFullscreen={toggleFullscreen}
    />
  );
};
