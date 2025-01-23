"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { LoadingSpinner } from "../ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useMatoProgram } from "./mato-data-access";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { AppHero } from "../ui/ui-layout";
import { useConnection } from "@solana/wallet-adapter-react";
import { Clock4, Lock, LockOpen, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { durationStringToSlots } from "./chart-ui";
import { BN } from "bn.js";

const OrderDialogFormSchema = z.object({
  amount: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().gt(0, "Must be greater than zero")
  ),
  time: z.string({
    required_error: "Please set a time horizon.",
  }),
});

export function OrderDialog({
  title,
  amountLabel,
  handleSubmit,
}: {
  title: string;
  amountLabel: string;
  handleSubmit: (amount: number, duration: string) => Promise<void>;
}) {
  const form = useForm<z.infer<typeof OrderDialogFormSchema>>({
    resolver: zodResolver(OrderDialogFormSchema),
  });

  async function onSubmit(data: z.infer<typeof OrderDialogFormSchema>) {
    await handleSubmit(data.amount, data.time).then(() => setIsOpen(false));
  }

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>{title}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Stream your order over your desired time horizon.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col space-y-1.5">
                    <FormLabel>{amountLabel}</FormLabel>
                    <Input
                      id="amount"
                      placeholder="0,0"
                      type="number"
                      defaultValue={field.value}
                      onChange={field.onChange}
                      onVolumeChange={field.onChange}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time horizon</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1min">1 min</SelectItem>
                      <SelectItem value="5min">5 min</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="1day">1 day</SelectItem>
                      <SelectItem value="1week">1 week</SelectItem>
                      <SelectItem value="1month">1 month</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Your order is evenly distributed over this period of time.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit order</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const SwapFormSchema = z.object({
  amount: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().gt(0, "Must be greater than zero")
  ),
  duration: z.string({
    required_error: "Please set a duration",
  }),
  limit: z.string().optional(),
});

export function SwapInterface({}: {}) {
  const { getMarket, depositTokenA, depositTokenB } = useMatoProgram();
  const { connection } = useConnection();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [isLimitOrder, setIsLimitOrder] = useState(false);
  const [isInstantSwap, setIsInstantSwap] = useState(false);

  const form = useForm<z.infer<typeof SwapFormSchema>>({
    resolver: zodResolver(SwapFormSchema),
  });

  async function onSubmit(data: z.infer<typeof SwapFormSchema>) {
    let slotDuration = durationStringToSlots.get(data.duration);
    if (side == "sell") {
      depositTokenA.mutate({
        amount: data.amount * 1000000000,
        duration: slotDuration || 0,
      });
    } else {
      depositTokenB.mutate({
        amount: data.amount * 1000000,
        duration: slotDuration || 0,
      });
    }
  }

  if (getMarket.isLoading) {
    return (
      <div className="w-full flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  // let tresurayA = await connection.getTokenAccountBalance(
  //   getMarket.data?.treasuryA || PublicKey.default
  // );
  // let treasuryB = await connection.getTokenAccountBalance(
  //   getMarket.data?.treasuryB || PublicKey.default
  // );

  // console.log("tokenvolume a", getMarket.data?.tokenAVolume.toString());
  // console.log("tokenvolume b", getMarket.data?.tokenBVolume.toString());
  // console.log("treasury A", tresurayA);
  // console.log("treasury B", treasuryB);

  let tradingVolumeA =
    getMarket.data?.tokenAVolume.div(new BN(1000000)).toNumber() || 0;
  let tradingVolumeB =
    getMarket.data?.tokenBVolume.div(new BN(1000000)).toNumber() || 0;
  let isTrading = tradingVolumeA * tradingVolumeB !== 0;

  let marketPrice = isTrading
    ? ((tradingVolumeB * 1000) / tradingVolumeA).toFixed(2)
    : "no trades right now";

  return (
    <Card className="w-full lg:w-fit">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 sm:gap-8 justify-between">
            <TokenSelection
              title="You're trading"
              selectOptions={supportedTradeTokens}
            />
            <TokenSelection
              title="Paying with"
              selectOptions={supportedNumeraireTokens}
            />
          </div>
          <div className="flex flex-col gap-2 bg-slate-100 p-4 rounded-md">
            <div className="text-sm">Market price</div>
            <div className="text-xl font-bold">
              1 tSOL = {marketPrice} tUSDC
            </div>
          </div>
          <div className="flex justify-between gap-8">
            <Button
              variant={side === "buy" ? "default" : "outline"}
              onClick={() => setSide("buy")}
              className="flex-1"
            >
              Buy
            </Button>
            <Button
              variant={side === "sell" ? "default" : "outline"}
              onClick={() => setSide("sell")}
              className="flex-1"
            >
              Sell
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col space-y-1.5">
                    <FormLabel>
                      Amount {side == "buy" ? "(tUSDC)" : "(tSOL)"}
                    </FormLabel>
                    <Input
                      id="amount"
                      placeholder="0,0"
                      type="number"
                      defaultValue={field.value}
                      onChange={field.onChange}
                      onVolumeChange={field.onChange}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <div className="flex gap-1 items-center">
                      <FormLabel>Duration</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info size={12} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Instant swap not supported yet.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div
                      className="flex gap-1 items-center hover:cursor-pointer"
                      onClick={() => setIsInstantSwap(!isInstantSwap)}
                    >
                      <Clock4 size={16} />{" "}
                      <div className="text-sm">
                        {isInstantSwap ? "Instant" : "Stream"}{" "}
                      </div>
                    </div>
                  </div>

                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isInstantSwap}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1min">1 min</SelectItem>
                      <SelectItem value="5min">5 min</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="1day">1 day</SelectItem>
                      <SelectItem value="1week">1 week</SelectItem>
                      <SelectItem value="1month">1 month</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {isInstantSwap
                      ? "Your order is fulfilled at once"
                      : "Your order is evenly distributed over this period of time"}
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex justify-between">
                      <div className="flex gap-1 items-center">
                        <FormLabel>
                          {side == "buy" ? "Maximum " : "Minimum "} Price
                          (tUSDC)
                        </FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info size={12} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Limit order not supported yet.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div
                        className="flex gap-2 items-center hover:cursor-pointer"
                        onClick={() => setIsLimitOrder(!isLimitOrder)}
                      >
                        <div className="text-sm">
                          {isLimitOrder ? (
                            <div className="flex gap-1 items-center">
                              <Lock size={16} /> <div>Limit</div>
                            </div>
                          ) : (
                            <div className="flex gap-1 items-center">
                              <LockOpen size={16} /> <div>Market</div>
                            </div>
                          )}{" "}
                        </div>
                      </div>
                    </div>

                    <Input
                      id="amount"
                      placeholder="0,0"
                      type="number"
                      disabled={!isLimitOrder}
                      defaultValue={0}
                      onChange={field.onChange}
                      onVolumeChange={field.onChange}
                    />
                  </div>
                  <FormDescription>
                    {!isLimitOrder
                      ? "Using market price"
                      : side == "buy"
                        ? "Won't execute if price is above this value"
                        : "Won't execute if price is below this value"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit order</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function TokenSelection({
  title,
  selectOptions,
}: {
  title: string;
  selectOptions: supportedToken[];
}) {
  return (
    <div className="flex flex-col w-full gap-2">
      <div className="font-bold">{title}</div>
      <Select defaultValue={selectOptions[0].value}>
        <SelectTrigger className="lg:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {selectOptions.map((opt) => (
            <SelectItem value={opt.value} key={opt.value}>
              <div className="flex items-center gap-2">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={opt.imgSrc} />
                  <AvatarFallback>{opt.name}</AvatarFallback>
                </Avatar>
                <div className="font-semibold">{opt.name}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type supportedToken = {
  name: string;
  value: string;
  imgSrc: string;
};

let supportedTradeTokens: supportedToken[] = [
  { name: "tSOL", value: "tSol", imgSrc: "solana-sol-logo.png" },
];

let supportedNumeraireTokens: supportedToken[] = [
  { name: "tUSDC", value: "tUSDC", imgSrc: "usd-coin-usdc-logo.png" },
];
