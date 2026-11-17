import { Navigate, Route, Routes } from 'react-router-dom';
import { InquiryEntryPage } from '../features/inquiry/pages/InquiryEntryPage';
import { CurrentYunQiView } from '../features/yunqi/components/CurrentYunQiView';
import { BirthComparisonPage } from '../features/yunqi/birth/components/BirthComparisonPage';
import { ConstitutionPage } from '../features/constitution/pages/ConstitutionPage';
import { TimeAnalysisView } from '../features/yunqi/time-analysis/components/TimeAnalysisView';
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
      <Route path="/yunqi/birth" element={<BirthComparisonPage />}>
        <Route path="classics" element={null} />
      </Route>
      <Route path="/yunqi/constitution" element={<ConstitutionPage />} />
      <Route
        path="/yunqi/calculate"
        element={<TimeAnalysisView />}
      />
      <Route path="/yunqi/inquiry" element={<InquiryEntryPage />} />
      <Route path="/yunqi/year" element={<YearAnalysisLayout />}>
        <Route index element={<YearEntryPage />} />
        <Route path=":year" element={<YearAnalysisPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
