type PercentageButtonProps = {
  percent: string;
  onClick: () => void;
};

export const PercentageButton = ({
  percent,
  onClick,
}: PercentageButtonProps) => (
  <button
    onClick={onClick}
    className="text-xs font-bold border border-[#109071] rounded text-[#109071] py-1 px-2 hover:bg-[#102924]/20"
  >
    {percent}
  </button>
);
