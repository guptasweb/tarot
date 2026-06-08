'use client'

import { Sparkles, Star, LucideIcon } from 'lucide-react'

interface Reading {
  name: string
  icon: LucideIcon
  number: string
  color: string
  description: string
  borderColor: string
  glowColor: string
}

interface TarotCardProps {
  reading: Reading
  index: number
  isLeft: boolean
  hoveredCard: string | null
  activeCard: string | null
  onHover: (card: string | null) => void
  onActive: (card: string | null) => void
}

export default function TarotCard({
  reading,
  index,
  isLeft,
  hoveredCard,
  activeCard,
  onHover,
  onActive,
}: TarotCardProps) {
  const Icon = reading.icon
  const cardId = `${reading.name}-${index}`
  const isHovered = hoveredCard === cardId
  const isActive = activeCard === reading.name

  return (
    <div
      className={`relative ${isLeft ? 'mr-auto' : 'ml-auto'} max-w-sm cursor-pointer`}
      onMouseEnter={() => onHover(cardId)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onActive(isActive ? null : reading.name)}
    >
      {(isActive || isHovered) && (
        <div 
          className="absolute inset-0 blur-3xl opacity-60 rounded-2xl animate-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${reading.glowColor} 0%, transparent 70%)`,
            transform: 'scale(1.4)',
            zIndex: -1
          }}
        />
      )}

      <div
        className={`relative w-56 h-80 rounded-2xl border-2 ${reading.borderColor} overflow-hidden transition-all duration-500 ${isHovered ? 'transform -translate-y-4 scale-105' : ''} ${isActive ? 'transform -translate-y-6 scale-110' : ''}`}
        style={{
          background: 'linear-gradient(145deg, rgba(10, 5, 0, 0.98) 0%, rgba(20, 10, 5, 0.96) 100%)',
          boxShadow: `0 20px 60px rgba(0, 0, 0, 0.9), inset 0 0 60px rgba(0, 0, 0, 0.8), 0 0 ${isHovered || isActive ? '30px' : '15px'} ${reading.glowColor}`,
          zIndex: isHovered || isActive ? 100 : 50
        }}
      >
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg viewBox="0 0 224 320" className="w-full h-full">
            <rect x="8" y="8" width="208" height="304" fill="none" stroke="rgba(217, 119, 6, 0.4)" strokeWidth="1"/>
            <rect x="16" y="16" width="192" height="288" fill="none" stroke="rgba(217, 119, 6, 0.25)" strokeWidth="0.5"/>
            <circle cx="112" cy="30" r="3" fill="rgba(217, 119, 6, 0.5)"/>
            <circle cx="112" cy="290" r="3" fill="rgba(217, 119, 6, 0.5)"/>
          </svg>
        </div>

        <div className="relative z-10 h-full flex flex-col items-center justify-between p-5">
          <div className="text-center">
            <div className="text-amber-500/70 text-sm font-serif tracking-widest mb-1">{reading.number}</div>
            <div className="h-px w-10 mx-auto bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative mb-4">
              <svg viewBox="0 0 160 160" className="w-32 h-32 absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 opacity-15">
                <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(217, 119, 6, 0.5)" strokeWidth="1"/>
                <circle cx="80" cy="80" r="45" fill="none" stroke="rgba(217, 119, 6, 0.35)" strokeWidth="0.5"/>
                <circle cx="80" cy="80" r="30" fill="none" stroke="rgba(217, 119, 6, 0.6)" strokeWidth="1.5"/>
              </svg>
              
              <div 
                className={`relative w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br ${reading.color} shadow-2xl`}
                style={{
                  boxShadow: `0 10px 30px ${reading.glowColor}, inset 0 0 20px rgba(0, 0, 0, 0.5)`
                }}
              >
                <Icon size={32} className="text-white drop-shadow-lg" />
              </div>
            </div>

            <h3 className="text-xl font-serif text-amber-100 text-center mb-2 tracking-wide leading-tight px-2">
              {reading.name}
            </h3>
            
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-6 bg-gradient-to-r from-transparent via-amber-600/60 to-transparent" />
              <span className="text-amber-600/50 text-xs">✦</span>
              <div className="h-px w-6 bg-gradient-to-r from-transparent via-amber-600/60 to-transparent" />
            </div>

            <p className="text-amber-400/70 text-xs text-center italic font-serif px-3">
              {reading.description}
            </p>
          </div>

          <div className="text-center">
            <div className="h-px w-10 mx-auto bg-gradient-to-r from-transparent via-amber-600/50 to-transparent mb-1" />
            <div className="text-amber-600/50 text-xs">⟡</div>
          </div>
        </div>

        {['top-2 left-2', 'top-2 right-2 scale-x-[-1]', 'bottom-2 left-2 scale-y-[-1]', 'bottom-2 right-2 scale-[-1]'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-5 h-5 opacity-25`}>
            <svg viewBox="0 0 24 24" className="w-full h-full">
              <path d="M 0 0 L 0 12 Q 0 0 12 0 L 0 0" fill="none" stroke="rgba(217, 119, 6, 0.7)" strokeWidth="1"/>
              <circle cx="4" cy="4" r="1.5" fill="rgba(217, 119, 6, 0.7)"/>
            </svg>
          </div>
        ))}

        <div className={`absolute inset-0 bg-gradient-to-br ${reading.color} opacity-0 transition-opacity duration-500 ${isHovered || isActive ? 'opacity-10' : ''} mix-blend-overlay pointer-events-none`} />
      </div>

      {isHovered && (
        <>
          <Star className="absolute -top-4 -right-4 w-5 h-5 text-amber-600/70 animate-ping pointer-events-none" fill="currentColor" />
          <Sparkles className="absolute -bottom-4 -left-4 w-5 h-5 text-amber-600/70 animate-pulse pointer-events-none" />
        </>
      )}
    </div>
  )
}
