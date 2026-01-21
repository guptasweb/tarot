export default function SessionPage({
  params,
}: {
  params: { sessionId: string }
}) {
  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-4xl font-serif italic text-amber-100 mb-8">Reading Session</h1>
      <p className="text-amber-600/70">Session ID: {params.sessionId}</p>
      <p className="text-amber-600/70 mt-4">Reading interface coming soon...</p>
    </div>
  )
}
