import { ArrowDown } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const SwitchArrow = ({ error }: { error?: boolean }) => (
  <div
    className={cn(
      " rounded-lg bg-[#102924]",
      error ? "border-t-destructive" : ""
    )}
  >
    <motion.div
      whileTap={{ scale: 0.95 }}
      className={`w-10 h-10 flex items-center justify-center rounded-lg border-[0.5px] border-border relative`}
    >
      <motion.div className="absolute top-[43%] -left-1 z-10 transform w-2 h-3 bg-[#102924]"></motion.div>
      <motion.div
        initial={{ rotate: 0 }}
        whileHover={{ rotate: 180 }}
        transition={{ duration: 0.2 }}
      >
        <ArrowDown className="text-[#E9F6F3]" />
      </motion.div>
      <motion.div className="absolute top-[43%] -right-1 z-10 transform w-2 h-3 bg-[#102924]"></motion.div>
    </motion.div>
  </div>
);
