interface ApprovalStampProps {
  status: '提出' | '承認';
  name: string;
  date: string;
}

const ApprovalStamp = ({ status, name, date }: ApprovalStampProps) => {
  // 名前は提出・承認した時点の社員マスタの「印鑑名」(会社設定の承認者名) を保存している
  const displayName = name;

  return (
    <div
      className="
        flex flex-col items-center justify-center
        w-[68px] h-[68px] border border-red-500 rounded-full
        text-red-500 font-bold text-center leading-none
      "
    >
      <div className="text-base mb-[-2px]">{status}</div>
      <div className="w-full border-t border-red-500"></div>
      <div className="text-[10px] tracking-tighter py-0.5">{date}</div>
      <div className="w-full border-t border-red-500"></div>
      <div className="text-base mt-[-2px]">{displayName}</div>
    </div>
  );
};

export default ApprovalStamp;