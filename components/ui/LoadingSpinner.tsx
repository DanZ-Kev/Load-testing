import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-current border-t-transparent",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6", 
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
      variant: {
        default: "text-primary",
        secondary: "text-secondary-foreground",
        muted: "text-muted-foreground",
        destructive: "text-destructive",
        warning: "text-warning",
        success: "text-success",
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label = "Loading...", ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn("flex items-center justify-center", className)} 
        {...props}
      >
        <div 
          className={spinnerVariants({ size, variant })}
          role="status"
          aria-label={label}
        />
        <span className="sr-only">{label}</span>
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

// Skeleton loader component for content placeholders
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("animate-pulse rounded-md bg-muted", className)}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

// Shimmer effect for loading states
export interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const Shimmer = React.forwardRef<HTMLDivElement, ShimmerProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("shimmer rounded-md bg-gradient-to-r from-muted via-muted/50 to-muted", className)}
        {...props}
      />
    )
  }
)
Shimmer.displayName = "Shimmer"

// Full page loading component
export interface PageLoadingProps {
  message?: string
  className?: string
}

const PageLoading: React.FC<PageLoadingProps> = ({ 
  message = "Loading...", 
  className 
}) => {
  return (
    <div className={cn(
      "flex min-h-screen items-center justify-center bg-background",
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="xl" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

// Loading overlay component
export interface LoadingOverlayProps {
  visible: boolean
  message?: string
  className?: string
  backdrop?: boolean
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = "Loading...",
  className,
  backdrop = true
}) => {
  if (!visible) return null

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      backdrop && "bg-background/80 backdrop-blur-sm",
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="xl" />
        <p className="text-foreground font-medium">{message}</p>
      </div>
    </div>
  )
}

// Inline loading component for buttons and small areas
export interface InlineLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg"
  message?: string
}

const InlineLoading: React.FC<InlineLoadingProps> = ({
  size = "default",
  message,
  className,
  ...props
}) => {
  return (
    <div 
      className={cn("flex items-center gap-2", className)} 
      {...props}
    >
      <LoadingSpinner size={size} />
      {message && (
        <span className="text-sm text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  )
}

export { 
  LoadingSpinner, 
  spinnerVariants,
  Skeleton,
  Shimmer,
  PageLoading,
  LoadingOverlay,
  InlineLoading
}