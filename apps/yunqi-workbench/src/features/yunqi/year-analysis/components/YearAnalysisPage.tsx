import { useParams } from 'react-router-dom';
import { parseYearParam } from '../../../../lib/year-validator';
import { AnnualYunQiView } from './AnnualYunQiView';
import { InvalidYearPage } from './InvalidYearPage';

export function YearAnalysisPage() {
  const { year: yearParam } = useParams<'year'>();
  const result = parseYearParam(yearParam);

  if (!result.ok) {
    return <InvalidYearPage reason={result.reason} />;
  }

  return <AnnualYunQiView year={result.year} />;
}
