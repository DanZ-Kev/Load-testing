import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { LoadingSpinner, Skeleton } from "./LoadingSpinner"
import { AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react"

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "shadow-lg hover:shadow-xl",
        outline: "border-2",
        ghost: "border-transparent shadow-none",
        gradient: "bg-gradient-to-br from-card to-card/80",
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      interactive: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  emptyAction?: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant, 
    padding,
    interactive,
    loading,
    error,
    empty,
    emptyMessage = "No data available",
    emptyAction,
    children,
    ...props 
  }, ref) => {
    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(cardVariants({ variant, padding, interactive }), className)}
          {...props}
        >
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div
          ref={ref}
          className={cn(cardVariants({ variant, padding, interactive }), "border-destructive/50", className)}
          {...props}
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error loading data</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </div>
      )
    }

    if (empty) {
      return (
        <div
          ref={ref}
          className={cn(cardVariants({ variant, padding, interactive }), className)}
          {...props}
        >
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-muted p-3">
              <Info className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">{emptyMessage}</p>
            {emptyAction}
          </div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, interactive }), className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pb-4", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4 border-t", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Status Card for displaying metrics and status information
export interface StatusCardProps extends Omit<CardProps, 'children'> {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
    period?: string
  }
  status?: 'success' | 'warning' | 'error' | 'info'
  icon?: React.ReactNode
  trend?: Array<{ label: string; value: number }>
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  change,
  status,
  icon,
  trend,
  className,
  ...props
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-success'
      case 'warning': return 'text-warning'
      case 'error': return 'text-destructive'
      case 'info': return 'text-primary'
      default: return 'text-foreground'
    }
  }

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'increase': return 'text-success'
      case 'decrease': return 'text-destructive'
      default: return 'text-muted-foreground'
    }
  }

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'increase': return '↗'
      case 'decrease': return '↘'
      default: return '→'
    }
  }

  return (
    <Card className={className} {...props}>
      <CardContent className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn("text-2xl font-bold", getStatusColor(status))}>
                {value}
              </span>
              {change && (
                <span className={cn("text-sm font-medium flex items-center", getChangeColor(change.type))}>
                  {getChangeIcon(change.type)}
                  {Math.abs(change.value)}%
                  {change.period && (
                    <span className="ml-1 text-muted-foreground">
                      {change.period}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          {icon && (
            <div className={cn("flex-shrink-0", getStatusColor(status))}>
              {icon}
            </div>
          )}
        </div>
        
        {trend && (
          <div className="mt-4 flex items-center gap-1">
            {trend.map((point, index) => (
              <div
                key={index}
                className="h-2 flex-1 bg-muted rounded-full overflow-hidden"
              >
                <div
                  className={cn("h-full transition-all duration-500", getStatusColor(status).replace('text-', 'bg-'))}
                  style={{ width: `${Math.min(point.value, 100)}%` }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Skeleton Card for loading states
export interface SkeletonCardProps extends CardProps {
  lines?: number
  showHeader?: boolean
  showFooter?: boolean
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  showHeader = true,
  showFooter = false,
  className,
  ...props
}) => {
  return (
    <Card className={className} {...props}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "h-4",
                index === lines - 1 ? "w-1/2" : "w-full"
              )}
            />
          ))}
        </div>
      </CardContent>
      {showFooter && (
        <CardFooter>
          <Skeleton className="h-8 w-20" />
        </CardFooter>
      )}
    </Card>
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  StatusCard,
  SkeletonCard,
  cardVariants
}