export function createDesignHistory(initial = []) {
  let current = initial;
  let past = [];
  let grouping = false;
  let recorded = false;
  return {
    get count() { return past.length; },
    get active() { return grouping; },
    reset(value) { current = value; past = []; grouping = false; recorded = false; },
    begin() { grouping = true; recorded = false; },
    end() { grouping = false; recorded = false; },
    change(update) {
      const next = typeof update === 'function' ? update(current) : update;
      if (JSON.stringify(next) === JSON.stringify(current)) return current;
      if (!grouping || !recorded) {
        past = [...past, structuredClone(current)].slice(-10);
        recorded = true;
      }
      current = next;
      return current;
    },
    undo() {
      if (grouping || !past.length) return undefined;
      current = past.pop();
      return current;
    },
  };
}
