'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Moon, Star, Zap, Eye, BookOpen, Compass, Heart, Wind, Flame, Sun } from 'lucide-react'
import TarotCard from '@/frontend/components/tarot/TarotCard'
import BackgroundEffects from '@/frontend/components/shared/BackgroundEffects'

const readings = [
  {
    tier: 1,
    credits: 1,
    price: '$5',
    items: [
      { name: 'The Living Reading', icon: Sparkles, number: 'I', color: 'from-amber-600 via-orange-500 to-rose-600', description: '48-hour AI companion', borderColor: 'border-amber-500/40', glowColor: 'rgba(217, 119, 6, 0.5)' },
      { name: 'Decision Simulator', icon: Compass, number: 'II', color: 'from-teal-600 via-emerald-500 to-cyan-600', description: 'Parallel scenario paths', borderColor: 'border-teal-500/40', glowColor: 'rgba(13, 148, 136, 0.5)' },
      { name: 'Question Excavator', icon: Eye, number: 'III', color: 'from-violet-600 via-purple-500 to-fuchsia-600', description: 'Find your real question', borderColor: 'border-violet-500/40', glowColor: 'rgba(124, 58, 237, 0.5)' },
      { name: 'Pattern Breaker', icon: Zap, number: 'IV', color: 'from-yellow-600 via-amber-500 to-orange-600', description: '72-hour intervention', borderColor: 'border-yellow-500/40', glowColor: 'rgba(217, 119, 6, 0.5)' }
    ]
  },
  {
    tier: 2,
    credits: 2,
    price: '$10',
    items: [
      { name: 'Shadow Dialogue', icon: Moon, number: 'V', color: 'from-slate-700 via-indigo-600 to-purple-700', description: 'Conscious vs Shadow', borderColor: 'border-indigo-500/40', glowColor: 'rgba(79, 70, 229, 0.5)' },
      { name: 'Mythic Journey Mapping', icon: BookOpen, number: 'VI', color: 'from-emerald-700 via-teal-600 to-cyan-700', description: 'Find your archetype', borderColor: 'border-emerald-500/40', glowColor: 'rgba(5, 150, 105, 0.5)' },
      { name: 'Relationship Matrix', icon: Heart, number: 'VII', color: 'from-rose-700 via-pink-600 to-fuchsia-700', description: 'See the whole field', borderColor: 'border-rose-500/40', glowColor: 'rgba(225, 29, 72, 0.5)' }
    ]
  },
  {
    tier: 3,
    credits: 3,
    price: '$15',
    items: [
      { name: 'Spiral Intensive', icon: Wind, number: 'VIII', color: 'from-sky-700 via-blue-600 to-indigo-700', description: '7-day evolution', borderColor: 'border-sky-500/40', glowColor: 'rgba(3, 105, 161, 0.5)' },
      { name: 'Life Transit Reading', icon: Star, number: 'IX', color: 'from-purple-700 via-violet-600 to-fuchsia-700', description: '30-day companion', borderColor: 'border-purple-500/40', glowColor: 'rgba(147, 51, 234, 0.5)' },
      { name: 'Yearly Forecast', icon: Sparkles, number: 'X', color: 'from-amber-700 via-yellow-600 to-orange-700', description: '365-day partner', borderColor: 'border-amber-500/40', glowColor: 'rgba(217, 119, 6, 0.5)' }
    ]
  },
  {
    tier: 4,
    credits: 5,
    price: '$25',
    items: [
      { name: 'Oracle Intensive', icon: Flame, number: 'XI', color: 'from-red-700 via-orange-600 to-amber-700', description: '90-min live session', borderColor: 'border-red-500/40', glowColor: 'rgba(220, 38, 38, 0.5)' },
      { name: 'Pattern Library', icon: BookOpen, number: 'XII', color: 'from-purple-800 via-fuchsia-700 to-pink-800', description: 'Meta-reading analysis', borderColor: 'border-fuchsia-500/40', glowColor: 'rgba(192, 38, 211, 0.5)' }
    ]
  }
]

export default function HomePage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

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
          Readings that breathe, evolve, and whisper secrets over time
        </p>
      </div>

      {/* Tier Sections */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pb-32">
        {readings.map((tier, tierIndex) => (
          <div key={tier.tier} className="mb-40 relative">
            {/* Sophisticated tier divider */}
            <div className="text-center mb-24 relative">
              <div className="absolute top-1/2 left-0 right-0 h-px">
                <div className="h-full w-full bg-gradient-to-r from-transparent via-amber-800/20 to-transparent" />
              </div>
              
              <div className="inline-block relative">
                {/* Ornate frame */}
                <div className="absolute -inset-8">
                  <svg viewBox="0 0 200 100" className="w-full h-full opacity-20">
                    <path d="M 20 50 L 50 20 L 150 20 L 180 50 L 150 80 L 50 80 Z" 
                          fill="none" 
                          stroke="rgba(217, 119, 6, 0.4)" 
                          strokeWidth="0.5"/>
                  </svg>
                </div>

                <div className="relative bg-gradient-to-br from-amber-950/40 via-stone-950/60 to-amber-950/40 backdrop-blur-sm border border-amber-900/30 px-12 py-6 rounded-sm shadow-2xl">
                  <div className="flex items-center gap-8">
                    <div className="flex gap-2">
                      {[...Array(tier.credits)].map((_, i) => (
                        <div key={i} className="relative">
                          <div className="w-9 h-9 rounded-sm border border-amber-800/50 flex items-center justify-center text-amber-700/70 text-xs font-serif bg-gradient-to-br from-amber-950/30 to-stone-950/50">
                            {i + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="h-10 w-px bg-gradient-to-b from-transparent via-amber-800/40 to-transparent" />
                    
                    <div className="text-left">
                      <div className="text-amber-800/50 text-[10px] uppercase tracking-[0.3em] font-serif mb-1">Tier {tier.tier}</div>
                      <div className="text-amber-600/80 text-3xl font-serif italic">{tier.price}</div>
                    </div>
                  </div>

                  {/* Corner ornaments */}
                  {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                    <div key={i} className={`absolute ${pos} w-3 h-3 border-amber-800/30 ${
                      i === 0 ? 'border-l border-t' :
                      i === 1 ? 'border-r border-t' :
                      i === 2 ? 'border-l border-b' :
                      'border-r border-b'
                    }`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Reading Cards */}
            <div className="space-y-20">
              {tier.items.map((reading, index) => (
                <div key={reading.name} className={`flex ${index % 2 === 0 ? 'justify-start pl-0 md:pl-20' : 'justify-end pr-0 md:pr-20'}`}>
                  <TarotCard
                    reading={reading}
                    index={index}
                    isLeft={index % 2 === 0}
                    hoveredCard={hoveredCard}
                    activeCard={activeCard}
                    onHover={setHoveredCard}
                    onActive={setActiveCard}
                  />
                </div>
              ))}
            </div>

            {/* Tier separator */}
            {tierIndex < readings.length - 1 && (
              <div className="mt-40 flex items-center justify-center opacity-20">
                <svg width="100" height="30" viewBox="0 0 100 30">
                  <path d="M 0 15 Q 25 5, 50 15 T 100 15" 
                        fill="none" 
                        stroke="rgba(217, 119, 6, 0.5)" 
                        strokeWidth="0.5"/>
                  <circle cx="50" cy="15" r="2" fill="rgba(217, 119, 6, 0.6)"/>
                </svg>
              </div>
            )}
          </div>
        ))}
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
                <button className="group relative px-10 py-4 bg-gradient-to-br from-amber-900/40 to-stone-900/60 rounded-sm border border-amber-800/40 text-amber-600/80 font-serif text-base transition-all duration-300 hover:border-amber-700/60 hover:bg-amber-900/50">
                  <span className="relative z-10">Single Reading</span>
                  <div className="text-[10px] mt-1 text-amber-700/50">$5</div>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-800/0 to-amber-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-sm" />
                </button>
                
                <button className="group relative px-10 py-4 bg-gradient-to-br from-amber-900/50 to-stone-900/70 rounded-sm border border-amber-700/50 text-amber-500/90 font-serif text-base transition-all duration-300 hover:border-amber-600/70 hover:bg-amber-900/60">
                  <span className="relative z-10">3-Reading Pack</span>
                  <div className="text-[10px] mt-1 text-amber-700/60">$13 · Save $2</div>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-700/0 to-amber-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-sm" />
                </button>
                
                <button className="group relative px-10 py-4 bg-gradient-to-br from-amber-800/60 to-stone-900/80 rounded-sm border border-amber-600/60 text-amber-400 font-serif text-base transition-all duration-300 hover:border-amber-500/80 hover:bg-amber-800/70 shadow-lg shadow-amber-900/20">
                  <span className="relative z-10">10-Reading Bundle</span>
                  <div className="text-[10px] mt-1 text-amber-600/70">$40 · Save $10</div>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-600/0 to-amber-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-sm" />
                  <div className="absolute -top-1 -right-1 w-3 h-3">
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
