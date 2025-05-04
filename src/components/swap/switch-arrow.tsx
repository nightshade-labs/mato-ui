import { ArrowDown } from "lucide-react";

export const SwitchArrow = ({ error }: { error?: boolean }) => (
  <div
    className={`absolute left-1/2 ${error ? "top-[41%] border-t-destructive" : "top-[37%]"} transform -translate-x-1/2 translate-y-4 z-10 rounded-lg bg-[#102924]`}
  >
    <div
      className={`w-10 h-10 flex items-center justify-center rounded-lg border-[0.5px]  border-border  relative`}
    >
      <div className="absolute top-[48%] -left-1 z-10 transform w-2 h-2 bg-[#102924]"></div>
      <ArrowDown className="text-[#E9F6F3]" />
      <div className="absolute top-[48%] -right-1 z-10 transform w-2 h-2 bg-[#102924]"></div>
    </div>
  </div>
);
