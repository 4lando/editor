"use client";

import * as ToastPrimitives from "@radix-ui/react-toast";
import { type VariantProps, cva } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * ToastProvider component.
 *
 * This component wraps the ToastPrimitives.Provider component from @radix-ui/react-toast.
 * It is used to provide context to the toast components.
 */
const ToastProvider = ToastPrimitives.Provider;

/**
 * ToastViewport component.
 *
 * This component wraps the ToastPrimitives.Viewport component from @radix-ui/react-toast.
 * It is used to render the viewport for the toast notifications.
 *
 * @param {React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The ToastViewport component.
 */
const ToastViewport = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-4 left-1/2 z-[100] flex max-h-screen w-full -translate-x-1/2 flex-col items-center justify-center p-4",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

/**
 * toastVariants function.
 *
 * This function generates a set of class names for the Toast component based on the variant.
 * It uses the class-variance-authority library to define the base and variant classes.
 *
 * @returns {Object} - An object containing the class names for the Toast component.
 */
const toastVariants = cva(
  `group pointer-events-auto relative flex w-auto min-w-[300px] max-w-[500px]
   items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 shadow-lg
   translate-y-full
   data-[state=open]:animate-toast-in
   data-[state=closed]:animate-toast-out
   motion-reduce:transition-none`,
  {
    variants: {
      variant: {
        default: "border-pink-500 bg-[var(--c-bg-lighter)] text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/**
 * Toast component.
 *
 * This component wraps the ToastPrimitives.Root component from @radix-ui/react-toast.
 * It is used to render a toast notification with a variant based on the props passed.
 * It uses the cn utility function from @/lib/utils to concatenate the base and variant class names.
 *
 * @param {React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The Toast component.
 */
const Toast = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
});
Toast.displayName = ToastPrimitives.Root.displayName;

/**
 * ToastAction component.
 *
 * This component wraps the ToastPrimitives.Action component from @radix-ui/react-toast.
 * It is used to render an action button within the toast notification.
 *
 * @param {React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The ToastAction component.
 */
const ToastAction = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

/**
 * ToastClose component.
 *
 * This component wraps the ToastPrimitives.Close component from @radix-ui/react-toast.
 * It is used to render the close button within the toast notification.
 *
 * @param {React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The ToastClose component.
 */
const ToastClose = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

/**
 * ToastTitle component.
 *
 * This component wraps the ToastPrimitives.Title component from @radix-ui/react-toast.
 * It is used to render the title of the toast notification.
 *
 * @param {React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The ToastTitle component.
 */
const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-md font-semibold", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

/**
 * ToastDescription component.
 *
 * This component wraps the ToastPrimitives.Description component from @radix-ui/react-toast.
 * It is used to render the description of the toast notification.
 *
 * @param {React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The ToastDescription component.
 */
const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-md opacity-90", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
