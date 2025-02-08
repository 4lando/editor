import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

/**
 * badgeVariants function.
 *
 * This function generates a set of class names for the Badge component based on the variant.
 * It uses the class-variance-authority library to define the base and variant classes.
 *
 * @returns {Object} - An object containing the class names for the Badge component.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Badge component.
 *
 * This component renders a badge with a variant based on the props passed.
 * It uses the cn utility function from @/lib/utils to concatenate the base and variant class names.
 *
 * @param {Object} props - The props passed to the component.
 * @param {String} props.className - Additional class names to be applied to the component.
 * @param {String} props.variant - The variant of the badge to be rendered.
 * @returns {React.ReactElement} - The Badge component.
 */
function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
