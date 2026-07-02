import type { ReactNode } from 'react'
import { BrandMark } from '@/components/BrandMark'

type AuthScreenProps = {
  children: ReactNode
}

export function AuthScreen({ children }: AuthScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col justify-center gap-8 bg-gradient-to-b from-secondary via-background to-background px-5 py-10">
      <div className="flex justify-center">
        <BrandMark size="lg" />
      </div>
      {children}
    </div>
  )
}
