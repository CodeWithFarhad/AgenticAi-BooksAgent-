import React from 'react'
import { redirect } from 'next/navigation'
import styles from "./chat/chatbg.module.css";

export default function Home() {
  redirect('/discover')
  return (
    <div className={`min-h-screen w-full ${styles.animatedBg}`}>
      {/* ...existing content... */}
    </div>
  )
} 