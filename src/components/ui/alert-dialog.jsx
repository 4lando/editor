import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * AlertDialog component.
 *
 * This component wraps the AlertDialogPrimitive.Root component from @radix-ui/react-alert-dialog.
 * It is used to create a dialog that can be triggered to open or close.
 */
const AlertDialog = AlertDialogPrimitive.Root;

/**
 * AlertDialogTrigger component.
 *
 * This component wraps the AlertDialogPrimitive.Trigger component from @radix-ui/react-alert-dialog.
 * It is used to trigger the opening of the AlertDialog.
 */
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

/**
 * AlertDialogPortal component.
 *
 * This component wraps the AlertDialogPrimitive.Portal component from @radix-ui/react-alert-dialog.
 * It is used to portal the AlertDialogContent to the end of the document.
 */
const AlertDialogPortal = AlertDialogPrimitive.Portal;

/**
 * AlertDialogOverlay component.
 *
 * This component wraps the AlertDialogPrimitive.Overlay component from @radix-ui/react-alert-dialog.
 * It is used to create the overlay that covers the background when the AlertDialog is open.
 *
 * @param {Object} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The AlertDialogOverlay component.
 */
const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

/**
 * AlertDialogContent component.
 *
 * This component wraps the AlertDialogPrimitive.Content component from @radix-ui/react-alert-dialog.
 * It is used to create the content of the AlertDialog.
 *
 * @param {Object} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The AlertDialogContent component.
 */
const AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className,
      )}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

/**
 * AlertDialogHeader component.
 *
 * This component is used to create the header of the AlertDialog.
 *
 * @param {Object} props - The props passed to the component.
 * @returns The AlertDialogHeader component.
 */
const AlertDialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

/**
 * AlertDialogFooter component.
 *
 * This component is used to create the footer of the AlertDialog.
 *
 * @param {Object} props - The props passed to the component.
 * @returns The AlertDialogFooter component.
 */
const AlertDialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

/**
 * AlertDialogTitle component.
 *
 * This component wraps the AlertDialogPrimitive.Title component from @radix-ui/react-alert-dialog.
 * It is used to create the title of the AlertDialog.
 *
 * @param {Object} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The AlertDialogTitle component.
 */
const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

/**
 * AlertDialogDescription component.
 *
 * This component wraps the AlertDialogPrimitive.Description component from @radix-ui/react-alert-dialog.
 * It is used to create the description of the AlertDialog.
 *
 * @param {Object} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The AlertDialogDescription component.
 */
const AlertDialogDescription = React.forwardRef(
  ({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Description
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  ),
);
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName;

/**
 * AlertDialogAction component.
 *
 * This component wraps the AlertDialogPrimitive.Action component from @radix-ui/react-alert-dialog.
 * It is used to create an action button within the AlertDialog.
 *
 * @param {Object} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The AlertDialogAction component.
 */
const AlertDialogAction = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

/**
 * AlertDialogCancel component.
 *
 * This component wraps the AlertDialogPrimitive.Cancel component from @radix-ui/react-alert-dialog.
 * It is used to create a cancel button within the AlertDialog.
 *
 * @param {Object} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The AlertDialogCancel component.
 */
const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className,
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
