/**
 * SpinWheel - Interactive casino-style spinning wheel
 * 
 * Features:
 * - 8 alternating WIN/LOSE sections
 * - Click to spin interaction
 * - Rigged: 75% chance to land on WIN
 * - Smooth spin animation with easing
 * - Glowing hover effect
 */

"use client"

import { useState, useCallback } from "react"

interface SpinWheelProps {
  onResult: (won: boolean) => void
  disabled?: boolean
}

// 8 sections: alternating WIN (green) and LOSE (red)
// Indices 0, 2, 4, 6 = WIN
// Indices 1, 3, 5, 7 = LOSE
const SECTIONS = [
  { label: "WIN", color: "#22c55e", textColor: "#ffffff" },  // 0
  { label: "LOSE", color: "#ef4444", textColor: "#ffffff" }, // 1
  { label: "WIN", color: "#16a34a", textColor: "#ffffff" },  // 2
  { label: "LOSE", color: "#dc2626", textColor: "#ffffff" }, // 3
  { label: "WIN", color: "#22c55e", textColor: "#ffffff" },  // 4
  { label: "LOSE", color: "#ef4444", textColor: "#ffffff" }, // 5
  { label: "WIN", color: "#16a34a", textColor: "#ffffff" },  // 6
  { label: "LOSE", color: "#dc2626", textColor: "#ffffff" }, // 7
]

const SECTION_ANGLE = 360 / SECTIONS.length // 45 degrees each
const WHEEL_SIZE = 240

export function SpinWheel({ onResult, disabled }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [hasSpun, setHasSpun] = useState(false)

  const spin = useCallback(() => {
    if (isSpinning || disabled || hasSpun) return

    setIsSpinning(true)
    setHasSpun(true)

    // Determine outcome: 75% WIN, 25% LOSE
    const won = Math.random() < 0.75

    // WIN sections are at indices 0, 2, 4, 6 (angles 0, 90, 180, 270 start positions)
    // LOSE sections are at indices 1, 3, 5, 7 (angles 45, 135, 225, 315 start positions)
    // The pointer is at the top (0 degrees), so we need to calculate where to stop
    
    // Pick a random section that matches the outcome
    const winSections = [0, 2, 4, 6]
    const loseSections = [1, 3, 5, 7]
    const targetSections = won ? winSections : loseSections
    const targetSection = targetSections[Math.floor(Math.random() * targetSections.length)]
    
    // Calculate target angle - we want the middle of the section to be at the top (pointer)
    // Section 0 starts at 0 degrees, section 1 at 45, etc.
    // Middle of section is at (sectionIndex * 45) + 22.5
    // To land on a section, we need to rotate so that section is at top
    // This means rotating 360 - sectionMiddleAngle + randomOffset
    const sectionMiddle = targetSection * SECTION_ANGLE + SECTION_ANGLE / 2
    
    // Random offset within the section (but not too close to edges)
    const randomOffset = (Math.random() - 0.5) * (SECTION_ANGLE * 0.6)
    
    // Calculate final angle: we want sectionMiddle + randomOffset to be at top
    // Wheel rotates clockwise, pointer is at top
    // Add multiple full rotations for dramatic effect (4-6 spins)
    const fullRotations = 4 + Math.floor(Math.random() * 3) // 4-6 full spins
    const targetAngle = 360 - sectionMiddle + randomOffset
    const finalRotation = rotation + (fullRotations * 360) + targetAngle
    
    setRotation(finalRotation)

    // Animation duration matches CSS transition (4 seconds)
    setTimeout(() => {
      setIsSpinning(false)
      onResult(won)
    }, 4000)
  }, [isSpinning, disabled, hasSpun, rotation, onResult])

  // Create wheel sections as SVG paths
  const createWheelSection = (index: number) => {
    const startAngle = index * SECTION_ANGLE
    const endAngle = startAngle + SECTION_ANGLE
    const startRad = (startAngle - 90) * (Math.PI / 180) // -90 to start from top
    const endRad = (endAngle - 90) * (Math.PI / 180)
    
    const radius = 100
    const centerX = 110
    const centerY = 110
    
    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)
    
    const largeArc = SECTION_ANGLE > 180 ? 1 : 0
    
    const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    
    // Text position (middle of section, at 65% radius)
    const textAngle = startAngle + SECTION_ANGLE / 2 - 90
    const textRad = textAngle * (Math.PI / 180)
    const textRadius = radius * 0.65
    const textX = centerX + textRadius * Math.cos(textRad)
    const textY = centerY + textRadius * Math.sin(textRad)
    
    return (
      <g key={index}>
        <path
          d={pathData}
          fill={SECTIONS[index].color}
          stroke="#1f2937"
          strokeWidth="2"
        />
        <text
          x={textX}
          y={textY}
          fill={SECTIONS[index].textColor}
          fontSize="11"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(${startAngle + SECTION_ANGLE / 2}, ${textX}, ${textY})`}
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          {SECTIONS[index].label}
        </text>
      </g>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* Wheel container */}
      <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
        {/* Pointer/Ticker at top */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <div 
            className="w-0 h-0 drop-shadow-lg"
            style={{
              borderLeft: '14px solid transparent',
              borderRight: '14px solid transparent',
              borderTop: '24px solid #fbbf24',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
          />
        </div>
        
        {/* Outer glow ring */}
        <div 
          className={`
            absolute inset-0 rounded-full
            ${!isSpinning && !hasSpun ? 'spin-wheel-glow' : ''}
          `}
          style={{
            background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
            padding: '8px'
          }}
        >
          {/* Dark inner ring */}
          <div 
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ background: '#1f2937', padding: '4px' }}
          >
            {/* Clickable wheel area */}
            <div 
              onClick={spin}
              className={`
                w-full h-full rounded-full cursor-pointer transition-transform duration-300
                ${!isSpinning && !hasSpun && !disabled ? 'hover:scale-[1.02]' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {/* SVG Wheel */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 220 220"
                className="rounded-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning 
                    ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' 
                    : 'none'
                }}
              >
                {/* Sections */}
                {SECTIONS.map((_, index) => createWheelSection(index))}
                
                {/* Center hub */}
                <circle cx="110" cy="110" r="22" fill="url(#hubGradient)" stroke="#1f2937" strokeWidth="3" />
                <circle cx="110" cy="110" r="14" fill="#f59e0b" stroke="#1f2937" strokeWidth="2" />
                <text
                  x="110"
                  y="110"
                  fill="#1f2937"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  SPIN
                </text>
                
                {/* Gradient definitions */}
                <defs>
                  <linearGradient id="hubGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fcd34d" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status text below wheel */}
      <div className="mt-6 h-8">
        {!hasSpun && !disabled && (
          <p className="text-amber-300 font-bold text-lg animate-pulse text-center">
            Click to spin!
          </p>
        )}
        {isSpinning && (
          <p className="text-amber-400 font-bold text-lg animate-bounce text-center">
            Spinning...
          </p>
        )}
      </div>
    </div>
  )
}
