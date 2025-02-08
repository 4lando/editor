import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Dialog component.
 *
 * This component wraps the DialogPrimitive.Root component from @radix-ui/react-dialog.
 * It is used to create a dialog that can be triggered to open or close.
 */
const Dialog = DialogPrimitive.Root

/**
 * DialogTrigger component.
 *
 * This component wraps the DialogPrimitive.Trigger component from @radix-ui/react-dialog.
 * It is used to trigger the opening of the Dialog.
 */
const DialogTrigger = DialogPrimitive.Trigger

/**
 * DialogPortal component.
 *
 * This component wraps the DialogPrimitive.Portal component from @radix-ui/react-dialog.
 * It is used to portal the DialogContent to the end of the document.
 */
const DialogPortal = DialogPrimitive.Portal

/**
 * DialogClose component.
 *
 * This component wraps the DialogPrimitive.Close component from @radix-ui/react-dialog.
 * It is used to close the Dialog.
 */
const DialogClose = DialogPrimitive.Close

/**
 * DialogOverlay component.
 *
 * This component wraps the DialogPrimitive.Overlay component from @radix-ui/react-dialog.
 * It is used to create the overlay that covers the background when the Dialog is open.
 *
 * @param {Object} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The DialogOverlay component.
 */
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * DialogContent component.
 *
 * This component wraps the DialogPrimitive.Content component from @radix-ui/react-dialog.
 * It is used to create the content of the Dialog.
 *
 * @param {Object} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The DialogContent component.
 */
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}>
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

/**
 * DialogHeader component.
 *
 * This component is used to create the header of the Dialog.
 *
 * @param {Object} props - The props passed to the component.
 * @returns The DialogHeader component.
 */
const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props} />
)
DialogHeader.displayName = "DialogHeader"

/**
 * DialogFooter component.
 *
 * This component is used to create the footer of the Dialog.
 *
 * @param {Object} props - The props passed to the component.
 * @returns The DialogFooter component.
 */
const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props} />
)
DialogFooter.displayName = "DialogFooter"

/**
 * DialogTitle component.
 *
 * This component wraps the DialogPrimitive.Title component from @radix-ui/react-dialog.
 * It is used to create the title of the Dialog.
 *
 * @param {Object} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The DialogTitle component.
 */
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

/**
 * DialogDescription component.
 *
 * This component wraps the DialogPrimitive.Description component from @radix-ui/react-dialog.
 * It is used to create the description of the Dialog.
 *
 * @param {Object} props - The props passed to the component.
 * @param {React.RefObject} ref - The ref object passed to the component.
 * @returns The DialogDescription component.
 */
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
