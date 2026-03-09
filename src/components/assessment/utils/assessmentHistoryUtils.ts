export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getAssessmentTypeLabel = (type: string): string => {
  const labels = {
    front: '正面',
    side: '侧面',
    back: '背面',
  };
  return labels[type as keyof typeof labels] || type;
};

export const formatStorageSize = (bytes: number): string => {
  const mb = bytes / 1024 / 1024;
  if (mb < 1) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  }
  return `${mb.toFixed(2)}MB`;
};

export const getStorageWarningLevel = (usedPercentage: number): 'normal' | 'warning' | 'critical' => {
  if (usedPercentage >= 90) return 'critical';
  if (usedPercentage >= 70) return 'warning';
  return 'normal';
};
