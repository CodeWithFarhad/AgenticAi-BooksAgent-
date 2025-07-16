import React from 'react'
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/discover')
  return (
    <div className="min-h-screen w-full bg-[#181A20]">
      {/* ...existing content... */}
    </div>
  )
} 