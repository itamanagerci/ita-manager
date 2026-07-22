"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { TriangleAlertIcon, Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

function ToastDot({ className }: { className: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full", className)} aria-hidden />
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <ToastDot className="bg-status-success" />,
        error: <ToastDot className="bg-secondary" />,
        info: <ToastDot className="bg-primary" />,
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "var(--toast-success-bg)",
          "--success-border": "var(--toast-success-border)",
          "--success-text": "var(--toast-success-text)",
          "--error-bg": "var(--toast-error-bg)",
          "--error-border": "var(--toast-error-border)",
          "--error-text": "var(--toast-error-text)",
          "--info-bg": "var(--toast-info-bg)",
          "--info-border": "var(--toast-info-border)",
          "--info-text": "var(--toast-info-text)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
