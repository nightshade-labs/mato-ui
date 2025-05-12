import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#1CF6C2] text-[#091F1A] shadow hover:bg-[#77FADA] hover:shadow-[0px_0px_20px_-15px_rgba(164,251,231,1)]",
        destructive:
          "bg-[#382424] text-[#C90E0E] shadow-sm hover:text-[#FF2121]",
        outline:
          "bg-[#102924] border border-[#E9F6F3] text-[#E9F6F3] shadow-sm hover:border-[#1CF6C2] hover:shadow-[0px_0px_20px_-20px_rgba(164,251,231,1)]",
        secondary:
          "bg-[#109071] text-[#E9F6F3] shadow-sm hover:bg-[#40A68D] hover:shadow-[0px_0px_20px_-15px_rgba(16,41,36,1)]",
        accent:
          "bg-[#102924] text-accent-foreground shadow-sm hover:bg-[#102924]/90",
        ghost: "hover:text-[#77FADA] text-[#E9F6F3]",
        link: "text-[#E9F6F3] underline-offset-4 hover:text-[#9DA5A3] hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-lg px-8 py-3 text-base",
        xl: "h-14 rounded-lg px-10 py-4 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
