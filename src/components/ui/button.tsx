import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/*
  A control on this card is a stamp waiting to land. It is ruled, flat and cut
  square — no pill, no shadow, no scale on press. Pressing it darkens the ink
  and rotates it a fraction off square, the way a hand-pressed stamp lands.

  `ghost` and `link` are deliberately unruled: they are written on the card
  rather than stamped onto it.
*/
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[background-color,border-color] duration-[120ms] ease-out disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'border-2 border-ink bg-primary text-primary-foreground hover:bg-primary-deep press',
        destructive:
          'border-2 border-ink bg-destructive text-destructive-foreground hover:brightness-95 press',
        outline: 'border-2 border-ink bg-card text-foreground hover:bg-accent press-ink',
        secondary:
          'border-2 border-ink bg-secondary text-secondary-foreground hover:bg-accent press-ink',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline decoration-2 underline-offset-4 hover:text-primary-deep',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
