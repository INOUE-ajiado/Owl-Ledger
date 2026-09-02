const mapName = (name: string) => {
  if (!name) return '';
  const lowerName = name.toLowerCase();
  if (lowerName === 'inoue') return '井上';
  if (lowerName === 'ozawa') return '小澤';
  return name;
};

interface ApprovalStampProps {
  status: '提出' | '承認';
  name: string;
  date: string;
}

const ApprovalStamp = ({ status, name, date }: ApprovalStampProps) => {
  const displayName = mapName(name);

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