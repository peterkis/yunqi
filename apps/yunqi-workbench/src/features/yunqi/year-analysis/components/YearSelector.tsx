import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/design/Button';
import { YUNQI_YEAR_OPTIONS, YUNQI_YEAR_RANGE } from '../../../../lib/yunqi-year-range';

export interface YearSelectorProps {
  readonly selectedYear?: number;
}

export function YearSelector({ selectedYear }: YearSelectorProps) {
  const navigate = useNavigate();

  return (
    <div className="drilldown-year-navigation">
      <label className="drilldown-year-selector">
        <span>分析年份</span>
        <span className="drilldown-year-selector__control"><select
          className="num"
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
        </select><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></span>
      </label>
      <div className="drilldown-year-navigation__steps" aria-label="相邻年份">
        <Button variant="secondary"
          type="button"
          disabled={selectedYear === undefined || selectedYear <= YUNQI_YEAR_RANGE.min}
          onClick={() => selectedYear !== undefined && navigate(`/yunqi/year/${selectedYear - 1}`)}
        >上一年</Button>
        <Button variant="secondary"
          type="button"
          disabled={selectedYear === undefined || selectedYear >= YUNQI_YEAR_RANGE.max}
          onClick={() => selectedYear !== undefined && navigate(`/yunqi/year/${selectedYear + 1}`)}
        >下一年</Button>
      </div>
      <p className="drilldown-meta num">支持 {YUNQI_YEAR_RANGE.min}–{YUNQI_YEAR_RANGE.max} 运气年</p>
    </div>
  );
}
