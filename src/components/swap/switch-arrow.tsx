import { ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const SwitchArrow = ({ error }: { error?: boolean }) => (
  <motion.div
    layout
    initial={{ scale: 0.9, opacity: 0.8 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{
      layout: { duration: 0.3, ease: "easeOut" },
      default: { duration: 0.2 },
    }}
    className={cn(
      "absolute left-1/2 transform -translate-x-1/2 translate-y-4 z-10 rounded-lg bg-[#102924]",
      error ? "top-[41%] border-t-destructive" : "top-[37%]"
    )}
  >
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`w-10 h-10 flex items-center justify-center rounded-lg border-[0.5px] border-border relative`}
    >
      <motion.div className="absolute top-[48%] -left-1 z-10 transform w-2 h-2 bg-[#102924]"></motion.div>
      <motion.div
        initial={{ rotate: 0 }}
        whileHover={{ rotate: 180 }}
        transition={{ duration: 0.5 }}
      >
        <ArrowDown className="text-[#E9F6F3]" />
      </motion.div>
      <motion.div className="absolute top-[48%] -right-1 z-10 transform w-2 h-2 bg-[#102924]"></motion.div>
    </motion.div>
  </motion.div>
);
