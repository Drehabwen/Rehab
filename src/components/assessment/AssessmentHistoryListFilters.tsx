import React from 'react';
import { Button } from '../ui/Button';

interface AssessmentHistoryListFiltersProps {
  filterType: 'all' | 'front' | 'side' | 'back';
  searchTerm: string;
  onFilterTypeChange: (type: 'all' | 'front' | 'side' | 'back') => void;
  onSearchTermChange: (term: string) => void;
}

export const AssessmentHistoryListFilters: React.FC<AssessmentHistoryListFiltersProps> = ({
  filterType,
  searchTerm,
  onFilterTypeChange,
  onSearchTermChange,
}) => {
  return (
    <div className="flex gap-2 mb-4">
      <div className="flex-1">
        <input
          type="text"
          placeholder="搜索评估记录..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="field-input"
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant={filterType === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onFilterTypeChange('all')}
        >
          全部
        </Button>
        <Button
          variant={filterType === 'front' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onFilterTypeChange('front')}
        >
          正面
        </Button>
        <Button
          variant={filterType === 'side' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onFilterTypeChange('side')}
        >
          侧面
        </Button>
        <Button
          variant={filterType === 'back' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onFilterTypeChange('back')}
        >
          背面
        </Button>
      </div>
    </div>
  );
};
