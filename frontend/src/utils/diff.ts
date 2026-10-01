import type { FieldChange } from '../types';

const MAX_VALUE_LENGTH = 300;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;

// Firestore の Timestamp などは toDate を持つ
const toDisplay = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text;
};

const flatten = (value: unknown, prefix: string, out: Record<string, unknown>) => {
  if (isPlainObject(value)) {
    Object.entries(value).forEach(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k, out));
  } else if (Array.isArray(value) && value.some(v => isPlainObject(v))) {
    value.forEach((v, i) => flatten(v, `${prefix}.${i}`, out));
    if (value.length === 0) out[prefix] = '';
  } else {
    out[prefix] = value;
  }
  return out;
};

/**
 * 変更前後のオブジェクトを比べ、変わった項目だけを「項目 / 変更前 / 変更後」で返す。
 * ネストしたオブジェクトや内訳の配列は `breakdown.0.amount` のようなパスで比較する。
 */
export const diffObjects = (
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  ignoreKeys: string[] = [],
): FieldChange[] => {
  const a = flatten(before ?? {}, '', {});
  const b = flatten(after ?? {}, '', {});
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  const isIgnored = (key: string) => ignoreKeys.some(k => key === k || key.startsWith(`${k}.`));
  return keys
    .filter(key => key && !isIgnored(key))
    .map(key => ({ field: key, before: toDisplay(a[key]), after: toDisplay(b[key]) }))
    .filter(change => change.before !== change.after);
};
