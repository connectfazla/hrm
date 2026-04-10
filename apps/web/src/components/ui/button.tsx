import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary/5 hover:bg-primary/0 border-primary/30 text-foreground",
        destructive: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground border-secondary/60 hover:bg-secondary/80",
        ghost: "border-transparent bg-transparent hover:border-border hover:bg-white/10",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
        solid: "bg-primary hover:bg-primary/90 text-primary-foreground border-transparent",
      },
      size: {
        default: "h-9 px-6 py-1.5",
        sm: "h-8 px-4 py-0.5 text-xs",
        lg: "h-11 px-10 py-2.5",
        icon: "h-9 w-9",
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
  neon?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, neon = true, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          neon &&
            "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:mx-auto before:h-px before:w-3/4 before:bg-gradient-to-r before:from-transparent before:via-primary before:to-transparent before:opacity-0 before:transition-all before:duration-500 group-hover:before:opacity-100 after:pointer-events-none after:absolute after:-bottom-px after:inset-x-0 after:mx-auto after:h-px after:w-3/4 after:bg-gradient-to-r after:from-transparent after:via-primary after:to-transparent after:opacity-0 after:transition-all after:duration-500 group-hover:after:opacity-30"
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
