import { Eye, RefreshCw } from "lucide-react";

type ControlButtonsProps = {
  isChartVisible: boolean;
  toggleChart: () => void;
  resetForm: () => void;
};

export const ControlButtons = ({
  isChartVisible,
  toggleChart,
  resetForm,
}: ControlButtonsProps) => {
  return (
    <div className="absolute right-0 top-0 -mt-10 flex gap-2">
      <button
        onClick={toggleChart}
        className="flex items-center gap-1 text-xs font-bold border border-[#053A2D] rounded-lg text-[#E9F6F3] py-2 px-3 bg-[#102924]"
      >
        <Eye size={16} />
        {isChartVisible ? "Hide Chart" : "Show Chart"}
      </button>
      <button
        onClick={resetForm}
        className="flex items-center gap-1 text-xs font-bold border border-[#053A2D] rounded-lg text-[#E9F6F3] py-2 px-3 bg-[#102924]"
      >
        <RefreshCw size={16} />
        Reset Amount
      </button>
    </div>
  );
};
