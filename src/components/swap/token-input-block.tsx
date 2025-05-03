import { FormField, FormItem, FormMessage } from "../ui/form";
import { Info } from "lucide-react";
import { Input } from "../ui/input";
import { TokenData, TokenSelector } from "./token-selector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type TokenInputBlockProps = {
  title: string;
  balance: React.ReactNode;
  amount: number | string;
  usdValue: string;
  token: TokenData;
  isInput?: boolean;
  percentageButtons?: React.ReactNode;
  form?: any;
  fieldName?: string;
};

export const TokenInputBlock = ({
  title,
  balance,
  amount,
  usdValue,
  token,
  isInput = false,
  percentageButtons,
  form,
  fieldName,
}: TokenInputBlockProps) => (
  <div className="bg-[#0A352B] mt-2 rounded-lg p-3 border border-[#1CF6C2]/50">
    <div className="flex justify-between items-center mb-3">
      <div className="text-base font-semibold text-[#E9F6F3]">{title}</div>
      <div className="flex gap-1 items-start text-[#109071]">
        <div className="flex items-center mr-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="19"
            height="19"
            viewBox="0 0 19 19"
            fill="none"
            className="mt-0.5"
          >
            <g clip-path="url(#clip0_172_2634)">
              <path
                d="M2.96875 4.15625V13.6562C2.96875 13.9712 3.09386 14.2732 3.31656 14.4959C3.53926 14.7186 3.84131 14.8438 4.15625 14.8438H16.0312C16.1887 14.8438 16.3397 14.7812 16.4511 14.6698C16.5624 14.5585 16.625 14.4075 16.625 14.25V5.9375C16.625 5.78003 16.5624 5.62901 16.4511 5.51766C16.3397 5.40631 16.1887 5.34375 16.0312 5.34375H4.15625C3.84131 5.34375 3.53926 5.21864 3.31656 4.99594C3.09386 4.77324 2.96875 4.47119 2.96875 4.15625ZM2.96875 4.15625C2.96875 3.84131 3.09386 3.53926 3.31656 3.31656C3.53926 3.09386 3.84131 2.96875 4.15625 2.96875H14.25"
                stroke="#109071"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M13.3594 10.5391C13.7693 10.5391 14.1016 10.2068 14.1016 9.79688C14.1016 9.38698 13.7693 9.05469 13.3594 9.05469C12.9495 9.05469 12.6172 9.38698 12.6172 9.79688C12.6172 10.2068 12.9495 10.5391 13.3594 10.5391Z"
                fill="#109071"
              />
            </g>
            <defs>
              <clipPath id="clip0_172_2634">
                <rect width="19" height="19" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <span className="text-sm mt-0.5 ml-0.5">{balance}</span>
        </div>
        {percentageButtons && (
          <div className="flex gap-1 mb-3">{percentageButtons}</div>
        )}
      </div>
    </div>

    <div className="flex justify-between items-center">
      {isInput ? (
        <div>
          <FormField
            control={form.control}
            name={fieldName || "amount"}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <div className="flex flex-col">
                  <Input
                    className="text-3xl font-medium bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:outline-none shadow-none"
                    id={fieldName || "amount"}
                    placeholder="0"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(
                        isNaN(e.target.valueAsNumber)
                          ? 0
                          : e.target.valueAsNumber
                      )
                    }
                  />
                  <div className="text-xs text-[#109071] font-medium">
                    {usdValue}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="text-3xl text-[#9DA5A3] font-medium">{amount}</div>
          <div className="text-xs text-[#109071] font-medium">{usdValue}</div>
        </div>
      )}

      <TokenSelector token={token} />
    </div>
  </div>
);
