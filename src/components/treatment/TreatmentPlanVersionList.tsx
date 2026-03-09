import React, { useState } from 'react';
import { useTreatmentPlanStore } from '../../store/useTreatmentPlanStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Clock, 
  FileText, 
  Trash2, 
  Eye, 
  GitCompare,
  Tag,
  X,
  Download,
  Upload
} from 'lucide-react';
import { TreatmentPlanStorage } from '../../utils/treatmentPlanStorage';

interface TreatmentPlanVersionListProps {
  assessmentId: string;
  patientId: string;
}

export const TreatmentPlanVersionList: React.FC<TreatmentPlanVersionListProps> = () => {
  const {
    versions,
    currentVersionId,
    comparingVersions,
    switchVersion,
    deleteVersion,
    updateVersionTags,
    updateVersionNotes,
    startCompare,
    endCompare,
  } = useTreatmentPlanStore();

  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const handleExport = () => {
    const data = TreatmentPlanStorage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treatment_plans_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (TreatmentPlanStorage.importData(content)) {
          // 重新加载页面以应用导入的数据
          window.location.reload();
        } else {
          alert('导入失败，请检查文件格式');
        }
      };
      reader.readAsText(file);
    };
    input.click();
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

  const handleAddTag = (versionId: string) => {
    if (!tagInput.trim()) return;
    
    const version = versions.find(v => v.id === versionId);
    if (version) {
      const newTags = [...(version.tags || []), tagInput.trim()];
      updateVersionTags(versionId, newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (versionId: string, tagToRemove: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version && version.tags) {
      const newTags = version.tags.filter(tag => tag !== tagToRemove);
      updateVersionTags(versionId, newTags);
    }
  };

  const handleSaveNotes = (versionId: string) => {
    updateVersionNotes(versionId, noteInput);
    setEditingNotes(null);
    setNoteInput('');
  };

  const handleCompare = (versionId: string) => {
    if (comparingVersions[0] === null) {
      startCompare(versionId, null);
    } else if (comparingVersions[1] === null) {
      startCompare(comparingVersions[0], versionId);
    } else {
      startCompare(versionId, null);
    }
  };

  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>版本历史</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              导入
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
            {comparingVersions[0] && (
              <Button
                onClick={endCompare}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                取消对比
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无版本记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedVersions.map((version) => (
              <div
                key={version.id}
                className={`border rounded-lg p-4 transition-all ${
                  version.isCurrent
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${comparingVersions.includes(version.id) ? 'ring-2 ring-green-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={version.isCurrent ? 'primary' : 'default'}>
                      v{version.version}
                    </Badge>
                    {version.isCurrent && (
                      <Badge variant="success">当前</Badge>
                    )}
                    {comparingVersions.includes(version.id) && (
                      <Badge variant="success">对比中</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => switchVersion(version.id)}
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      查看
                    </Button>
                    <Button
                      onClick={() => handleCompare(version.id)}
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <GitCompare className="w-4 h-4" />
                      对比
                    </Button>
                    <Button
                      onClick={() => deleteVersion(version.id)}
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(version.createdAt)}</span>
                </div>

                {version.tags && version.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {version.tags.map((tag, index) => (
                        <Badge key={index} variant="info" className="text-xs">
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(version.id, tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                {editingTags === version.id ? (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="添加标签..."
                      className="flex-1 px-3 py-1 border rounded-md text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTag(version.id);
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleAddTag(version.id)}
                      size="sm"
                    >
                      添加
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingTags(null);
                        setTagInput('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setEditingTags(version.id);
                      setTagInput('');
                    }}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 mb-2"
                  >
                    <Tag className="w-4 h-4" />
                    添加标签
                  </Button>
                )}

                {editingNotes === version.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="添加备注..."
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleSaveNotes(version.id)} size="sm">
                        保存
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingNotes(null);
                          setNoteInput('');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {version.notes && (
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>备注：</strong>
                        {version.notes}
                      </div>
                    )}
                    <Button
                      onClick={() => {
                        setEditingNotes(version.id);
                        setNoteInput(version.notes || '');
                      }}
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      {version.notes ? '编辑备注' : '添加备注'}
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
