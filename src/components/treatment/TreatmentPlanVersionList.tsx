import React, { useState } from 'react';
import {
  Clock,
  Download,
  Eye,
  FileText,
  GitCompare,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTreatmentPlanStore } from '../../store/useTreatmentPlanStore';
import { TreatmentPlanStorage } from '../../utils/treatmentPlanStorage';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface TreatmentPlanVersionListProps {
  assessmentId: string;
  patientId: string;
}

export const TreatmentPlanVersionList: React.FC<TreatmentPlanVersionListProps> = () => {
  const {
    versions,
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
          window.location.reload();
        } else {
          alert('导入失败，请检查文件格式。');
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

    const version = versions.find((item) => item.id === versionId);
    if (!version) return;

    updateVersionTags(versionId, [...(version.tags || []), tagInput.trim()]);
    setTagInput('');
  };

  const handleRemoveTag = (versionId: string, tagToRemove: string) => {
    const version = versions.find((item) => item.id === versionId);
    if (!version?.tags) return;

    updateVersionTags(
      versionId,
      version.tags.filter((tag) => tag !== tagToRemove),
    );
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

  const versionCardClass = (isCurrent: boolean, isComparing: boolean) =>
    cn(
      'rounded-20 border p-4 transition-all',
      isCurrent
        ? 'border-blue-500 bg-blue-50 shadow-sm'
        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]',
      isComparing && 'ring-2 ring-emerald-500',
    );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>版本历史</CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleImport} variant="outline" size="sm" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              导入
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              导出
            </Button>
            {comparingVersions[0] ? (
              <Button onClick={endCompare} variant="outline" size="sm" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                取消对比
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="state-panel">
            <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p>暂无版本记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedVersions.map((version) => {
              const isComparing = comparingVersions.includes(version.id);

              return (
                <div key={version.id} className={versionCardClass(version.isCurrent, isComparing)}>
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={version.isCurrent ? 'primary' : 'default'}>
                        v{version.version}
                      </Badge>
                      {version.isCurrent ? <Badge variant="success">当前</Badge> : null}
                      {isComparing ? <Badge variant="success">对比中</Badge> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => switchVersion(version.id)}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        查看
                      </Button>
                      <Button
                        onClick={() => handleCompare(version.id)}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <GitCompare className="h-4 w-4" />
                        对比
                      </Button>
                      <Button
                        onClick={() => deleteVersion(version.id)}
                        variant="danger"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(version.createdAt)}</span>
                  </div>

                  {version.tags?.length ? (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {version.tags.map((tag, index) => (
                        <Badge key={`${tag}-${index}`} variant="info" className="text-xs">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(version.id, tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {editingTags === version.id ? (
                    <div className="mb-2 flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="添加标签..."
                        className="field-input flex-1 h-9 px-3"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTag(version.id);
                          }
                        }}
                      />
                      <Button onClick={() => handleAddTag(version.id)} size="sm">
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
                      className="mb-2 flex items-center gap-1"
                    >
                      <Tag className="h-4 w-4" />
                      添加标签
                    </Button>
                  )}

                  {editingNotes === version.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="添加备注..."
                        className="field-textarea"
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
                      {version.notes ? (
                        <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          <strong>备注：</strong>
                          {version.notes}
                        </div>
                      ) : null}
                      <Button
                        onClick={() => {
                          setEditingNotes(version.id);
                          setNoteInput(version.notes || '');
                        }}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        {version.notes ? '编辑备注' : '添加备注'}
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
