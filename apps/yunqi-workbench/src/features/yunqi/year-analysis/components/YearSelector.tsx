import { useNavigate } from 'react-router-dom';
import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';

export interface YearSelectorProps {
  readonly selectedYear?: number;
}

export function YearSelector({ selectedYear }: YearSelectorProps) {
  const navigate = useNavigate();

  return (
    <label>
      <span>分析年份</span>
      <select
        aria-label="分析年份"
        value={selectedYear?.toString() ?? ''}
        onChange={(event) => {
          navigate(`/yunqi/year/${event.currentTarget.value}`);
        }}
      >
        <option value="">选择年份</option>
        {YUNQI_YEAR_OPTIONS.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
