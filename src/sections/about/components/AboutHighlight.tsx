import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type AboutHighlightProps = {
  icon: LucideIcon
  title: string
  description: string
}

export function AboutHighlight({ icon: Icon, title, description }: AboutHighlightProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
          <Icon size={22} strokeWidth={2.25} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
