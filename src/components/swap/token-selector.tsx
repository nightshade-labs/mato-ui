import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export type TokenData = {
  symbol: string;
  image: string;
};

type TokenSelectorProps = {
  token: TokenData;
};

export const TokenSelector = ({ token }: TokenSelectorProps) => (
  <div className="flex items-center gap-2 bg-[#102924] py-2 px-3 rounded-lg border border-[#1CF6C2]/50">
    <Avatar className="w-6 h-6 bg-[#0A352B] border border-[#1CF6C2]/40">
      <AvatarImage src={token.image} />
      <AvatarFallback>{token.symbol.substring(0, 1)}</AvatarFallback>
    </Avatar>
    <span className="text-white font-medium">{token.symbol}</span>
  </div>
);
