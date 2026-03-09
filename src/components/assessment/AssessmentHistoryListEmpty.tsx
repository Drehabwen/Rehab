import React from 'react';
import { Calendar } from 'lucide-react';

export const AssessmentHistoryListEmpty: React.FC = () => {
  return (
    <div className="text-center py-8 text-gray-500">
      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>暂无评估记录</p>
    </div>
  );
};
