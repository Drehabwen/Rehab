import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { AssessmentHistoryListHeader } from './AssessmentHistoryListHeader';
import { AssessmentHistoryListFilters } from './AssessmentHistoryListFilters';
import { AssessmentHistoryListStorage } from './AssessmentHistoryListStorage';
import { AssessmentHistoryListCard } from './AssessmentHistoryListCard';
import { AssessmentHistoryListEmpty } from './AssessmentHistoryListEmpty';
import { useAssessmentHistory } from './hooks/useAssessmentHistory';

export const AssessmentHistoryList: React.FC = () => {
  const {
    currentRecord,
    filteredRecords,
    filterType,
    setFilterType,
    searchTerm,
    setSearchTerm,
    storageInfo,
    importStatus,
    errorMessage,
    fileInputRef,
    deleteRecord,
    setCurrentRecord,
    handleExport,
    handleImport,
    handleFileChange,
    handleClearRecords,
  } = useAssessmentHistory();

  return (
    <Card className="w-full">
      <AssessmentHistoryListHeader
        onImport={handleImport}
        onExport={handleExport}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
      />
      <CardContent>
        <div className="space-y-4">
          <AssessmentHistoryListStorage
            storageInfo={storageInfo}
            importStatus={importStatus}
            errorMessage={errorMessage}
            onClearRecords={handleClearRecords}
          />
          
          <AssessmentHistoryListFilters
            filterType={filterType}
            searchTerm={searchTerm}
            onFilterTypeChange={setFilterType}
            onSearchTermChange={setSearchTerm}
          />

          {filteredRecords.length === 0 ? (
            <AssessmentHistoryListEmpty />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecords.map((record) => (
                <AssessmentHistoryListCard
                  key={record.id}
                  record={record}
                  isCurrent={currentRecord?.id === record.id}
                  onView={setCurrentRecord}
                  onDelete={deleteRecord}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
