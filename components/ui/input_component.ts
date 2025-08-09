import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"

const inputVariants = cva(
  "flex w-full rounded-md border bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "border-input",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-success focus-visible:ring-success", 
        warning: "border-warning focus-visible:ring-warning",
      },
      inputSize: {
        sm: "h-8 px-3 py-1 text-xs",
        default: "h-10 px-3 py-2",
        lg: "h-12 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: string
  success?: string
  helper?: string
  label?: string
  required?: boolean
  fullWidth?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = "text",
    variant, 
    inputSize,
    leftIcon,
    rightIcon,
    error,
    success,
    helper,
    label,
    required,
    fullWidth = true,
    id,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const inputId = id || React.useId()

    // Determine variant based on validation state
    const effectiveVariant = error ? "error" : success ? "success" : variant

    // Handle password visibility toggle
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    const inputType = type === "password" && showPassword ? "text" : type

    return (
      <div className={cn("space-y-2", fullWidth && "w-full")}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <input
            id={inputId}
            type={inputType}
            className={cn(
              inputVariants({ variant: effectiveVariant, inputSize }),
              leftIcon && "pl-10",
              (rightIcon || type === "password") && "pr-10",
              isFocused && "ring-2 ring-ring ring-offset-2",
              className
            )}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            {...props}
          />
          
          {type === "password" && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
          
          {rightIcon && type !== "password" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
          
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
          
          {success && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
        </div>
        
        {(error || success || helper) && (
          <div className="space-y-1">
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
            {success && !error && (
              <p className="text-sm text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {success}
              </p>
            )}
            {helper && !error && !success && (
              <p className="text-sm text-muted-foreground">
                {helper}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// Textarea component with similar styling
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof inputVariants> {
  error?: string
  success?: string
  helper?: string
  label?: string
  required?: boolean
  fullWidth?: boolean
  resize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant,
    inputSize,
    error,
    success,
    helper,
    label,
    required,
    fullWidth = true,
    resize = true,
    id,
    rows = 3,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const textareaId = id || React.useId()

    // Determine variant based on validation state
    const effectiveVariant = error ? "error" : success ? "success" : variant

    return (
      <div className={cn("space-y-2", fullWidth && "w-full")}>
        {label && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </label>
        )}
        
        <div className="relative">
          <textarea
            id={textareaId}
            className={cn(
              inputVariants({ variant: effectiveVariant, inputSize }),
              "min-h-[80px]",
              !resize && "resize-none",
              isFocused && "ring-2 ring-ring ring-offset-2",
              className
            )}
            ref={ref}
            rows={rows}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            {...props}
          />
          
          {error && (
            <div className="absolute right-3 top-3 text-destructive">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
          
          {success && (
            <div className="absolute right-3 top-3 text-success">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
        </div>
        
        {(error || success || helper) && (
          <div className="space-y-1">
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
            {success && !error && (
              <p className="text-sm text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {success}
              </p>
            )}
            {helper && !error && !success && (
              <p className="text-sm text-muted-foreground">
                {helper}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

// Search Input with built-in search functionality
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void
  onClear?: () => void
  debounceMs?: number
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onClear, debounceMs = 300, ...props }, ref) => {
    const [searchValue, setSearchValue] = React.useState(props.value || "")
    const timeoutRef = React.useRef<NodeJS.Timeout>()

    React.useEffect(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (onSearch && typeof searchValue === 'string') {
        timeoutRef.current = setTimeout(() => {
          onSearch(searchValue)
        }, debounceMs)
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [searchValue, onSearch, debounceMs])

    const handleClear = () => {
      setSearchValue("")
      onClear?.()
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="search"
        value={searchValue}
        onChange={(e) => {
          setSearchValue(e.target.value)
          props.onChange?.(e)
        }}
        leftIcon={
          <svg 
            className="h-4 w-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        }
        rightIcon={searchValue && (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg 
              className="h-4 w-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        )}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

// Number Input with increment/decrement buttons
export interface NumberInputProps extends Omit<InputProps, 'type'> {
  min?: number
  max?: number
  step?: number
  onIncrement?: (value: number) => void
  onDecrement?: (value: number) => void
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ min, max, step = 1, onIncrement, onDecrement, ...props }, ref) => {
    const [value, setValue] = React.useState<number>(
      Number(props.value) || Number(props.defaultValue) || 0
    )

    const handleIncrement = () => {
      const newValue = Math.min(value + step, max ?? Infinity)
      setValue(newValue)
      onIncrement?.(newValue)
    }

    const handleDecrement = () => {
      const newValue = Math.max(value - step, min ?? -Infinity)
      setValue(newValue)
      onDecrement?.(newValue)
    }

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = Number(e.target.value)
            setValue(newValue)
            props.onChange?.(e)
          }}
          min={min}
          max={max}
          step={step}
          className={cn("pr-16", props.className)}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
          <button
            type="button"
            onClick={handleIncrement}
            disabled={max !== undefined && value >= max}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            disabled={min !== undefined && value <= min}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▼
          </button>
        </div>
      </div>
    )
  }
)
NumberInput.displayName = "NumberInput"

export { Input, Textarea, SearchInput, NumberInput, inputVariants }