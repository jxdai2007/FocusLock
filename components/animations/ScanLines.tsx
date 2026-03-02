'use client'

export default function ScanLines() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      {/* Horizontal line grid */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
        }}
      />
      {/* Moving scan line */}
      <div
        className="absolute left-0 h-[2px] w-full bg-green-500/10"
        style={{
          animation: 'scan-line-move 3s linear infinite',
        }}
      />
    </div>
  )
}
