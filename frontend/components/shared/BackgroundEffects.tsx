'use client'

import { useMemo } from 'react'

interface BackgroundEffectsProps {
  mousePos: { x: number; y: number }
}

// Seeded random function for consistent patterns
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

export default function BackgroundEffects({ mousePos }: BackgroundEffectsProps) {
  // Generate stable pattern data
  const patternData = useMemo(() => {
    const rng = seededRandom(12345)
    
    // Generate vertical lines
    const verticalLines = Array.from({ length: 30 }, (_, i) => {
      const x = (i * 3.3) + (i % 3 === 0 ? 0 : rng() * 1.5)
      const height = 50 + rng() * 50
      const startY = i % 3 === 0 ? 0 : rng() * 30
      const thickness = 0.8 + rng() * 2.5
      const isReverse = i % 2 === 0
      const intensity = 0.3 + rng() * 0.4
      
      return { x, height, startY, thickness, isReverse, intensity }
    })

    // Generate network nodes
    const nodes = Array.from({ length: 50 }, () => ({
      x: rng() * 100,
      y: rng() * 100
    }))

    // Generate connections between nodes
    const connections = nodes.flatMap((node, i) => {
      const nearbyNodes = nodes
        .map((n, idx) => ({ 
          node: n, 
          idx, 
          dist: Math.sqrt(Math.pow(n.x - node.x, 2) + Math.pow(n.y - node.y, 2)) 
        }))
        .filter(n => n.idx !== i && n.dist < 15)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2 + Math.floor(rng() * 2))

      return nearbyNodes.map(({ node: target }) => ({
        from: node,
        to: target,
        midX: (node.x + target.x) / 2 + (rng() * 8 - 4),
        midY: (node.y + target.y) / 2 + (rng() * 8 - 4)
      }))
    })

    // Generate organic curves
    const organicCurves = Array.from({ length: 25 }, () => {
      const startX = rng() * 100
      const startY = rng() * 100
      return {
        startX,
        startY,
        cp1X: startX + (rng() * 25 - 12.5),
        cp1Y: startY + (rng() * 25 - 12.5),
        cp2X: startX + (rng() * 35 - 17.5),
        cp2Y: startY + (rng() * 35 - 17.5),
        endX: startX + (rng() * 40 - 20),
        endY: startY + (rng() * 40 - 20)
      }
    })

    return { verticalLines, nodes, connections, organicCurves }
  }, [])
  return (
    <>
      {/* Rich velvet curtain texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.12]" style={{
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139, 69, 19, 0.08) 3px, rgba(139, 69, 19, 0.08) 6px),
          repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(101, 67, 33, 0.06) 3px, rgba(101, 67, 33, 0.06) 6px),
          radial-gradient(ellipse at center, rgba(139, 69, 19, 0.03), transparent 60%)
        `
      }} />

      {/* Subtle wood grain pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04]" style={{
        backgroundImage: `
          repeating-linear-gradient(90deg, 
            transparent, 
            transparent 100px, 
            rgba(101, 67, 33, 0.3) 100px, 
            rgba(101, 67, 33, 0.3) 102px,
            transparent 102px,
            transparent 400px
          )
        `
      }} />

      {/* Layered atmospheric depth - like incense smoke and candlelight */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        
        {/* Warm candlelight pools */}
        {[...Array(12)].map((_, i) => (
          <div 
            key={`candle-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${300 + i * 80}px`,
              height: `${300 + i * 80}px`,
              background: i % 2 === 0 
                ? 'radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, rgba(120, 53, 15, 0.08) 30%, transparent 60%)'
                : 'radial-gradient(circle, rgba(180, 83, 9, 0.12) 0%, rgba(146, 64, 14, 0.06) 35%, transparent 65%)',
              filter: `blur(${50 + i * 15}px)`,
              top: `${5 + i * 8}%`,
              left: `${-5 + i * 9}%`,
              animation: `candleGlow ${20 + i * 4}s ease-in-out infinite, windSway ${15 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s, ${i * 1}s`,
              opacity: 0.6
            }}
          />
        ))}

        {/* Mystical smoke wisps */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`smoke-${i}`}
            className="absolute"
            style={{
              width: `${200 + i * 60}px`,
              height: `${500 + i * 100}px`,
              background: `linear-gradient(to top, 
                transparent 0%, 
                rgba(139, 92, 46, 0.04) 20%,
                rgba(101, 67, 33, 0.06) 50%,
                rgba(120, 53, 15, 0.03) 80%,
                transparent 100%
              )`,
              filter: `blur(${60 + i * 20}px)`,
              top: `${60 - i * 5}%`,
              left: `${10 + i * 11}%`,
              animation: `drift ${35 + i * 7}s ease-in-out infinite, windSway ${18 + i * 3}s ease-in-out infinite`,
              animationDelay: `${i * 2.5}s, ${i * 1.5}s`,
              transform: 'rotate(-10deg)'
            }}
          />
        ))}

        {/* Ornate shadow patterns - like carved wooden screens */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" style={{ mixBlendMode: 'multiply' }}>
            <defs>
              <pattern id="arabesque" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
                <path d="M 100 0 Q 150 50 100 100 Q 50 150 100 200" 
                      fill="none" 
                      stroke="rgba(139, 69, 19, 0.4)" 
                      strokeWidth="0.5"/>
                <path d="M 0 100 Q 50 50 100 100 Q 150 150 200 100" 
                      fill="none" 
                      stroke="rgba(101, 67, 33, 0.3)" 
                      strokeWidth="0.5"/>
                <circle cx="100" cy="100" r="40" fill="none" stroke="rgba(120, 53, 15, 0.3)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#arabesque)"/>
          </svg>
        </div>


        {/* Antique mirror reflections - very subtle */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`mirror-${i}`}
            className="absolute rounded-full"
            style={{
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(217, 119, 6, 0.08) 0%, transparent 70%)',
              filter: 'blur(40px)',
              top: `${20 + i * 15}%`,
              right: `${10 + i * 12}%`,
              animation: `flicker ${8 + i * 2}s ease-in-out infinite, windSway ${16 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.2}s, ${i * 1}s`,
              mixBlendMode: 'screen'
            }}
          />
        ))}

        {/* Light rays originating from top-left corner */}
        <svg className="absolute inset-0 w-full h-full opacity-20" style={{ mixBlendMode: 'screen' }}>
          <defs>
            <radialGradient id="lightSource" cx="0%" cy="0%">
              <stop offset="0%" stopColor="rgba(217, 119, 6, 0.8)" />
              <stop offset="50%" stopColor="rgba(217, 119, 6, 0.3)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          
          {/* Source glow */}
          <circle cx="0" cy="0" r="150" fill="url(#lightSource)" opacity="0.6" />
          
          {/* Individual rays spreading out */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 15) - 15 // Spread from -15° to 150°
            const length = 200 + (i * 10)
            const endX = Math.cos((angle * Math.PI) / 180) * length
            const endY = Math.sin((angle * Math.PI) / 180) * length
            
            return (
              <g key={`light-ray-${i}`}>
                <line
                  x1="0"
                  y1="0"
                  x2={`${endX}%`}
                  y2={`${endY}%`}
                  stroke="rgba(217, 119, 6, 0.4)"
                  strokeWidth={60 - i * 2}
                  strokeLinecap="round"
                  style={{
                    filter: 'blur(25px)',
                    animation: `windSway ${12 + i * 1.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.5}s`,
                    transformOrigin: '0% 0%'
                  }}
                />
              </g>
            )
          })}
        </svg>


        {/* Aged parchment overlay - adds warmth */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          background: `
            radial-gradient(ellipse at 30% 40%, rgba(139, 69, 19, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, rgba(101, 67, 33, 0.3) 0%, transparent 50%)
          `,
          mixBlendMode: 'overlay'
        }} />
      </div>

      {/* Vertical glowing lines with curved network and circles */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: 'screen' }}>
        <defs>
          <linearGradient id="verticalGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(217, 119, 6, 0.9)" />
            <stop offset="50%" stopColor="rgba(217, 119, 6, 0.5)" />
            <stop offset="100%" stopColor="rgba(217, 119, 6, 0.1)" />
          </linearGradient>
          <linearGradient id="verticalGlowReverse" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(217, 119, 6, 0.1)" />
            <stop offset="50%" stopColor="rgba(217, 119, 6, 0.5)" />
            <stop offset="100%" stopColor="rgba(217, 119, 6, 0.9)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Vertical glowing lines - varying intensity and thickness */}
        {patternData.verticalLines.map((line, i) => (
          <line
            key={`vertical-${i}`}
            x1={`${line.x}%`}
            y1={`${line.startY}%`}
            x2={`${line.x}%`}
            y2={`${line.startY + line.height}%`}
            stroke={line.isReverse ? "url(#verticalGlowReverse)" : "url(#verticalGlow)"}
            strokeWidth={line.thickness}
            filter="url(#glow)"
            opacity={line.intensity}
          />
        ))}

        {/* Curved network lines with circles at intersections */}
        <g opacity="0.35">
          {/* Draw curved lines connecting nearby nodes */}
          {patternData.connections.map((conn, i) => (
            <path
              key={`curve-${i}`}
              d={`M ${conn.from.x}% ${conn.from.y}% Q ${conn.midX}% ${conn.midY}%, ${conn.to.x}% ${conn.to.y}%`}
              fill="none"
              stroke="rgba(217, 119, 6, 0.25)"
              strokeWidth="0.4"
              filter="url(#softGlow)"
            />
          ))}

          {/* Circles at node positions (intersection points) */}
          {patternData.nodes.map((node, i) => (
            <circle
              key={`node-${i}`}
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r={node.radius}
              fill="rgba(217, 119, 6, 0.35)"
              filter="url(#softGlow)"
            />
          ))}

          {/* Additional organic curved paths for more complexity */}
          {patternData.organicCurves.map((curve, i) => (
            <path
              key={`organic-${i}`}
              d={`M ${curve.startX}% ${curve.startY}% C ${curve.cp1X}% ${curve.cp1Y}%, ${curve.cp2X}% ${curve.cp2Y}%, ${curve.endX}% ${curve.endY}%`}
              fill="none"
              stroke="rgba(217, 119, 6, 0.2)"
              strokeWidth="0.3"
              filter="url(#softGlow)"
            />
          ))}
        </g>
      </svg>
    </>
  )
}
