// 検索用の正規化: 全角/半角を揃え(NFKC)、小文字化し、カタカナをひらがなに寄せる
export const normalizeForSearch = (text: string) =>
  text.normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
