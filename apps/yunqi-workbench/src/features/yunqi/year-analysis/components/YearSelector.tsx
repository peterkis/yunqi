import { useNavigate } from 'react-router-dom';
import { YUNQI_YEAR_OPTIONS, YUNQI_YEAR_RANGE } from '../../../../lib/yunqi-year-range';

export interface YearSelectorProps {
  readonly selectedYear?: number;
}

export function YearSelector({ selectedYear }: YearSelectorProps) {
  const navigate = useNavigate();

  return (
    <div className="year-navigation">
      <label className="year-selector">
      <span>分析年份</span>
      <select
        aria-label="分析年份"
        value={selectedYear?.toString() ?? ''}
        onChange={(event) => {
          const value = event.currentTarget.value;
          navigate(value ? `/yunqi/year/${value}` : '/yunqi/year');
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
      <div className="year-navigation__steps" aria-label="相邻年份">
        <button
          type="button"
          disabled={selectedYear === undefined || selectedYear <= YUNQI_YEAR_RANGE.min}
          onClick={() => selectedYear !== undefined && navigate(`/yunqi/year/${selectedYear - 1}`)}
        >上一年</button>
        <button
          type="button"
          disabled={selectedYear === undefined || selectedYear >= YUNQI_YEAR_RANGE.max}
          onClick={() => selectedYear !== undefined && navigate(`/yunqi/year/${selectedYear + 1}`)}
        >下一年</button>
      </div>
      <p className="year-navigation__hint">支持 {YUNQI_YEAR_RANGE.min}–{YUNQI_YEAR_RANGE.max} 运气年</p>
    </div>
  );
}
