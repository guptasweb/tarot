export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-stone-950">
      <nav className="border-b border-amber-900/30 bg-amber-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h2 className="text-2xl font-serif italic text-amber-600">Dashboard</h2>
        </div>
      </nav>
      {children}
    </div>
  )
}
