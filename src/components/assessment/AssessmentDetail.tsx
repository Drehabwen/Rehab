import React, { useState, useRef, useEffect } from 'react';
import { useAssessmentRecordStore } from '../../store/useAssessmentRecordStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  X,
  ZoomIn,
  ZoomOut,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const AssessmentDetail: React.FC = () => {
  const { currentRecord, records, setCurrentRecord } = useAssessmentRecordStore();
  const [zoom, setZoom] = useState(1);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (currentRecord && canvasRef.current && currentRecord.imageData) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        const scaledWidth = img.width * zoom;
        const scaledHeight = img.height * zoom;
        
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, 0, 0);

        if (showLandmarks && currentRecord.landmarks && currentRecord.landmarks.length > 0) {
          drawLandmarks(ctx, currentRecord.landmarks, img.width, img.height);
        }
      };
      img.src = currentRecord.imageData;
    }
  }, [currentRecord, showLandmarks, zoom]);

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: Array<{x: number; y: number}> | number[], width: number, height: number) => {
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;

    const pointRadius = 5;

    if (Array.isArray(landmarks) && landmarks.length > 0) {
      if (typeof landmarks[0] === 'object') {
        const points = landmarks as Array<{x: number; y: number}>;
        points.forEach((point, index) => {
          const x = point.x * width;
          const y = point.y * height;

          ctx.beginPath();
          ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, pointRadius + 2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.fillText(`${index + 1}`, x + 8, y - 8);
          ctx.fillStyle = '#ef4444';
        });
      } else {
        const coords = landmarks as number[];
        for (let i = 0; i < coords.length; i += 2) {
          const x = coords[i] * width;
          const y = coords[i + 1] * height;

          ctx.beginPath();
          ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, pointRadius + 2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.fillText(`${i / 2 + 1}`, x + 8, y - 8);
          ctx.fillStyle = '#ef4444';
        }
      }
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    if (!currentRecord) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `assessment_${currentRecord.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrevious = () => {
    const currentIndex = records.findIndex(r => r.id === currentRecord?.id);
    if (currentIndex > 0) {
      setCurrentRecord(records[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    const currentIndex = records.findIndex(r => r.id === currentRecord?.id);
    if (currentIndex < records.length - 1) {
      setCurrentRecord(records[currentIndex + 1].id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAssessmentTypeLabel = (type: string) => {
    const labels = {
      front: '正面',
      side: '侧面',
      back: '背面',
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (!currentRecord) {
    return (
      <Card className="w-full">
        <CardContent className="py-12 text-center text-gray-500">
          <p>请选择一个评估记录查看详情</p>
        </CardContent>
      </Card>
    );
  }

  const currentIndex = records.findIndex(r => r.id === currentRecord.id);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrevious}
              variant="ghost"
              size="sm"
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle>评估详情</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {currentIndex + 1} / {records.length}
              </p>
            </div>
            <Button
              onClick={handleNext}
              variant="ghost"
              size="sm"
              disabled={currentIndex === records.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowLandmarks(!showLandmarks)}
              variant={showLandmarks ? 'primary' : 'outline'}
              size="sm"
            >
              {showLandmarks ? '隐藏标注' : '显示标注'}
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <Badge variant="info">
              {getAssessmentTypeLabel(currentRecord.assessmentType)}
            </Badge>
            <span className="text-sm text-gray-600">
              {formatDate(currentRecord.timestamp)}
            </span>
            {currentRecord.improvement !== undefined && (
              <Badge variant={currentRecord.improvement > 0 ? 'success' : 'warning'}>
                {currentRecord.improvement > 0 ? `改善 ${currentRecord.improvement}%` : `下降 ${Math.abs(currentRecord.improvement)}%`}
              </Badge>
            )}
          </div>

          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <Button
                onClick={handleZoomOut}
                variant="outline"
                size="sm"
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="px-3 py-2 bg-white rounded text-sm font-medium">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                onClick={handleZoomIn}
                variant="outline"
                size="sm"
                disabled={zoom >= 3}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            <div 
              className="flex justify-center items-center min-h-[400px] overflow-auto"
            >
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[600px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentRecord.angles && Object.keys(currentRecord.angles).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">角度数据</h3>
                <div className="space-y-2">
                  {Object.entries(currentRecord.angles).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{key}</span>
                      <span className="font-semibold text-blue-600">
                        {typeof value === 'number' ? value.toFixed(1) : value}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentRecord.metrics && Object.keys(currentRecord.metrics).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">指标数据</h3>
                <div className="space-y-2">
                  {Object.entries(currentRecord.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{key}</span>
                      <span className="font-semibold text-green-600">
                        {typeof value === 'number' ? value.toFixed(2) : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {currentRecord.feedback && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">患者反馈</h3>
              <p className="text-gray-700">{currentRecord.feedback}</p>
            </div>
          )}

          {currentRecord.treatmentPlanId && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">关联治疗计划</h3>
              <p className="text-sm text-gray-600">
                计划 ID: {currentRecord.treatmentPlanId}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
