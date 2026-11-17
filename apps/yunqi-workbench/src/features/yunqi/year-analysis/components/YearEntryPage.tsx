import { Navigate } from 'react-router-dom';
import { EmptyState } from '../../../../components/feedback/FeedbackStates';
import { useYearEntryDefault } from '../hooks/useYearEntryDefault';

export function YearEntryPage() {
  const year = useYearEntryDefault();
  if (year !== undefined) return <Navigate replace to={`/yunqi/year/${year}`} />;
  return <EmptyState message="请选择要分析的年份" />;
}
