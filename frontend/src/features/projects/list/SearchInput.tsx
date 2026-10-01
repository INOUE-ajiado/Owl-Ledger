import { useState } from 'react';

// ヘッダー(AppLayout)に描画されるため、親の state を value に直接使うと反映が1レンダー遅れ、
// IME 変換中に古い値で上書きされて日本語入力が壊れる。入力値はこのコンポーネント内で保持する。
const SearchInput = ({ onChange }: { onChange: (value: string) => void }) => {
  const [value, setValue] = useState('');
  return (
    <input
      type="text"
      placeholder="検索..."
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onChange(e.target.value);
      }}
      className="w-32 sm:w-40 py-2 pl-10 pr-4 text-sm bg-white/40 border-white/30 rounded-md focus:ring-earth-500 focus:border-earth-500 text-earth-800 placeholder-earth-400 backdrop-blur-sm"
    />
  );
};

export default SearchInput;
