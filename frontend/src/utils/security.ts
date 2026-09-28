// セキュリティ関連の共通処理

const PBKDF2_ITERATIONS = 100_000;

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * プレビュー/発注書パスワードのハッシュを作る。
 * 平文を Firestore に保存しないためのもの。ドキュメントIDをソルトに使うので、同じパスワードでも文書ごとに値が変わる。
 */
export const hashPassword = async (password: string, docId: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(`owl-ledger:${docId}`), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return toHex(bits);
};

/**
 * 入力されたパスワードを検証する。ハッシュ未移行の古いデータ (平文) にも対応する。
 */
export const verifyPassword = async (
  input: string | null,
  docId: string,
  stored: { hash?: string; legacyPlain?: string },
): Promise<boolean> => {
  if (input === null) return false;
  if (stored.hash) return (await hashPassword(input, docId)) === stored.hash;
  return stored.legacyPlain !== undefined && input === stored.legacyPlain;
};

/**
 * 添付ファイルのURLとして表示してよいか (Firebase Storage のダウンロードURLのみ許可)。
 * 改ざんされたデータで外部サイトを iframe/リンクに埋め込まれるのを防ぐ。
 */
export const isSafeReceiptUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (import.meta.env.DEV && (hostname === 'localhost' || hostname === '127.0.0.1')) return true;
    return protocol === 'https:' && hostname === 'firebasestorage.googleapis.com';
  } catch {
    return false;
  }
};

/**
 * CSV の1セルを作る。Excel で開いたときに数式として実行されないよう、
 * 先頭が = + - @ タブ 改行 の値には ' を付ける (CSV インジェクション対策)。
 */
export const toCsvCell = (value: unknown): string => {
  if (value === undefined || value === null) return '""';
  let str = Array.isArray(value) ? value.join(', ') : String(value);
  if (/^[=+\-@\t\r]/.test(str) && !/^-?\d+(\.\d+)?$/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
};
