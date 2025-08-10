'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Glass Panel Component
interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle' | 'frosted';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  glow?: boolean;
  hover?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  variant = 'default',
  blur = 'lg',
  border = true,
  glow = false,
  hover = false,
  className,
  ...props
}) => {
  const blurValues = {
    sm: 'blur(8px)',
    md: 'blur(12px)',
    lg: 'blur(20px)',
    xl: 'blur(32px)'
  };

  const variants = {
    default: 'bg-white/10 border-white/20',
    elevated: 'bg-white/15 border-white/30 shadow-2xl',
    subtle: 'bg-white/5 border-white/10',
    frosted: 'bg-white/20 border-white/25 backdrop-blur-xl'
  };

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-2xl transition-all duration-500',
        'backdrop-blur-md border',
        variants[variant],
        border && 'border-white/20',
        glow && 'shadow-[0_0_40px_rgba(255,255,255,0.1)]',
        hover && 'hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(255,255,255,0.15)]',
        className
      )}
      style={{
        backdropFilter: blurValues[blur]
      }}
      whileHover={hover ? { scale: 1.02 } : {}}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {/* Inner glow effect */}
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
      )}
      
      {/* Content */}
      <div className="relative z-10 p-6">
        {children}
      </div>
    </motion.div>
  );
};

// Glass Button Component
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className,
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30 text-white',
    secondary: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-400/30 text-gray-200',
    danger: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-400/30 text-red-200',
    ghost: 'bg-transparent border-white/10 text-white hover:bg-white/5'
  };

  return (
    <motion.button
      className={cn(
        'relative overflow-hidden rounded-xl border backdrop-blur-md',
        'transition-all duration-300 font-medium',
        'hover:scale-105 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={disabled || loading}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <motion.div
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
        
        {icon && iconPosition === 'left' && !loading && icon}
        {children}
        {icon && iconPosition === 'right' && !loading && icon}
      </div>
    </motion.button>
  );
};

// Glass Card Component
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  header,
  footer,
  padding = 'md',
  shadow = true,
  className,
  ...props
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <GlassPanel
      variant="elevated"
      className={cn(
        'flex flex-col',
        shadow && 'shadow-[0_8px_32px_rgba(0,0,0,0.1)]',
        className
      )}
      {...props}
    >
      {header && (
        <div className="border-b border-white/10 pb-4 mb-4">
          {header}
        </div>
      )}
      
      <div className={cn('flex-1', paddingClasses[padding])}>
        {children}
      </div>
      
      {footer && (
        <div className="border-t border-white/10 pt-4 mt-4">
          {footer}
        </div>
      )}
    </GlassPanel>
  );
};

// Glass Input Component
interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  icon,
  variant = 'default',
  className,
  ...props
}) => {
  const variantClasses = {
    default: 'bg-white/5 border-white/20 focus:border-blue-400/50',
    filled: 'bg-white/10 border-white/30 focus:border-blue-400/50',
    outlined: 'bg-transparent border-white/20 focus:border-blue-400/50'
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
            {icon}
          </div>
        )}
        
        <input
          className={cn(
            'w-full rounded-xl border backdrop-blur-md transition-all duration-300',
            'text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20',
            variantClasses[variant],
            icon ? 'pl-10 pr-4' : 'px-4',
            'py-3',
            error && 'border-red-400/50 focus:border-red-400/50',
            className
          )}
          {...props}
        />
      </div>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

// Glass Select Component
interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  label,
  error,
  options,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      
      <select
        className={cn(
          'w-full rounded-xl border border-white/20 bg-white/5 backdrop-blur-md',
          'text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/20',
          'px-4 py-3',
          error && 'border-red-400/50 focus:border-red-400/50',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-gray-800 text-white">
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

// Glass Badge Component
interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const variantClasses = {
    default: 'bg-white/10 border-white/20 text-white',
    success: 'bg-green-500/20 border-green-400/30 text-green-200',
    warning: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-200',
    error: 'bg-red-500/20 border-red-400/30 text-red-200',
    info: 'bg-blue-500/20 border-blue-400/30 text-blue-200'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border backdrop-blur-md font-medium',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// Glass Divider Component
interface GlassDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassDivider: React.FC<GlassDividerProps> = ({
  orientation = 'horizontal',
  size = 'md',
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: orientation === 'horizontal' ? 'h-px' : 'w-px',
    md: orientation === 'horizontal' ? 'h-0.5' : 'w-0.5',
    lg: orientation === 'horizontal' ? 'h-1' : 'w-1'
  };

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-white/20 via-white/10 to-white/20',
        orientation === 'vertical' && 'bg-gradient-to-b',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
};

// Glass Skeleton Component
interface GlassSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const GlassSkeleton: React.FC<GlassSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className,
  ...props
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse',
    none: ''
  };

  return (
    <div
      className={cn(
        'bg-white/10 backdrop-blur-sm',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: width,
        height: height || (variant === 'text' ? '1em' : '100%')
      }}
      {...props}
    />
  );
};

// Glass Modal Component
interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              'relative z-10 w-full',
              sizeClasses[size]
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard className="max-h-[90vh] overflow-hidden">
              {title && (
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">{title}</h2>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="p-2"
                  >
                    ✕
                  </GlassButton>
                </div>
              )}
              
              <div className="overflow-y-auto">
                {children}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Export all components
export {
  GlassPanel,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
  GlassBadge,
  GlassDivider,
  GlassSkeleton,
  GlassModal
};