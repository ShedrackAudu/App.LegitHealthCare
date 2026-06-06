"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { cn } from "@/lib/utils"

// Custom Dialog Implementation (Replaces @radix-ui/react-dialog)
// Optimized for premium feel and build stability in current environment.

interface DialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const DialogContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

const Dialog: React.FC<DialogProps> = ({ children, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const context = React.useContext(DialogContext)
  if (!context) return null

  const child = React.Children.only(children) as React.ReactElement<any>
  return React.cloneElement(child, {
    onClick: (e: React.MouseEvent) => {
      child.props.onClick?.(e)
      context.setOpen(true)
    },
  })
}

const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {children}
    </div>
  )
}

const DialogOverlay: React.FC<{ className?: string }> = ({ className }) => {
  const context = React.useContext(DialogContext)
  if (!context) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => context.setOpen(false)}
      className={cn("fixed inset-0 bg-black/60 backdrop-blur-sm z-50", className)}
    />
  )
}

const DialogContent: React.FC<{ children: React.ReactNode; className?: string; hideClose?: boolean }> = ({ children, className, hideClose = false }) => {
  const context = React.useContext(DialogContext)
  if (!context || !context.open) return null

  return (
    <AnimatePresence>
      <DialogPortal>
        <DialogOverlay />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={cn(
            "relative z-50 w-full max-w-lg overflow-hidden rounded-2xl border bg-background p-6 shadow-2xl transition-all",
            className
          )}
        >
          {children}
          {!hideClose && (
            <button
              onClick={() => context.setOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 opacity-70 transition-opacity hover:bg-muted hover:opacity-100 focus:outline-none"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          )}
        </motion.div>
      </DialogPortal>
    </AnimatePresence>
  )
}

const DialogHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}>
    {children}
  </div>
)

const DialogFooter: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)}>
    {children}
  </div>
)

const DialogTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
    {children}
  </h3>
)

const DialogDescription: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <p className={cn("text-sm text-muted-foreground", className)}>
    {children}
  </p>
)

const DialogClose: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const context = React.useContext(DialogContext)
  if (!context) return null

  const child = React.Children.only(children) as React.ReactElement<any>
  return React.cloneElement(child, {
    onClick: (e: React.MouseEvent) => {
      child.props.onClick?.(e)
      context.setOpen(false)
    },
  })
}

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
