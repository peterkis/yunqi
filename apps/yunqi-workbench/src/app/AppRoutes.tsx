import { Navigate, Route, Routes, useMatch } from 'react-router-dom';
import { RetainedSession } from './RetainedSession';
import { InquiryEntryPage } from '../features/inquiry/pages/InquiryEntryPage';
import { CurrentYunQiView } from '../features/yunqi/components/CurrentYunQiView';
import { CurrentClassicsView } from '../features/yunqi/components/CurrentClassicsView';
import { BirthComparisonPage } from '../features/yunqi/birth/components/BirthComparisonPage';
import { ConstitutionPage } from '../features/constitution/pages/ConstitutionPage';
import { TimeAnalysisView } from '../features/yunqi/time-analysis/components/TimeAnalysisView';
import { YearAnalysisLayout } from '../features/yunqi/year-analysis/components/YearAnalysisLayout';
import { YearAnalysisPage } from '../features/yunqi/year-analysis/components/YearAnalysisPage';
import { YearEntryPage } from '../features/yunqi/year-analysis/components/YearEntryPage';
import { NotFoundPage } from './NotFoundPage';

export function AppRoutes() {
  const birthEntry = useMatch('/yunqi/birth');
  const birthReading = useMatch('/yunqi/birth/classics');
  const birthActive = birthEntry !== null || birthReading !== null;
  const constitutionActive = useMatch('/yunqi/constitution') !== null;
  return (
    <>
    <RetainedSession active={birthActive}><BirthComparisonPage /></RetainedSession>
    <RetainedSession active={constitutionActive}><ConstitutionPage /></RetainedSession>
    <Routes>
      <Route
        path="/"
        element={<Navigate replace to="/yunqi/current" />}
      />
      <Route path="/yunqi/current" element={<CurrentYunQiView />} />
      <Route path="/yunqi/current/classics" element={<CurrentClassicsView />} />
      <Route path="/yunqi/birth" element={null}>
        <Route path="classics" element={null} />
      </Route>
      <Route path="/yunqi/constitution" element={null} />
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
    </>
  );
}
