import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input component.
 *
 * This component renders an input field with a default set of styles.
 * It uses the cn utility function from @/lib/utils to concatenate the base and variant class names.
 *
 * @param {Object} props - The props passed to the component.
 * @param {String} props.className - Additional class names to be applied to the component.
 * @param {String} props.type - The type of the input field.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns {React.ReactElement} - The Input component.
 */
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
