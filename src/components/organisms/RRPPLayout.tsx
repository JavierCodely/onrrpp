import { BottomNavigation } from '@/components/organisms/BottomNavigation'

interface RRPPLayoutProps {
  children: React.ReactNode
}

export function RRPPLayout({ children }: RRPPLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background relative overflow-x-hidden">
      {/* Neon border effect - wraps entire screen */}
      <div className="neon-screen-border pointer-events-none" />

      {/* Main content area */}
      <main className="pb-16">
        <div className="container mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - fixed at bottom */}
      <BottomNavigation />
    </div>
  )
}
