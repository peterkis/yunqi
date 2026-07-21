import { Navigate, Route, Routes } from 'react-router-dom';
import { CurrentYunQiView } from '../features/yunqi/components/CurrentYunQiView';
import { YearAnalysisLayout } from '../features/yunqi/year-analysis/components/YearAnalysisLayout';
import { YearAnalysisPage } from '../features/yunqi/year-analysis/components/YearAnalysisPage';
import { YearEntryPage } from '../features/yunqi/year-analysis/components/YearEntryPage';
import { NotFoundPage } from './NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate replace to="/yunqi/current" />}
      />
      <Route path="/yunqi/current" element={<CurrentYunQiView />} />
      <Route path="/yunqi/year" element={<YearAnalysisLayout />}>
        <Route index element={<YearEntryPage />} />
        <Route path=":year" element={<YearAnalysisPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
