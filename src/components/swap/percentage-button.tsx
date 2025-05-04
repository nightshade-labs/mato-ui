type PercentageButtonProps = {
  percent: string;
  onClick: () => void;
  error?: boolean;
};

export const PercentageButton = ({
  percent,
  onClick,
  error,
}: PercentageButtonProps) => (
  <button
    onClick={onClick}
    className={`text-xs font-bold border border-[#109071] rounded text-[#109071] py-1 px-2 hover:bg-[#102924]/20 ${error ? " text-destructive-40 border-destructive-40" : ""}`}
  >
    {percent}
  </button>
);
