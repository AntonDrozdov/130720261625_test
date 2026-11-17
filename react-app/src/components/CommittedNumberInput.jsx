import { useEffect, useRef, useState } from 'react';

export default function CommittedNumberInput({ value, onCommit, minimumExclusive = -Infinity, precision }) {
  const format = (number) => precision === undefined ? String(number) : Number(number).toFixed(precision);
  const [draft, setDraft] = useState(() => format(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(format(value));
  }, [value, precision]);

  const commit = () => {
    const parsed = Number(draft);
    const next = precision === undefined ? parsed : Number(parsed.toFixed(precision));
    if (draft.trim() && Number.isFinite(next) && next > minimumExclusive) {
      setDraft(format(next));
      if (next !== value) onCommit(next);
    } else {
      setDraft(format(value));
    }
  };

  return <input type="number" step={precision === undefined ? 'any' : 10 ** -precision} value={draft}
    onFocus={(event) => { focused.current = true; event.currentTarget.select(); }}
    onClick={(event) => event.currentTarget.select()}
    onChange={(event) => setDraft(event.target.value)}
    onBlur={() => { focused.current = false; commit(); }}
    onKeyDown={(event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.blur();
      }
    }} />;
}
