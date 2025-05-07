import { cn } from "@/lib/utils";

type PercentageButtonProps = {
  percent: string;
  onClick: () => void;
  error?: boolean;
  isHardError?: boolean;
  isSoftError?: boolean;
};

export const PercentageButton = ({
  percent,
  onClick,
  error,
  isHardError,
  isSoftError,
}: PercentageButtonProps) => (
  <button
    onClick={onClick}
    className={cn(
      "text-xs font-bold border rounded py-1 px-2 hover:bg-[#102924]/20 transition-colors",
      isHardError
        ? "text-[#FFA6A6] border-[#FFA6A6] hover:bg-[#382424]/50"
        : isSoftError
          ? "text-[#109071] border-[#109071] hover:bg-[#0A352B]/50"
          : error
            ? "text-destructive-40 border-destructive-40 hover:bg-destructive/10"
            : "text-[#109071] border-[#109071] hover:bg-[#0A352B]/50"
    )}
  >
    {percent}
  </button>
);
