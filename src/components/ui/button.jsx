import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * buttonVariants function.
 *
 * This function generates a set of class names for the Button component based on the variant and size.
 * It uses the class-variance-authority library to define the base and variant classes.
 *
 * @returns {Object} - An object containing the class names for the Button component.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Button component.
 *
 * This component renders a button with a variant and size based on the props passed.
 * It uses the cn utility function from @/lib/utils to concatenate the base and variant class names.
 *
 * @param {Object} props - The props passed to the component.
 * @param {String} props.className - Additional class names to be applied to the component.
 * @param {String} props.variant - The variant of the button to be rendered.
 * @param {String} props.size - The size of the button to be rendered.
 * @param {Boolean} props.asChild - Indicates if the component should be rendered as a child of another component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns {React.ReactElement} - The Button component.
 */
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
