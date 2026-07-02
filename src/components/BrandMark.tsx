import { Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'

type BrandMarkProps = {
  size?: 'sm' | 'lg'
  className?: string
}

export function BrandMark({ size = 'sm', className }: BrandMarkProps) {
  const isLarge = size === 'lg'

  return (
    <span className={cn('inline-flex items-center', isLarge ? 'gap-3' : 'gap-2', className)}>
      <span
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-primary to-primary-deep text-primary-foreground shadow-sm',
          isLarge ? 'h-14 w-14 rounded-2xl' : 'h-8 w-8 rounded-xl'
        )}
      >
        <Sprout size={isLarge ? 30 : 18} strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          'font-bold tracking-tight text-foreground',
          isLarge ? 'text-3xl' : 'text-lg'
        )}
      >
        Alkachof
      </span>
    </span>
  )
}
