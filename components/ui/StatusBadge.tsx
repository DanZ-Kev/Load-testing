import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Wifi,
  WifiOff,
  Server
} from "lucide-react"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground ring-secondary-foreground/20",
        success: "bg-success/10 text-success ring-success/20",
        warning: "bg-warning/10 text-warning ring-warning/20",
        destructive: "bg-destructive/10 text-destructive ring-destructive/20",
        info: "bg-primary/10 text-primary ring-primary/20",
        secondary: "bg-secondary/80 text-secondary-foreground ring-secondary-foreground/20",
        outline: "text-foreground ring-border",
      },
      size: {
        default: "h-6",
        sm: "h-5 px-2 text-xs",
        lg: "h-7 px-3 text-sm",
      },
      animated: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animated: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
  pulse?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, animated, icon, pulse, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          badgeVariants({ variant, size, animated }),
          pulse && "animate-pulse",
          className
        )}
        ref={ref}
        {...props}
      >
        {icon && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}
        {children}
      </div>
    )
  }
)
Badge.displayName = "Badge"

// Status-specific badge components
export type StatusType = 
  | 'online' 
  | 'offline' 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'paused' 
  | 'cancelled' 
  | 'warning'
  | 'idle'
  | 'error'
  | 'success'

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  status: StatusType
  showIcon?: boolean
  showDot?: boolean
  customLabel?: string
}

const statusConfig: Record<StatusType, {
  variant: VariantProps<typeof badgeVariants>['variant']
  icon: React.ComponentType<{ className?: string }>
  label: string
  dotColor: string
}> = {
  online: {
    variant: 'success',
    icon: Wifi,
    label: 'Online',
    dotColor: 'bg-success',
  },
  offline: {
    variant: 'destructive',
    icon: WifiOff,
    label: 'Offline',
    dotColor: 'bg-destructive',
  },
  pending: {
    variant: 'warning',
    icon: Clock,
    label: 'Pending',
    dotColor: 'bg-warning',
  },
  running: {
    variant: 'info',
    icon: Play,
    label: 'Running',
    dotColor: 'bg-primary',
  },
  completed: {
    variant: 'success',
    icon: CheckCircle,
    label: 'Completed',
    dotColor: 'bg-success',
  },
  failed: {
    variant: 'destructive',
    icon: XCircle,
    label: 'Failed',
    dotColor: 'bg-destructive',
  },
  paused: {
    variant: 'secondary',
    icon: Pause,
    label: 'Paused',
    dotColor: 'bg-secondary-foreground',
  },
  cancelled: {
    variant: 'secondary',
    icon: XCircle,
    label: 'Cancelled',
    dotColor: 'bg-secondary-foreground',
  },
  warning: {
    variant: 'warning',
    icon: AlertTriangle,
    label: 'Warning',
    dotColor: 'bg-warning',
  },
  idle: {
    variant: 'secondary',
    icon: Server,
    label: 'Idle',
    dotColor: 'bg-secondary-foreground',
  },
  error: {
    variant: 'destructive',
    icon: AlertCircle,
    label: 'Error',
    dotColor: 'bg-destructive',
  },
  success: {
    variant: 'success',
    icon: CheckCircle,
    label: 'Success',
    dotColor: 'bg-success',
  },
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ 
    status, 
    showIcon = true, 
    showDot = false,
    customLabel,
    animated,
    pulse,
    className,
    ...props 
  }, ref) => {
    const config = statusConfig[status]
    const Icon = config.icon
    
    // Add pulse for active states
    const shouldPulse = pulse || ['running', 'pending'].includes(status)
    
    // Add animation for running status
    const shouldAnimate = animated || status === 'running'

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        animated={shouldAnimate}
        pulse={shouldPulse}
        className={cn(
          shouldAnimate && "animate-pulse",
          className
        )}
        icon={
          showIcon ? (
            <Icon className="h-3 w-3" />
          ) : showDot ? (
            <div className={cn("h-2 w-2 rounded-full", config.dotColor)} />
          ) : undefined
        }
        {...props}
      >
        {customLabel || config.label}
      </Badge>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

// Health status badge for system monitoring
export interface HealthBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  metric?: {
    value: number
    threshold: number
    unit?: string
  }
}

const HealthBadge: React.FC<HealthBadgeProps> = ({
  health,
  metric,
  className,
  ...props
}) => {
  const getHealthConfig = (health: string) => {
    switch (health) {
      case 'healthy':
        return { variant: 'success' as const, icon: CheckCircle, label: 'Healthy' }
      case 'degraded':
        return { variant: 'warning' as const, icon: AlertTriangle, label: 'Degraded' }
      case 'unhealthy':
        return { variant: 'destructive' as const, icon: XCircle, label: 'Unhealthy' }
      default:
        return { variant: 'secondary' as const, icon: AlertCircle, label: 'Unknown' }
    }
  }

  const config = getHealthConfig(health)
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={className}
      icon={<Icon className="h-3 w-3" />}
      {...props}
    >
      {config.label}
      {metric && (
        <span className="ml-1 opacity-75">
          {metric.value}{metric.unit}
        </span>
      )}
    </Badge>
  )
}

// Load testing specific status badge
export interface LoadTestStatusBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  status: 'idle' | 'starting' | 'running' | 'stopping' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  duration?: string
}

const LoadTestStatusBadge: React.FC<LoadTestStatusBadgeProps> = ({
  status,
  progress,
  duration,
  className,
  ...props
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'idle':
        return { variant: 'secondary' as const, icon: Server, label: 'Idle' }
      case 'starting':
        return { variant: 'info' as const, icon: RotateCcw, label: 'Starting' }
      case 'running':
        return { variant: 'info' as const, icon: Play, label: 'Running' }
      case 'stopping':
        return { variant: 'warning' as const, icon: Pause, label: 'Stopping' }
      case 'completed':
        return { variant: 'success' as const, icon: CheckCircle, label: 'Completed' }
      case 'failed':
        return { variant: 'destructive' as const, icon: XCircle, label: 'Failed' }
      case 'cancelled':
        return { variant: 'secondary' as const, icon: XCircle, label: 'Cancelled' }
      default:
        return { variant: 'secondary' as const, icon: AlertCircle, label: 'Unknown' }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon
  
  const shouldAnimate = ['starting', 'running', 'stopping'].includes(status)

  return (
    <Badge
      variant={config.variant}
      animated={shouldAnimate}
      className={cn(
        shouldAnimate && "animate-pulse",
        className
      )}
      icon={
        <Icon className={cn(
          "h-3 w-3",
          status === 'starting' && "animate-spin"
        )} />
      }
      {...props}
    >
      {config.label}
      {progress !== undefined && status === 'running' && (
        <span className="ml-1 opacity-75">
          {Math.round(progress)}%
        </span>
      )}
      {duration && ['completed', 'failed'].includes(status) && (
        <span className="ml-1 opacity-75">
          {duration}
        </span>
      )}
    </Badge>
  )
}

// Connection status badge for worker nodes
export interface ConnectionBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  connected: boolean
  latency?: number
  lastSeen?: Date
}

const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({
  connected,
  latency,
  lastSeen,
  className,
  ...props
}) => {
  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'text-success'
    if (latency < 200) return 'text-warning'
    return 'text-destructive'
  }

  return (
    <Badge
      variant={connected ? 'success' : 'destructive'}
      className={className}
      icon={connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {...props}
    >
      {connected ? 'Connected' : 'Disconnected'}
      {connected && latency && (
        <span className={cn("ml-1 text-xs", getLatencyColor(latency))}>
          {latency}ms
        </span>
      )}
      {!connected && lastSeen && (
        <span className="ml-1 text-xs opacity-75">
          {new Date(lastSeen).toLocaleTimeString()}
        </span>
      )}
    </Badge>
  )
}

// Priority badge for tasks and jobs
export interface PriorityBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  priority: 'low' | 'medium' | 'high' | 'critical'
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  className,
  ...props
}) => {
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'low':
        return { variant: 'secondary' as const, label: 'Low', color: 'bg-blue-500' }
      case 'medium':
        return { variant: 'info' as const, label: 'Medium', color: 'bg-yellow-500' }
      case 'high':
        return { variant: 'warning' as const, label: 'High', color: 'bg-orange-500' }
      case 'critical':
        return { variant: 'destructive' as const, label: 'Critical', color: 'bg-red-500' }
      default:
        return { variant: 'secondary' as const, label: 'Unknown', color: 'bg-gray-500' }
    }
  }

  const config = getPriorityConfig(priority)

  return (
    <Badge
      variant={config.variant}
      className={className}
      icon={<div className={cn("h-2 w-2 rounded-full", config.color)} />}
      {...props}
    >
      {config.label}
    </Badge>
  )
}

// Version badge for scripts and releases
export interface VersionBadgeProps extends Omit<BadgeProps, 'variant'> {
  version: string
  isLatest?: boolean
  isPrerelease?: boolean
}

const VersionBadge: React.FC<VersionBadgeProps> = ({
  version,
  isLatest = false,
  isPrerelease = false,
  className,
  ...props
}) => {
  const getVariant = () => {
    if (isLatest) return 'success' as const
    if (isPrerelease) return 'warning' as const
    return 'secondary' as const
  }

  return (
    <Badge
      variant={getVariant()}
      className={className}
      {...props}
    >
      v{version}
      {isLatest && <span className="ml-1">📌</span>}
      {isPrerelease && <span className="ml-1">🚧</span>}
    </Badge>
  )
}

// Metric badge for displaying key performance indicators
export interface MetricBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  label: string
  value: number | string
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  threshold?: {
    good: number
    warning: number
  }
}

const MetricBadge: React.FC<MetricBadgeProps> = ({
  label,
  value,
  unit = '',
  trend,
  threshold,
  className,
  ...props
}) => {
  const getVariant = () => {
    if (typeof value === 'number' && threshold) {
      if (value >= threshold.good) return 'success' as const
      if (value >= threshold.warning) return 'warning' as const
      return 'destructive' as const
    }
    return 'info' as const
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗️'
      case 'down': return '↘️'
      case 'stable': return '➡️'
      default: return null
    }
  }

  return (
    <Badge
      variant={getVariant()}
      className={className}
      {...props}
    >
      <span className="font-medium">{label}:</span>
      <span className="ml-1">
        {value}{unit}
        {getTrendIcon() && (
          <span className="ml-1">{getTrendIcon()}</span>
        )}
      </span>
    </Badge>
  )
}

// Resource usage badge
export interface ResourceBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  type: 'cpu' | 'memory' | 'disk' | 'network'
  usage: number // percentage 0-100
  total?: string
}

const ResourceBadge: React.FC<ResourceBadgeProps> = ({
  type,
  usage,
  total,
  className,
  ...props
}) => {
  const getVariant = () => {
    if (usage >= 90) return 'destructive' as const
    if (usage >= 70) return 'warning' as const
    if (usage >= 50) return 'info' as const
    return 'success' as const
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'cpu': return 'CPU'
      case 'memory': return 'RAM'
      case 'disk': return 'Disk'
      case 'network': return 'Network'
      default: return type.toUpperCase()
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'cpu': return '⚡'
      case 'memory': return '💾'
      case 'disk': return '💿'
      case 'network': return '🌐'
      default: return '📊'
    }
  }

  return (
    <Badge
      variant={getVariant()}
      className={className}
      icon={<span>{getIcon()}</span>}
      {...props}
    >
      {getTypeLabel()}: {Math.round(usage)}%
      {total && (
        <span className="ml-1 opacity-75">
          / {total}
        </span>
      )}
    </Badge>
  )
}

export {
  Badge,
  StatusBadge,
  HealthBadge,
  LoadTestStatusBadge,
  ConnectionBadge,
  PriorityBadge,
  VersionBadge,
  MetricBadge,
  ResourceBadge,
  badgeVariants,
  type StatusType
}