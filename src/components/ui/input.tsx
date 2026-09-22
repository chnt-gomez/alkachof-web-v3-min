import * as React from 'react'
import { cn } from '@/lib/utils'

/*
  A field on this card is a fill-in line, not a boxed control: the value is
  written ON the rule, and the rule is drawn even when the field is empty
  because an empty line is the invitation to fill it.

  `text-base` is 16px and is not a style choice — iOS Safari zooms the viewport
  on focus for any field below it, and this product is phone-only.
*/
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn('input h-11', className)}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
