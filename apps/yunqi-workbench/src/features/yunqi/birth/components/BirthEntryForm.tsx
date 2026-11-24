import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { animateMotion } from '../../../../lib/motion';
import { useMotionLevel } from '../../../../providers/MotionProvider';
import { Delete, X } from 'lucide-react';
import { Button } from '../../../../components/design/Button';
import { SegmentedControl } from '../../../../components/design/SegmentedControl';
import { useBirthPreview, useBirthReferenceDate } from '../hooks/useBirthEntry';
import { birthdayAdjustment, birthYear, dayError, slotError, type BirthSlot, type BirthDraft, type BirthSubmission } from '../presentation/birth-entry';
import { BirthYearSeal } from './BirthYearSeal';
import '../../../../styles/views/birth-entry.css';

const slots: BirthSlot[] = ['primary', 'month', 'day'];
const digits = ['1','2','3','4','5','6','7','8','9','清空','0','退格'];
interface Props {
  draft: BirthDraft;
  onEdit: (draft: BirthDraft) => void;
  onReturn?: () => void;
  onClear: () => void;
  cleared: boolean;
  variant?: 'inline' | 'sheet';
  initialFocus?: BirthSlot;
  onConfirm: (request: BirthSubmission) => void;
  error?: string;
  pending: boolean;
}

export function BirthEntryForm({ draft, onEdit, onReturn, onConfirm, onClear, cleared, variant = 'inline', initialFocus = 'primary', pending, error }: Props) {
  const inputs = useRef<Partial<Record<BirthSlot, HTMLInputElement>>>({});
  const [slot, setSlot] = useState<BirthSlot>(initialFocus);
  const [feedback, setFeedback] = useState<{ key: BirthSlot; message: string; kind: 'prefix' | 'error' | 'retained' }>();
  const leadingZero = feedback?.kind === 'prefix' ? feedback.key : undefined;
  const rejected = feedback?.kind === 'error' ? feedback : undefined;
  const retained = feedback?.kind === 'retained' ? feedback : undefined;
  const inputBlocked = Boolean(leadingZero || rejected);
  const dialog = useRef<HTMLDialogElement>(null);
  const motion = useMotionLevel();
  const shake = useRef<Animation | undefined>(undefined);
  const monthGroup = useId();
  const statusId = useId();
  const hourField = useRef<HTMLInputElement>(null);
  const previouslyKnewTime = useRef(draft.knowsTime);
  const clock = useBirthReferenceDate();
  const year = birthYear(draft, clock.today);
  const adjustment = birthdayAdjustment(draft, clock.today);
  const yearAge = year !== undefined && clock.today ? clock.today.year - year - (adjustment ? 1 : 0) : undefined;
  const age = yearAge !== undefined && yearAge >= 0 ? yearAge : undefined;
  const invalid = dayError(draft, year);
  const complete = Boolean(year && Number(draft.month) && Number(draft.day) && !invalid);
  const request = useMemo(() => complete && year
    ? { year, calendar: draft.calendar, month: Number(draft.month), day: Number(draft.day) } : undefined,
    [complete, year, draft.calendar, draft.month, draft.day]);
  const preview = useBirthPreview(request);
  const enterIntent = useRef<typeof request>(undefined);
  const matches = preview.matches;
  const selected = matches?.length === 1 ? matches[0] : matches?.find(item => item.birthDate === draft.selected);
  const timeAvailable = Boolean(selected?.boundaries.length);
  const annualOnly = !draft.day && rejected?.key !== 'day' && !invalid && (!draft.month || Number(draft.month) > 0);
  const allow = Boolean(!inputBlocked && year && (annualOnly || (selected && (!timeAvailable || !draft.knowsTime || draft.time))));
  const ageMode = draft.mode === 'age';

  function focus(key: BirthSlot) {
    setSlot(key);
    inputs.current[key]?.focus();
    inputs.current[key]?.select();
  }
  useEffect(() => {
    const sheet = dialog.current;
    if (sheet) {
      if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', '');
    }
    focus(initialFocus);
    return () => { shake.current?.cancel(); if (sheet?.open) sheet.close?.(); };
  }, [variant, initialFocus]);
  useEffect(() => {
    if (draft.knowsTime && !previouslyKnewTime.current) hourField.current?.focus();
    previouslyKnewTime.current = draft.knowsTime;
  }, [draft.knowsTime]);
  useEffect(() => { if (error) inputs.current[slot]?.focus(); }, [error]);

  function update(patch: Partial<BirthDraft>) {
    setFeedback(undefined);
    onEdit({ ...draft, selected: '', knowsTime: false, time: '', ...patch });
  }
  function reject(key: BirthSlot, message: string, kind: 'error' | 'retained' = 'error') {
    enterIntent.current = undefined;
    setFeedback({ key, message, kind });
    shake.current?.cancel();
    if (motion === 'full') {
      shake.current = animateMotion(inputs.current[key]?.closest('label') ?? null, motion, [
        { transform: 'translateX(0)' }, { transform: 'translateX(calc(-1 * var(--space-1)))' },
        { transform: 'translateX(var(--space-1))' }, { transform: 'translateX(0)' },
      ], '--birth-shake-duration', '--ease-standard');
    }
  }
  function enter(key: BirthSlot, raw: string, deleting = false) {
    // Keep a typed leading zero out of the stored date while accepting 01–09.
    if (key !== 'primary' && raw === '0' && deleting) raw = '';
    if (key !== 'primary' && raw === '0') {
      if (leadingZero === key) reject(key, slotError(key, '00', draft, clock.today));
      else {
        enterIntent.current = undefined;
        setFeedback({ key, kind: 'prefix', message: '请继续输入 1–9，完成两位数录入' });
      }
      return;
    }
    const message = slotError(key, raw, draft, clock.today);
    if (message) {
      const appendedDigit = raw.slice(0, -1) === draft[key] && /^\d$/.test(raw.slice(-1));
      reject(key, message, complete && appendedDigit && !leadingZero ? 'retained' : 'error');
      return;
    }
    let value = raw;
    if (key !== 'primary' && raw.length === 1 &&
        (leadingZero === key || Number(raw) >= (key === 'month' ? 2 : 4))) value = '0' + raw;
    update({ [key]: value });
    if (key === 'primary' && (ageMode ? value.length === 3 || value.length === 2 && !/^1[012]$/.test(value) : value.length === 4)) focus('month');
    if (key === 'month' && value.length === 2 && Number(value) >= 1 && Number(value) <= 12) focus('day');
  }
  function backspace(key: BirthSlot) {
    if (feedback?.key === key && (leadingZero || !draft[key])) {
      setFeedback(undefined);
      return;
    }
    const target = !draft[key] && key !== 'primary' ? slots[slots.indexOf(key) - 1] : key;
    enter(target, draft[target].slice(0, -1), true);
    focus(target);
    const input = inputs.current[target];
    input?.setSelectionRange(input.value.length, input.value.length);
  }
  function virtualKey(value: string) {
    if (value === '清空') { setFeedback(undefined); onClear(); focus('primary'); return; }
    if (value === '退格') { backspace(slot); return; }
    const input = inputs.current[slot];
    if (!input) return;
    const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
    if (document.activeElement !== input) {
      input.focus();
      input.setSelectionRange(start, end);
    }
    enter(slot, leadingZero === slot ? value : draft[slot].slice(0, start) + value + draft[slot].slice(end));
  }
  function onFormKey(event: KeyboardEvent<HTMLFormElement>) {
    if (pending || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
        event.target instanceof HTMLInputElement) return;
    if (/^\d$/.test(event.key) || event.key === 'Backspace') {
      event.preventDefault(); virtualKey(event.key === 'Backspace' ? '退格' : event.key);
    }
  }
  function confirm() {
    if (!year || !allow || pending) return;
    if (annualOnly) onConfirm({ year });
    else if (selected) onConfirm({ birthDate: selected.birthDate, ...(timeAvailable && draft.knowsTime ? { birthTime: draft.time.length === 5 ? draft.time + ':00' : draft.time } : {}) });
  }
  useEffect(() => {
    if (!request || enterIntent.current !== request || (!matches && !preview.failed)) return;
    enterIntent.current = undefined;
    if (selected && allow) confirm();
  }, [request, matches, preview.failed, selected, allow]);
  function onSlotKey(event: KeyboardEvent<HTMLInputElement>, key: BirthSlot) {
    if (leadingZero === key && /^\d$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); enter(key, event.key); return;
    }
    if (event.key === 'Backspace' && (leadingZero === key || !draft[key])) { event.preventDefault(); backspace(key); }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); focus(slots[Math.max(0, Math.min(2, slots.indexOf(key) + (event.key === 'ArrowRight' ? 1 : -1)))]);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (inputBlocked) return;
      if (request && !matches && !preview.failed) enterIntent.current = request;
      else confirm();
    }
  }
  function switchMode(mode: BirthDraft['mode']) {
    const primary = mode === 'year' ? year : age !== undefined && age <= 120 ? age : undefined;
    setFeedback(undefined);
    onEdit({ ...draft, mode, primary: primary === undefined ? '' : String(primary) });
    focus('primary');
  }
  const yearPrefix = adjustment ? '按' + adjustment + '修正' : draft.calendar === 'lunar' ? '推算公历' : '推算';
  const badge = year !== undefined && (ageMode || age !== undefined)
    ? (ageMode ? `${yearPrefix} ${year} 年` : `${complete && draft.calendar === 'solar' ? '周岁' : '约'} ${age} 岁`)
    : undefined;
  const inline = variant === 'inline';
  const primaryLabel = ageMode ? '当前年龄' : '公历出生年';
  const inputProblem = rejected?.message || invalid;
  const yearProblem = draft.primary && !year && (draft.mode === 'age' || draft.primary.length === 4)
    ? '请核对年龄或出生年份' : '';
  const failure = inputProblem || error || (clock.failed ? '获取当前年份失败' : '') || yearProblem
    || (preview.failed ? '日期预览失败' : '') || (matches?.length === 0 ? '未找到可计算日期，请核对月日、历法或年份。' : '');
  const retry = !inputProblem && !error && (clock.failed ? clock.retry : preview.failed ? preview.retry : undefined);
  const ambiguous = !!matches && matches.length > 1 && !selected;
  const tone = failure ? 'error' : retained || ambiguous || selected?.boundaries.length ? 'attention' : 'normal';
  let hint = '先填年龄或出生年份，月日可稍后补全';
  if (feedback?.kind === 'prefix') hint = feedback.message;
  else if (!clock.today) hint = '正在获取当前年份…';
  else if (ambiguous) hint = '该农历月日在所填公历年内有多个匹配，请核对。';
  else if (complete) hint = '正在核对出生日期…';
  else if (year) hint = `公历 ${year} 年 · 可查看年度对照`;
  if (year && ageMode && adjustment && !failure && !complete && !feedback) hint = '已按出生' + adjustment + '自动修正为 ' + year + ' 年';
  const form = <form className={'birth-entry birth-entry--' + variant} aria-label="出生运气输入" onKeyDown={onFormKey} aria-busy={pending} onSubmit={event => { event.preventDefault(); confirm(); }}>
      <div className="birth-entry__canvas">
      <header className="birth-entry__head"><h2>填写出生信息</h2>
        <SegmentedControl slidingIndicator={false} label="月日历法" compact value={draft.calendar} disabled={pending}
          segments={[{ value: 'solar', label: '公历' }, { value: 'lunar', label: '农历' }]}
          onChange={calendar => update({ calendar })} />
        {onReturn && <Button variant="icon" aria-label="关闭修改" disabled={pending} onClick={onReturn}><X size={18} aria-hidden="true" /></Button>}
      </header>
      <fieldset disabled={pending} className="birth-entry__body">
        <SegmentedControl slidingIndicator={false} label="出生年份录入方式" value={draft.mode}
          segments={[{ value: 'age', label: '按年龄推算', disabled: !ageMode && year !== undefined && age !== undefined && age > 120 }, { value: 'year', label: '按出生年份' }]} onChange={switchMode} />
        {inline && <BirthYearSeal year={year} hint={badge} annualLabels={selected?.annualLabels} multipleDates={ambiguous} />}
        <div className="birth-slots" role="group" aria-label={draft.calendar === 'solar' ? '出生日期（公历）' : '出生月日（农历）'}>
          {slots.map((key, index) => <label key={key} className="birth-slot" data-year={key === 'primary' && !ageMode || undefined}
            data-three-digits={key === 'primary' && ageMode && draft.primary.length === 3 || undefined} data-active={slot === key} data-invalid={rejected?.key === key || key === 'day' && !!invalid || undefined}>
            <span>{[primaryLabel, '出生月', '出生日'][index]}</span>
            <span className="birth-slot__value"><input ref={node => { if (node) inputs.current[key] = node; }}
              aria-label={key === 'primary' ? (ageMode ? '年龄' : '年') : key === 'month' ? '月' : '日'}
              aria-invalid={rejected?.key === key || key === 'day' && !!invalid || undefined} aria-describedby={statusId}
              inputMode="none" autoComplete="off" type="text" value={draft[key]} placeholder="—"
              onFocus={event => {
                setFeedback(previous => previous?.kind === 'prefix' && previous.key !== key ? undefined : previous);
                setSlot(key); event.target.select();
              }}
              onChange={event => enter(key, event.target.value, (event.nativeEvent as InputEvent).inputType?.startsWith('delete'))} onKeyDown={event => onSlotKey(event, key)}
              onPaste={event => {
                const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(event.clipboardData.getData('text').trim());
                if (!parts) return;
                event.preventDefault();
                const next: BirthDraft = { ...draft, mode: 'year', calendar: 'solar', primary: parts[1], month: parts[2], day: parts[3] };
                for (const field of slots) {
                  const message = slotError(field, next[field], next, clock.today);
                  if (message) { reject(field, message); focus(field); return; }
                }
                update(next); focus('day');
              }} /><small>{[ageMode ? '岁' : '年','月','日'][index]}</small></span>
            {!inline && key === 'primary' && badge && <span className="birth-slot__badge">{badge}</span>}
          </label>)}
        </div>
        <div className="birth-entry__preview" data-tone={tone}>
          <div className="birth-entry__preview-copy" id={statusId} aria-live="polite">
            {retained && !failure && <span>{retained.message}。 </span>}
            {retry ? <button type="button" onClick={() => void retry()}>{failure} · 重试</button>
              : failure ? <span role={error ? 'alert' : undefined}>{failure}</span>
              : selected && !inputBlocked ? <>
                <span data-preview-date={selected.birthDate}>{selected.lunarLabel ? '农历' + selected.lunarLabel + ' · ' : '公历 '}{selected.birthDate}</span>
                {!inline && <> · {selected.annualLabels.map(label => label.split(' · ')[0]).join('／')}</>}
                {' · '}{timeAvailable ? '当日有交界' : '无交界'}
                {inline && badge && (!ageMode || adjustment || draft.calendar === 'lunar') && <> · <span>{badge}</span></>}
              </> : hint}
          </div>
          {!failure && !inputBlocked && timeAvailable && <button type="button" className="birth-entry__time-toggle" aria-expanded={draft.knowsTime}
            onClick={() => onEdit({ ...draft, knowsTime: !draft.knowsTime, time: '' })}>{draft.knowsTime ? '时刻不详' : '补录时刻 ›'}</button>}
        </div>
        {!failure && matches && matches.length > 1 && <fieldset className="birth-entry__matches"><legend>选择对应公历日期</legend>
          {matches.map(item => <label key={item.birthDate}><input type="radio" name={monthGroup} checked={draft.selected === item.birthDate}
            onChange={() => update({ selected: item.birthDate })} />{item.lunarLabel} · {item.birthDate}</label>)}
          {!selected && <Button variant="text" disabled={inputBlocked} onClick={() => year && onConfirm({ year })}>仅按年份对照</Button>}
        </fieldset>}
        {!failure && timeAvailable && draft.knowsTime && <p className="birth-entry__boundaries">{selected?.boundaries.map(item => item.label + ' ' + item.at.localTime.slice(11, 16)).join(' · ')}</p>}
        {!failure && !inputBlocked && timeAvailable && draft.knowsTime && <label className="birth-entry__time">出生时刻<input ref={hourField} type="time" step="1" value={draft.time}
          onChange={event => onEdit({ ...draft, time: event.target.value })} /></label>}
      </fieldset>
      </div>
      <div className="birth-entry__dock">
        <div className="birth-keypad" aria-label="数字键盘">{digits.map(value => <button type="button" key={value}
          disabled={pending} data-digit={value.length === 1 || undefined} aria-label={value === '清空' ? (variant === 'sheet' ? '清空输入' : '清空本次资料') : value} onMouseDown={event => event.preventDefault()} onClick={() => virtualKey(value)}>{value === '退格'
            ? (inline ? <Delete size={20} aria-hidden="true" /> : <X size={18} aria-hidden="true" />)
            : value}</button>)}</div>
        <Button type="submit" disabled={!allow || pending}>{pending ? '正在对照…' : annualOnly ? '仅按年份对照' : '确认并对照'}</Button>
        {!inline && <p className="birth-entry__privacy">本次修改确认后生效，关闭可返回原对照。</p>}
      </div>
      {cleared && <span className="visually-hidden" role="status">{variant === 'sheet' ? '已清空输入' : '已清空本次资料'}</span>}
    </form>;
  if (variant === 'inline') return form;
  return <dialog ref={dialog} className="birth-edit-sheet" data-lenis-prevent="" aria-label="修改出生信息" aria-modal="true"
    onCancel={event => { event.preventDefault(); if (!pending) onReturn?.(); }}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); if (!pending) onReturn?.(); } }}
    onClick={event => { if (event.target === event.currentTarget && !pending) onReturn?.(); }}>
    {form}
  </dialog>;
}
