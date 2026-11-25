interface BirthYearSealProps {
  year?: number;
  hint?: string;
  annualLabels?: readonly string[];
  multipleDates: boolean;
}

/** A civil birth year alone does not identify the YunQi year across Great Cold. */
export function BirthYearSeal({ year, hint, annualLabels = [], multipleDates }: BirthYearSealProps) {
  let title = year === undefined ? '先天' : '待定';
  let caption = hint || (year === undefined ? '待录出生信息' : `公历 ${year} 年`);
  let movementCaption: string | undefined;
  if (multipleDates) {
    title = '待核对';
    caption = '请选择对应公历日期';
  } else if (annualLabels.length > 1) {
    title = '年界';
    caption = annualLabels.map(label => label.split(' · ')[0]).join(' ／ ');
  } else if (annualLabels.length === 1) {
    const [annualYear, movement] = annualLabels[0].split(' · ');
    title = annualYear.replace(/年$/, '');
    caption = String(year ?? '');
    movementCaption = movement && `${movement}之年`;
  }
  return <div className="birth-landscape">
    <div className="birth-seal" role="group" aria-label="出生运气预览">
      <div className="birth-seal__rim" aria-hidden="true"><i /><i /><i /><i /></div>
      <strong className="birth-seal__title">{title}</strong>
      <span className="birth-seal__caption">{caption}{movementCaption && <>
        <span className="birth-seal__separator"> · </span><span className="birth-seal__movement">{movementCaption}</span>
      </>}</span>
    </div>
  </div>;
}
