import * as React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-gradient-to-br from-amber-950/30 via-stone-950/50 to-amber-950/30 backdrop-blur-sm border border-amber-900/30 rounded-sm ${className}`}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

export default Card
