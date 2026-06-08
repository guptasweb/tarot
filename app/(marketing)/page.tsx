'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Moon, Star, Zap, Eye, BookOpen, Compass, Heart, Wind, Flame, Sun, ArrowRight, ArrowLeft, CreditCard, Check } from 'lucide-react'
import TarotCard from '@/frontend/components/tarot/TarotCard'
import BackgroundEffects from '@/frontend/components/shared/BackgroundEffects'

type ReadingItem = {
  name: string
  icon: typeof Sparkles
  number: string
  color: string
  description: string
  longDescription: string
  borderColor: string
  glowColor: string
  features: string[]
  idealFor: string
  price: string
  chatMessages: number
  readingTypeSlug: string
  spreadType: string
  cardCount: number
}

const readings: { tier: number; credits: number; price: string; items: ReadingItem[] }[] = [
  {
    tier: 1,
    credits: 1,
    price: '$5',
    items: [
      { name: 'The Living Reading', icon: Sparkles, number: 'I', color: 'from-amber-600 via-orange-500 to-rose-600', description: '48-hour AI companion', longDescription: 'A dynamic reading that evolves with you over 48 hours. Ask follow-up questions, explore different angles, and receive guidance as your situation develops.', borderColor: 'border-amber-500/40', glowColor: 'rgba(217, 119, 6, 0.5)', features: ['48-hour access', '10 AI chat messages', 'Real-time insights', 'Evolving interpretation'], idealFor: 'Daily guidance and quick decisions', price: '$5', chatMessages: 10, readingTypeSlug: 'living_reading', spreadType: 'three_card', cardCount: 3 },
      { name: 'Decision Simulator', icon: Compass, number: 'II', color: 'from-teal-600 via-emerald-500 to-cyan-600', description: 'Parallel scenario paths', longDescription: 'Explore two possible paths side-by-side. See the likely outcomes, challenges, and opportunities of each choice through parallel card spreads.', borderColor: 'border-teal-500/40', glowColor: 'rgba(13, 148, 136, 0.5)', features: ['Two path comparison', '10 AI chat messages', 'Outcome analysis', 'Decision clarity'], idealFor: 'Major life choices and crossroads', price: '$5', chatMessages: 10, readingTypeSlug: 'decision_simulator', spreadType: 'three_card', cardCount: 3 },
      { name: 'Question Excavator', icon: Eye, number: 'III', color: 'from-violet-600 via-purple-500 to-fuchsia-600', description: 'Find your real question', longDescription: "Sometimes we don't know what we're really asking. This reading helps uncover the deeper question beneath your initial inquiry.", borderColor: 'border-violet-500/40', glowColor: 'rgba(124, 58, 237, 0.5)', features: ['Deep questioning', '10 AI chat messages', 'Root cause discovery', 'Clarity breakthrough'], idealFor: 'When you feel stuck or confused', price: '$5', chatMessages: 10, readingTypeSlug: 'question_excavator', spreadType: 'three_card', cardCount: 3 },
      { name: 'Pattern Breaker', icon: Zap, number: 'IV', color: 'from-yellow-600 via-amber-500 to-orange-600', description: '72-hour intervention', longDescription: 'Identify and break through repeating patterns in your life. 72-hour intensive support to recognize, understand, and shift stuck patterns.', borderColor: 'border-yellow-500/40', glowColor: 'rgba(217, 119, 6, 0.5)', features: ['72-hour access', '10 AI chat messages', 'Pattern recognition', 'Breakthrough support'], idealFor: 'Breaking cycles and old habits', price: '$5', chatMessages: 10, readingTypeSlug: 'pattern_breaker', spreadType: 'three_card', cardCount: 3 }
    ]
  },
  {
    tier: 2,
    credits: 2,
    price: '$10',
    items: [
      { name: 'Shadow Dialogue', icon: Moon, number: 'V', color: 'from-slate-700 via-indigo-600 to-purple-700', description: 'Conscious vs Shadow', longDescription: "A powerful Jungian reading that reveals the dialogue between your conscious self and shadow aspects. Integrate what you've been avoiding.", borderColor: 'border-indigo-500/40', glowColor: 'rgba(79, 70, 229, 0.5)', features: ['Shadow work deep dive', '20 AI chat messages', 'Jungian framework', 'Integration guidance'], idealFor: 'Deep psychological exploration', price: '$10', chatMessages: 20, readingTypeSlug: 'shadow_dialogue', spreadType: 'three_card', cardCount: 3 },
      { name: 'Mythic Journey Mapping', icon: BookOpen, number: 'VI', color: 'from-emerald-700 via-teal-600 to-cyan-700', description: 'Find your archetype', longDescription: "Discover which archetypal journey you're on. Connect your story to timeless myths and receive guidance from ancient wisdom.", borderColor: 'border-emerald-500/40', glowColor: 'rgba(5, 150, 105, 0.5)', features: ['Archetypal mapping', '20 AI chat messages', 'Mythological insights', "Hero's journey stages"], idealFor: "Understanding your life's narrative", price: '$10', chatMessages: 20, readingTypeSlug: 'mythic_journey', spreadType: 'three_card', cardCount: 3 },
      { name: 'Relationship Matrix', icon: Heart, number: 'VII', color: 'from-rose-700 via-pink-600 to-fuchsia-700', description: 'See the whole field', longDescription: 'A comprehensive relationship reading that shows dynamics from all angles: you, them, the connection, external influences, and future potential.', borderColor: 'border-rose-500/40', glowColor: 'rgba(225, 29, 72, 0.5)', features: ['9-card spread', '20 AI chat messages', 'All perspectives', 'Dynamic analysis'], idealFor: 'Complex relationship questions', price: '$10', chatMessages: 20, readingTypeSlug: 'relationship_matrix', spreadType: 'relationship_matrix', cardCount: 9 }
    ]
  },
  {
    tier: 3,
    credits: 3,
    price: '$15',
    items: [
      { name: 'Spiral Intensive', icon: Wind, number: 'VIII', color: 'from-sky-700 via-blue-600 to-indigo-700', description: '7-day evolution', longDescription: 'A transformative 7-day journey through the spiral of growth. Daily insights, pattern tracking, and evolutionary guidance.', borderColor: 'border-sky-500/40', glowColor: 'rgba(3, 105, 161, 0.5)', features: ['7-day access', '30 AI chat messages', 'Daily check-ins', 'Evolution tracking'], idealFor: 'Week-long transformation work', price: '$15', chatMessages: 30, readingTypeSlug: 'spiral_intensive', spreadType: 'three_card', cardCount: 3 },
      { name: 'Life Transit Reading', icon: Star, number: 'IX', color: 'from-purple-700 via-violet-600 to-fuchsia-700', description: '30-day companion', longDescription: 'Navigate major life transitions with comprehensive 30-day support. Deep guidance for career changes, relationships, relocations, or personal transformation.', borderColor: 'border-purple-500/40', glowColor: 'rgba(147, 51, 234, 0.5)', features: ['30-day access', '30 AI chat messages', 'Transition support', 'Milestone tracking'], idealFor: 'Major life transitions', price: '$15', chatMessages: 30, readingTypeSlug: 'life_transit', spreadType: 'three_card', cardCount: 3 },
      { name: 'Yearly Forecast', icon: Sparkles, number: 'X', color: 'from-amber-700 via-yellow-600 to-orange-700', description: '365-day partner', longDescription: 'Your year ahead in detail. Month-by-month guidance, seasonal themes, and ongoing AI companion to help you make the most of each phase.', borderColor: 'border-amber-500/40', glowColor: 'rgba(217, 119, 6, 0.5)', features: ['Full year access', '30 AI chat messages', 'Monthly themes', 'Seasonal guidance'], idealFor: 'Annual planning and foresight', price: '$15', chatMessages: 30, readingTypeSlug: 'living_reading', spreadType: 'celtic_cross', cardCount: 10 }
    ]
  },
  {
    tier: 4,
    credits: 5,
    price: '$25',
    items: [
      { name: 'Oracle Intensive', icon: Flame, number: 'XI', color: 'from-red-700 via-orange-600 to-amber-700', description: '90-min live session', longDescription: 'Premium 90-minute live session with AI-assisted deep reading. Real-time dialogue, complex spread work, and intensive exploration.', borderColor: 'border-red-500/40', glowColor: 'rgba(220, 38, 38, 0.5)', features: ['90-min live session', '50 AI chat messages', 'Premium support', 'Recording provided'], idealFor: 'Deep intensive work', price: '$25', chatMessages: 50, readingTypeSlug: 'oracle_intensive', spreadType: 'three_card', cardCount: 3 },
      { name: 'Pattern Library', icon: BookOpen, number: 'XII', color: 'from-purple-800 via-fuchsia-700 to-pink-800', description: 'Meta-reading analysis', longDescription: 'Analyze patterns across all your readings. See recurring cards, themes, and evolutionary patterns. Understand your journey at the meta level.', borderColor: 'border-fuchsia-500/40', glowColor: 'rgba(192, 38, 211, 0.5)', features: ['All readings analysis', '50 AI chat messages', 'Pattern recognition', 'Journey mapping'], idealFor: 'Long-term self-discovery', price: '$25', chatMessages: 50, readingTypeSlug: 'oracle_intensive', spreadType: 'three_card', cardCount: 3 }
    ]
  }
]

const allReadings: (ReadingItem & { tier: number })[] = readings.flatMap((t) => t.items.map((item) => ({ ...item, tier: t.tier })))

function QuestionStage({
  questionText,
  setQuestionText,
  onBack,
  onBeginReading
}: {
  questionText: string
  setQuestionText: (v: string) => void
  onBack: () => void
  onBeginReading: () => void
}) {
  return (
    <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-amber-600/70 hover:text-amber-500 mb-8 font-serif"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>
      <div className="text-center">
        <h2 className="text-3xl font-serif italic text-amber-100 mb-8">What would you like guidance on?</h2>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="w-full p-4 rounded-lg bg-black/40 text-amber-100 border border-amber-700/30 font-serif text-lg placeholder-amber-700/50 focus:border-amber-600/50 focus:outline-none"
          placeholder="Type your question here..."
          rows={4}
        />
        <button
          type="button"
          onClick={onBeginReading}
          className="mt-6 inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-br from-amber-900/50 to-stone-900/70 rounded-sm border border-amber-700/50 text-amber-400 font-serif hover:border-amber-600/70 hover:bg-amber-900/60 transition-all"
        >
          Begin Reading
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

type DeckCard = { id: string; name: string; imageUrl?: string }

function DrawStage({
  reading,
  questionText,
  onBack,
  onConsultOracle
}: {
  reading: ReadingItem & { tier: number }
  questionText: string
  onBack: () => void
  onConsultOracle: (drawnCardNames: string[]) => void | Promise<void>
}) {
  const cardCount = reading.cardCount
  const [deck, setDeck] = useState<DeckCard[] | null>(null)
  const [drawn, setDrawn] = useState<DeckCard[]>([])
  const [loading, setLoading] = useState(true)
  const [consulting, setConsulting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/cards')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load deck')))
      .then((data: { cards: { id: string; name: string; imageUrl?: string }[] }) => {
        const cards = (data.cards || []).map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl }))
        setDeck(cards)
      })
      .catch(() => setError('Could not load the deck'))
      .finally(() => setLoading(false))
  }, [])

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const drawOne = () => {
    if (!deck || drawn.length >= cardCount) return
    const remaining = deck.filter((c) => !drawn.some((d) => d.id === c.id))
    if (remaining.length === 0) return
    const shuffled = shuffle(remaining)
    const card = shuffled[0]
    setDrawn((prev) => [...prev, card])
  }

  const drawAll = () => {
    if (!deck || drawn.length >= cardCount) return
    const remaining = deck.filter((c) => !drawn.some((d) => d.id === c.id))
    const shuffled = shuffle(remaining)
    const need = cardCount - drawn.length
    const toAdd = shuffled.slice(0, need)
    setDrawn((prev) => [...prev, ...toAdd])
  }

  const resetDraw = () => setDrawn([])

  const canConsult = drawn.length === cardCount
  const handleConsultOracle = async () => {
    if (!canConsult) return
    setConsulting(true)
    setError(null)
    try {
      await onConsultOracle(drawn.map((c) => c.name))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setConsulting(false)
    }
  }

  if (loading) {
    return (
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-amber-200/70">Loading the deck...</p>
      </div>
    )
  }

  if (error && !deck) {
    return (
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 text-center">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-amber-600/70 hover:text-amber-500 mb-8 font-serif">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <p className="text-amber-200/70">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-amber-600/70 hover:text-amber-500 mb-8 font-serif"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="mb-8 text-center">
        <h2 className="text-3xl font-serif italic text-amber-100 mb-2">Draw your cards</h2>
        <p className="text-amber-600/80 mb-1">{reading.name}</p>
        <p className="text-amber-700/60 text-sm">Select {cardCount} card{cardCount !== 1 ? 's' : ''} for this reading</p>
      </div>

      {questionText && (
        <div className="mb-6 p-4 rounded-lg bg-black/40 border border-amber-800/30">
          <p className="text-amber-700/60 text-sm mb-1">Your question</p>
          <p className="text-amber-200/90 font-serif italic">&quot;{questionText}&quot;</p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div
            key={i}
            className="w-24 h-36 rounded-lg border border-amber-700/40 bg-gradient-to-br from-amber-900/60 to-stone-900/80 flex items-center justify-center overflow-hidden flex-shrink-0"
          >
            {drawn[i] ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center">
                {drawn[i].imageUrl ? (
                  <img src={drawn[i].imageUrl} alt={drawn[i].name} className="w-full h-24 object-cover rounded" />
                ) : null}
                <span className="text-[10px] text-amber-200/90 mt-1 leading-tight line-clamp-2">{drawn[i].name}</span>
              </div>
            ) : (
              <span className="text-amber-700/50 text-xs font-serif">Card {i + 1}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
        <button
          type="button"
          onClick={drawOne}
          disabled={drawn.length >= cardCount || !deck}
          className="px-6 py-3 rounded-sm border border-amber-700/50 bg-amber-900/40 text-amber-300 font-serif hover:border-amber-600/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Draw a card
        </button>
        <button
          type="button"
          onClick={drawAll}
          disabled={drawn.length >= cardCount || !deck}
          className="px-6 py-3 rounded-sm border border-amber-700/50 bg-amber-900/40 text-amber-300 font-serif hover:border-amber-600/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Draw all {cardCount}
        </button>
        {drawn.length > 0 && (
          <button
            type="button"
            onClick={resetDraw}
            className="px-6 py-3 rounded-sm border border-amber-800/40 text-amber-600/70 font-serif hover:text-amber-500 transition-all"
          >
            Reset
          </button>
        )}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={handleConsultOracle}
          disabled={!canConsult || consulting}
          className="px-8 py-4 rounded-sm border font-serif text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-gradient-to-br from-amber-700/50 to-amber-900/70 border-amber-600/60 text-amber-100 hover:border-amber-500/80 hover:bg-amber-700/60"
        >
          {consulting ? 'Consulting...' : 'Consult Oracle'}
        </button>
        {error && <p className="mt-4 text-amber-500 text-sm">{error}</p>}
      </div>
    </div>
  )
}

export default function HomePage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [currentStage, setCurrentStage] = useState<'home' | 'buy-credits' | 'question' | 'draw'>('home')
  const [selectedReading, setSelectedReading] = useState<(ReadingItem & { tier: number }) | null>(null)
  const [questionText, setQuestionText] = useState('')

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleSelectReading = (reading: ReadingItem & { tier: number }) => {
    setSelectedReading(reading)
    setCurrentStage('buy-credits')
  }

  const BuyCreditsStage = () => (
    <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
      <button
        type="button"
        onClick={() => setCurrentStage('home')}
        className="flex items-center gap-2 text-amber-600/70 hover:text-amber-500 mb-8 font-serif"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>
      <div className="text-center">
        <h2 className="text-3xl font-serif italic text-amber-100 mb-4">Complete Purchase</h2>
        <p className="text-amber-600/80 mb-2">Selected: {selectedReading?.name}</p>
        <p className="text-2xl font-serif text-amber-500 mb-8">{selectedReading?.price}</p>
        <button
          type="button"
          onClick={() => setCurrentStage('question')}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-br from-amber-900/50 to-stone-900/70 rounded-sm border border-amber-700/50 text-amber-400 font-serif hover:border-amber-600/70 hover:bg-amber-900/60 transition-all"
        >
          <CreditCard className="w-5 h-5" />
          Purchase Now
        </button>
      </div>
    </div>
  )

  if (currentStage === 'buy-credits') return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(to bottom, #0d0806 0%, #1a0f0a 20%, #120a06 40%, #1f1108 60%, #0a0604 80%, #030201 100%)'
    }}>
      <BackgroundEffects mousePos={mousePos} />
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8">
        <button type="button" onClick={() => setCurrentStage('home')} className="flex items-center gap-2 text-amber-600/70 hover:text-amber-500">
          <Moon className="w-6 h-6" />
          <span className="font-serif text-lg">RAG Tarot</span>
        </button>
      </div>
      <BuyCreditsStage />
    </div>
  )

  if (currentStage === 'question') return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(to bottom, #0d0806 0%, #1a0f0a 20%, #120a06 40%, #1f1108 60%, #0a0604 80%, #030201 100%)'
    }}>
      <BackgroundEffects mousePos={mousePos} />
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8">
        <button type="button" onClick={() => setCurrentStage('home')} className="flex items-center gap-2 text-amber-600/70 hover:text-amber-500">
          <Moon className="w-6 h-6" />
          <span className="font-serif text-lg">RAG Tarot</span>
        </button>
      </div>
      <QuestionStage
        questionText={questionText}
        setQuestionText={setQuestionText}
        onBack={() => setCurrentStage('buy-credits')}
        onBeginReading={() => setCurrentStage('draw')}
      />
    </div>
  )

  const handleConsultOracle = async (drawnCardNames: string[]) => {
    if (!selectedReading) return
    const resCreate = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        readingTypeSlug: selectedReading.readingTypeSlug,
        question: questionText || undefined,
      }),
      credentials: 'include',
    })
    if (!resCreate.ok) {
      const data = await resCreate.json().catch(() => ({}))
      throw new Error(data.message || 'Could not start reading session')
    }
    const { session } = await resCreate.json()
    const sessionId = session.id

    const resDraw = await fetch(`/api/sessions/${sessionId}/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadType: selectedReading.spreadType,
        drawMethod: 'user_choice',
        userChosenCards: drawnCardNames,
      }),
      credentials: 'include',
    })
    if (!resDraw.ok) {
      const data = await resDraw.json().catch(() => ({}))
      throw new Error(data.message || 'Could not save drawn cards')
    }

    const resInterpret = await fetch(`/api/sessions/${sessionId}/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!resInterpret.ok) {
      const data = await resInterpret.json().catch(() => ({}))
      throw new Error(data.message || 'Could not generate interpretation')
    }

    window.location.href = `/session/${sessionId}`
  }

  if (currentStage === 'draw' && selectedReading) return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(to bottom, #0d0806 0%, #1a0f0a 20%, #120a06 40%, #1f1108 60%, #0a0604 80%, #030201 100%)'
    }}>
      <BackgroundEffects mousePos={mousePos} />
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8">
        <button type="button" onClick={() => setCurrentStage('home')} className="flex items-center gap-2 text-amber-600/70 hover:text-amber-500">
          <Moon className="w-6 h-6" />
          <span className="font-serif text-lg">RAG Tarot</span>
        </button>
      </div>
      <DrawStage
        reading={selectedReading}
        questionText={questionText}
        onBack={() => setCurrentStage('question')}
        onConsultOracle={handleConsultOracle}
      />
    </div>
  )

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(to bottom, #0d0806 0%, #1a0f0a 20%, #120a06 40%, #1f1108 60%, #0a0604 80%, #030201 100%)'
    }}>
      <BackgroundEffects mousePos={mousePos} />

      {/* Subtle cursor glow */}
      <div 
        className="fixed w-64 h-64 pointer-events-none z-50 transition-all duration-500 ease-out"
        style={{
          left: mousePos.x - 128,
          top: mousePos.y - 128,
          background: 'radial-gradient(circle, rgba(217, 119, 6, 0.05) 0%, transparent 70%)',
          filter: 'blur(30px)'
        }}
      />

      {/* Header */}
      <div className="relative z-10 text-center pt-32 pb-20 px-4">
        <div className="inline-block relative mb-10">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-px opacity-20">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-amber-700 to-transparent" />
          </div>
          
          <div className="relative flex items-center gap-8">
            <div className="relative">
              <Moon className="w-10 h-10 text-amber-700/40" style={{ animation: 'spin-slow 30s linear infinite' }} />
              <div className="absolute inset-0 blur-lg bg-amber-700/10 rounded-full" />
            </div>
            
            <div>
              <h1 className="text-7xl font-serif italic tracking-wide mb-3" style={{
                background: 'linear-gradient(135deg, #d97706 0%, #92400e 50%, #78350f 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(217, 119, 6, 0.3))'
              }}>
                RAG Tarot
              </h1>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-800/40 to-transparent" />
                <span className="text-amber-800/40 text-xs">◆</span>
                <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-800/40 to-transparent" />
              </div>
              <p className="text-amber-700/60 text-xs font-serif italic tracking-[0.4em] uppercase">Live Intelligence, Not Static PDFs</p>
            </div>
            
            <div className="relative">
              <Sun className="w-10 h-10 text-amber-700/40" style={{ animation: 'spin-slow-reverse 25s linear infinite' }} />
              <div className="absolute inset-0 blur-lg bg-amber-700/10 rounded-full" />
            </div>
          </div>

          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-96 h-px opacity-20">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-amber-700 to-transparent" />
          </div>
        </div>
        
        <p className="text-amber-600/50 text-base font-serif italic max-w-2xl mx-auto leading-relaxed">
          12 Unique Reading Experiences
        </p>
        <p className="text-amber-700/50 text-sm font-serif italic max-w-2xl mx-auto mt-2">
          From quick daily guidance to year-long companionship. Each reading includes AI chat for deeper exploration.
        </p>
      </div>

      {/* Reading rows: card + description panel (alternating left/right) */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-32">
        {allReadings.map((reading, index) => {
          const isLeft = index % 2 === 0
          const cardId = `${reading.name}-${index}`
          return (
            <div
              key={reading.name}
              className={`flex items-center gap-8 mb-16 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
            >
              {/* Card - clickable to select reading */}
              <div className="w-80 flex-shrink-0">
                <div
                  className="cursor-pointer"
                  onClick={() => handleSelectReading(reading)}
                  onMouseEnter={() => setHoveredCard(cardId)}
                  onMouseLeave={() => setHoveredCard(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectReading(reading)}
                >
                  <TarotCard
                    reading={reading}
                    index={index}
                    isLeft={isLeft}
                    hoveredCard={hoveredCard}
                    activeCard={activeCard}
                    onHover={setHoveredCard}
                    onActive={setActiveCard}
                  />
                </div>
              </div>

              {/* Description panel */}
              <div className="flex-1 space-y-6">
                <div className="inline-block">
                  <span className="px-4 py-2 rounded-full border bg-amber-950/30 border-amber-800/40 text-amber-500/90 text-sm font-serif">
                    Tier {reading.tier} • {reading.price}
                  </span>
                </div>
                <h2 className="text-4xl font-serif italic text-amber-100">{reading.name}</h2>
                <p className="text-amber-600/80 text-lg leading-relaxed font-serif">
                  {reading.longDescription}
                </p>
                <div className="p-4 bg-black/40 rounded-lg border border-amber-800/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="text-amber-600/70 flex-shrink-0 mt-1 w-[18px] h-[18px]" />
                    <div>
                      <div className="text-amber-400 font-semibold text-sm mb-1">Ideal For:</div>
                      <div className="text-amber-600/70 text-sm font-serif">{reading.idealFor}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-amber-400 font-semibold text-sm mb-3">What&apos;s Included:</div>
                  {reading.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-amber-600/70 flex-shrink-0" />
                      <span className="text-amber-600/70 text-sm font-serif">{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectReading(reading)}
                  className={`inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-br ${reading.color} text-white font-serif text-lg rounded-sm shadow-lg hover:opacity-90 transition-opacity`}
                >
                  Select This Reading
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer line */}
      <div className="relative z-10 text-center pt-16 pb-8 px-4">
        <p className="text-amber-700/50 text-sm font-serif italic">
          Powered by RAG-enhanced AI • Traditional tarot wisdom • Instant access
        </p>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 pb-40 px-4">
        <div className="max-w-4xl mx-auto relative">
          <div className="relative bg-gradient-to-br from-amber-950/30 via-stone-950/50 to-amber-950/30 backdrop-blur-sm border border-amber-900/30 rounded-sm p-16 shadow-2xl">
            
            {/* Ornate corners */}
            {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
              <div key={i} className={`absolute ${pos}`}>
                <svg width="40" height="40" viewBox="0 0 40 40" className="opacity-30">
                  {i === 0 && <path d="M 0 15 L 0 0 L 15 0" fill="none" stroke="rgba(217, 119, 6, 0.6)" strokeWidth="1"/>}
                  {i === 1 && <path d="M 40 0 L 25 0 M 40 0 L 40 15" fill="none" stroke="rgba(217, 119, 6, 0.6)" strokeWidth="1"/>}
                  {i === 2 && <path d="M 0 25 L 0 40 L 15 40" fill="none" stroke="rgba(217, 119, 6, 0.6)" strokeWidth="1"/>}
                  {i === 3 && <path d="M 40 40 L 25 40 M 40 40 L 40 25" fill="none" stroke="rgba(217, 119, 6, 0.6)" strokeWidth="1"/>}
                  <circle cx={i % 2 === 0 ? "5" : "35"} cy={i < 2 ? "5" : "35"} r="2" fill="rgba(217, 119, 6, 0.5)"/>
                </svg>
              </div>
            ))}

            <div className="text-center">
              <Sparkles className="w-12 h-12 text-amber-700/50 mx-auto mb-8 animate-pulse" />
              
              <h2 className="text-5xl font-serif italic mb-3" style={{
                background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                The Cards Await
              </h2>
              
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-amber-800/30 to-transparent" />
                <span className="text-amber-800/30 text-sm">◆</span>
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-amber-800/30 to-transparent" />
              </div>

              <p className="text-amber-700/50 text-base font-serif italic mb-12 max-w-lg mx-auto">
                Choose your vessel for the journey into the unseen
              </p>
              
              <div className="flex gap-5 justify-center flex-wrap">
                <button 
                  onClick={() => window.location.href = '/readings'}
                  className="group relative px-10 py-4 bg-gradient-to-br from-amber-900/40 to-stone-900/60 rounded-sm border border-amber-800/40 text-amber-600/80 font-serif text-base transition-all duration-300 hover:border-amber-700/60 hover:bg-amber-900/50"
                >
                  <span className="relative z-10">Single Reading</span>
                  <div className="text-[10px] mt-1 text-amber-700/50">$5</div>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-800/0 to-amber-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-sm pointer-events-none" />
                </button>
                
                <button 
                  onClick={() => window.location.href = '/readings'}
                  className="group relative px-10 py-4 bg-gradient-to-br from-amber-900/50 to-stone-900/70 rounded-sm border border-amber-700/50 text-amber-500/90 font-serif text-base transition-all duration-300 hover:border-amber-600/70 hover:bg-amber-900/60"
                >
                  <span className="relative z-10">3-Reading Pack</span>
                  <div className="text-[10px] mt-1 text-amber-700/60">$13 · Save $2</div>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-700/0 to-amber-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-sm pointer-events-none" />
                </button>
                
                <button 
                  onClick={() => window.location.href = '/readings'}
                  className="group relative px-10 py-4 bg-gradient-to-br from-amber-800/60 to-stone-900/80 rounded-sm border border-amber-600/60 text-amber-400 font-serif text-base transition-all duration-300 hover:border-amber-500/80 hover:bg-amber-800/70 shadow-lg shadow-amber-900/20"
                >
                  <span className="relative z-10">10-Reading Bundle</span>
                  <div className="text-[10px] mt-1 text-amber-600/70">$40 · Save $10</div>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-600/0 to-amber-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-sm pointer-events-none" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 pointer-events-none">
                    <Star className="w-full h-full text-amber-600/60 fill-current animate-pulse" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer mystical quote */}
      <div className="relative z-10 pb-20 text-center px-4">
        <div className="flex items-center justify-center gap-4 mb-4 opacity-20">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-800/30 to-transparent" />
          <Star className="w-4 h-4 text-amber-800/40" />
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-800/30 to-transparent" />
        </div>
        <p className="text-amber-800/30 text-xs font-serif italic tracking-widest">
          &quot;The future whispers to those who listen&quot;
        </p>
      </div>
    </div>
  )
}
