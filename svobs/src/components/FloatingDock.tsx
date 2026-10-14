'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

export interface DockItem {
  id: string
  ad: string
  ikon: LucideIcon
  rozet?: number | boolean
}

interface FloatingDockProps {
  items: DockItem[]
  aktifId: string
  onChange: (id: string) => void
}

export function FloatingDock({ items, aktifId, onChange }: FloatingDockProps) {
  const aktifIndex = Math.max(0, items.findIndex((i) => i.id === aktifId))
  const itemGenislikYuzdesi = 100 / (items.length || 1)

  return (
    <>
      {/* SVG Kırılma ve Prizmatik Mercek Motoru */}
      <svg className="fixed w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="liquid-glass-refract" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.015 0.04" numOctaves="2" result="lensNoise" />
            <feDisplacementMap in="SourceGraphic" in2="lensNoise" scale="12" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feColorMatrix in="displaced" type="matrix" values="
              1 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              0 0 0 1 0" result="red" />
            <feOffset in="red" dx="-0.6" dy="0" result="redShift" />
            <feColorMatrix in="displaced" type="matrix" values="
              0 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 1 0" result="cyan" />
            <feOffset in="cyan" dx="0.6" dy="0" result="cyanShift" />
            <feBlend in="redShift" in2="cyanShift" mode="screen" result="chromatic" />
            <feBlend in="chromatic" in2="displaced" mode="multiply" />
          </filter>
        </defs>
      </svg>

      <div className="fixed bottom-5 inset-x-0 mx-auto z-50 w-[92vw] max-w-[380px] pointer-events-auto">
        {/* 1. KATMAN: Kristal Cam Tabla */}
        <nav 
          className="relative p-1.5 rounded-full select-none overflow-hidden"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(24px) saturate(210%) contrast(105%)',
            WebkitBackdropFilter: 'blur(24px) saturate(210%) contrast(105%)',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.50), inset 0 -1px 1px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="relative flex items-center w-full">
            
            {/* 2. KATMAN: KESİNTİSİZ AKAN SIVI CIVA */}
            <motion.div
              className="absolute inset-y-0 left-0 pointer-events-none z-0 p-1 flex items-center justify-center"
              style={{ width: `${itemGenislikYuzdesi}%` }}
              animate={{
                x: `${aktifIndex * 100}%`,
              }}
              transition={{
                type: 'spring',
                stiffness: 180,
                damping: 29,
                mass: 0.85
              }}
            >
              <div 
                className="w-full h-full rounded-full"
                style={{
                  backgroundColor: 'rgba(27, 67, 50, 0.18)',
                  border: '1px solid rgba(27, 67, 50, 0.32)',
                  boxShadow: '0 2px 8px rgba(27, 67, 50, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.40)'
                }}
              />
            </motion.div>

            {/* 3. KATMAN: Butonlar */}
            {items.map((item) => {
              const aktif = aktifId === item.id
              const Ikon = item.ikon
              const rozetVar = Boolean(item.rozet)

              return (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  className="relative z-10 flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full cursor-pointer transition-transform duration-150 active:scale-95"
                >
                  <div className="relative">
                    <Ikon 
                      className={`size-5 transition-transform duration-200 ${
                        aktif ? 'scale-105' : 'scale-100'
                      }`}
                      style={{
                        color: aktif ? '#0f3a22' : 'rgba(30, 41, 59, 0.70)',
                        strokeWidth: aktif ? 2.3 : 1.85
                      }}
                    />

                    {rozetVar && !aktif && (
                      <span className="absolute -top-1 -right-1 flex size-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-80" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-amber-500 border border-white" />
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[11px] mt-1 tracking-tight leading-none transition-all duration-200 ${
                      aktif ? 'font-semibold' : 'font-medium'
                    }`}
                    style={{
                      color: aktif ? '#0f3a22' : 'rgba(30, 41, 59, 0.70)'
                    }}
                  >
                    {item.ad}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </>
  )
}
