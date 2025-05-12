import Image from "next/image";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { X, HelpCircle } from "lucide-react";

import TokenSolIcon from "../../../public/solana-sol-logo.png";
import TokenUsdcIcon from "../../../public/usd-coin-usdc-logo.png";

interface Position {
  id: string;
  tokens: {
    from: string;
    to: string;
    fromIcon: any; // StaticImport
    toIcon: any; // StaticImport
  };
  amountFrom: string;
  amountTo: string;
  avgPrice: string;
  duration: string;
  progress: number;
  estSavings: string;
  status: "Active" | "Successful" | "Canceled" | "Failed";
  startTime: string;
  endTime: string;
  positionId: string;
  onClose?: () => void;
  statusTooltip?: string;
  timeLeft?: string;
}

const getRowStyles = (status: Position["status"]) => {
  switch (status) {
    case "Active":
      return "bg-[#0A352B] border-b border-b-[#109071] hover:bg-[#0d4437]";
    case "Successful":
      return "bg-[#0A352B] border-b border-b-[#109071] hover:bg-[#0d4437]";
    case "Canceled":
      return "bg-[#382424] border-b border-b-[#FF4D4D] hover:bg-[#4a2f2f]";
    case "Failed":
      return "bg-[#382424] border-b border-b-[#FF4D4D] hover:bg-[#4a2f2f]";
    default:
      return "bg-background hover:bg-muted";
  }
};

const getCellTextColor = (status: Position["status"]): string => {
  if (status === "Canceled" || status === "Failed") {
    return "text-[#d1c7c7]";
  }
  return "text-[#E9F6F3]";
};

const getStatusBadgeVariant = (
  status: Position["status"]
): "default" | "destructive" | "outline" | "secondary" => {
  switch (status) {
    case "Active":
      return "default"; // Or a custom success-like variant
    case "Successful":
      return "secondary"; // Or a custom variant, assuming default is greenish
    case "Canceled":
      return "outline";
    case "Failed":
      return "destructive";
    default:
      return "default";
  }
};

const getProgressColor = (status: Position["status"]): string => {
  if (status === "Successful") return "text-[#109071]"; // Green for successful
  if (status === "Active") return "text-[#E9F6F3]"; // Default for active
  return "text-[#9DA5A3]"; // Muted for Canceled/Failed
};

export const PositionsTable = ({
  positions = [],
}: {
  positions?: Position[];
}) => {
  return (
    <TooltipProvider>
      <div className="rounded-md border border-none  overflow-hidden bg-[#091F1A]">
        <Table className="min-w-full border-none sm:border-none">
          <TableHeader className="bg-[#0A352B] border-b border-b-[#109071]">
            <TableRow className="hover:bg-[#0A352B]">
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider w-[60px] text-center">
                {" "}
                {/* Adjusted padding & width */}
                Close
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider min-w-[150px]">
                Tokens
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider">
                Amount (From)
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider">
                Amount (To)
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider">
                Avg. Price
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider">
                Duration
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider">
                Progress
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider">
                <div className="flex items-center gap-1">
                  Est. Savings
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="focus:outline-none">
                        <HelpCircle className="h-3 w-3 text-[#40A68D]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#102924] text-[#E9F6F3] border-[#109071]">
                      <p>Estimated savings compared to a market order.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider">
                Status
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider">
                Start Time
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-medium text-[#E9F6F3] tracking-wider">
                End Time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow
                key={position.id}
                className={`text-sm font-medium ${getRowStyles(position.status)} ${getCellTextColor(position.status)}`}
              >
                <TableCell className="px-3 py-3 text-center">
                  {position.status === "Active" && position.onClose && (
                    <button
                      onClick={position.onClose}
                      className="p-1 hover:bg-gray-700/50 rounded focus:outline-none disabled:opacity-50"
                      aria-label={`Close position ${position.positionId}`}
                      tabIndex={0}
                    >
                      <X className="h-3.5 w-3.5 text-[#1CF6C2]" />
                    </button>
                  )}
                </TableCell>
                <TableCell className="px-3 py-3">
                  <div className="flex items-center">
                    <div className="flex -space-x-2 mr-2">
                      {" "}
                      {/* Overlapping icons */}
                      <Image
                        src={position.tokens.fromIcon}
                        alt={position.tokens.from}
                        width={20}
                        height={20}
                        className="rounded-full border border-[#1CF6C2]"
                      />
                      <Image
                        src={position.tokens.toIcon}
                        alt={position.tokens.to}
                        width={20}
                        height={20}
                        className="rounded-full border border-[#1CF6C2]"
                      />
                    </div>
                    <span className="font-semibold">
                      {position.tokens.from}
                    </span>
                    <span className="mx-1">/</span>
                    <span>{position.tokens.to}</span>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-3 font-semibold">
                  {position.amountFrom}
                </TableCell>
                <TableCell className="px-3 py-3 font-semibold">
                  {position.amountTo}
                </TableCell>
                <TableCell className="px-3 py-3 font-semibold">
                  {position.avgPrice}
                </TableCell>
                <TableCell className="px-3 py-3">
                  {position.status === "Active" && position.timeLeft
                    ? position.timeLeft
                    : position.duration}
                </TableCell>
                <TableCell
                  className={`px-3 py-3 font-semibold ${getProgressColor(position.status)}`}
                >
                  {position.progress}%
                </TableCell>
                <TableCell className="px-3 py-3 font-semibold text-[#1CF6C2]">
                  {position.estSavings}
                </TableCell>
                <TableCell className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    {/* <Badge
                      variant={getStatusBadgeVariant(position.status)}
                      className={
                        position.status === "Active"
                          ? "bg-[#1CF6C2] text-[#091F1A]"
                          : position.status === "Successful"
                            ? "bg-[#109071] text-white" // Figma 'Successful' label color
                            : position.status === "Canceled"
                              ? "border-[#FF4D4D] text-[#FF4D4D] bg-transparent" // Ensure border is visible
                              : position.status === "Failed"
                                ? "bg-[#FF4D4D] text-white"
                                : "" // Figma 'Failed' label color
                      }
                    > */}
                    [{" "}
                    <span
                      className={
                        position.status === "Active"
                          ? " text-accent"
                          : position.status === "Successful"
                            ? "  text-secondary" // Figma 'Successful' label color
                            : position.status === "Canceled"
                              ? " text-destructive-40 bg-transparent" // Ensure border is visible
                              : position.status === "Failed"
                                ? " text-destructive-60 "
                                : "" // Figma 'Failed' label color
                      }
                    >
                      {position.status}{" "}
                    </span>
                    ]
                    {position.statusTooltip && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="focus:outline-none">
                            <HelpCircle
                              className={`h-3 w-3 ${position.status === "Failed" ? "text-[#FF4D4D]" : "text-[#40A68D]"}`}
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#102924] text-[#E9F6F3] border-[#109071] max-w-xs">
                          <p>{position.statusTooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-3">
                  {position.startTime}
                </TableCell>
                <TableCell className="px-3 py-3">{position.endTime}</TableCell>
              </TableRow>
            ))}
            {positions && positions.length === 0 && (
              <TableRow className="hover:bg-[#0A352B]">
                <TableCell
                  colSpan={12}
                  className="px-3 py-10 text-center text-[#9DA5A3]"
                >
                  No open positions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};

export default PositionsTable;
