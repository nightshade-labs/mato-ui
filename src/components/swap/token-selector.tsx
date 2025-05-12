import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export type TokenData = {
  symbol: string;
  image: string;
};

type TokenSelectorProps = {
  token: TokenData;
  error?: boolean;
};

export const TokenSelector = ({ token, error }: TokenSelectorProps) => (
  <div
    className={`flex items-center gap-2  py-2 px-3 rounded-lg border ${error ? "border-red-500 bg-[#382424]" : "border-[#1CF6C2]/50 bg-[#102924] "}`}
  >
    <Avatar className={`w-6 h-6`}>
      <AvatarImage src={token.image} />
      <AvatarFallback>{token.symbol.substring(0, 1)}</AvatarFallback>
    </Avatar>
    <span className="text-white font-medium">{token.symbol}</span>
  </div>
);
