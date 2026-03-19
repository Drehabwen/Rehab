import React from 'react';
import { NexusReportCenter } from '@/hub/components/NexusReportCenter';

interface ReportCenterProps {
  patientId: string;
}

// Legacy compatibility wrapper: route all historical report-center usage to the
// new screening-oriented report center so the repo no longer maintains two UIs.
export const ReportCenter: React.FC<ReportCenterProps> = ({ patientId }) => (
  <NexusReportCenter patientId={patientId} />
);
