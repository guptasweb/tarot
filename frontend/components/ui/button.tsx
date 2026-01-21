import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const baseStyles = 'px-4 py-2 rounded-sm font-serif transition-all duration-300'
    const variants = {
      default: 'bg-gradient-to-br from-amber-900/40 to-stone-900/60 border border-amber-800/40 text-amber-600/80 hover:border-amber-700/60',
      outline: 'border border-amber-800/40 text-amber-600/80 hover:bg-amber-900/20',
      ghost: 'text-amber-600/80 hover:bg-amber-900/10'
    }

    return (
      <button
        className={`${baseStyles} ${variants[variant]} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export default Button
