import React from 'react'
import './globals.css'
import Link from 'next/link'
import { BookOpen, MessageCircle, History, LayoutDashboard, Settings } from "lucide-react";

const navItems = [
  { name: "Discover", href: "/discover", icon: BookOpen },
  { name: "Chat", href: "/chat", icon: MessageCircle },
  { name: "History", href: "/history", icon: History },
  { name: "Preferences", href: "/preferences", icon: Settings },
];

export const metadata = {
  title: 'Book Agent App',
  description: 'AI-powered book discovery, chat, and reading tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#101014]">
        {/* Sidebar */}
        <aside className="w-20 md:w-24 h-screen fixed left-0 top-0 z-30 flex flex-col items-center py-8 sidebar-theme border-r border-neutral-800 shadow-xl">
          <div className="flex flex-col gap-8 w-full items-center">
            {navItems.map(({ name, href, icon: Icon }) => (
              <Link key={name} href={href} className="group flex flex-col items-center gap-1 px-2 py-3 rounded-xl hover:bg-white/10 transition-colors w-16">
                <Icon className="h-7 w-7 text-neutral-300 group-hover:text-[#a020f0] transition-colors" />
                <span className="text-[10px] text-neutral-400 group-hover:text-[#a020f0] font-medium hidden md:block">{name}</span>
              </Link>
            ))}
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 ml-20 md:ml-24 flex flex-col min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
} 