"use client";
import React from 'react'
import './globals.css'
import Link from 'next/link'
import { BookOpen, MessageCircle, History, LayoutDashboard, Settings } from "lucide-react";
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: "Discover", href: "/discover", icon: BookOpen },
  { name: "Chat", href: "/chat", icon: MessageCircle },
  { name: "History", href: "/history", icon: History },
  { name: "Preferences", href: "/preferences", icon: Settings },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen bg-[#181A20]">
        {/* Sidebar */}
        <aside className="w-20 md:w-24 h-screen fixed left-0 top-0 z-30 flex flex-col items-center py-8 sidebar-theme border-r border-black shadow-xl bg-[#0B0D12]">
          {/* Bookora Logo */}
          <div className="flex flex-col items-center mb-8 w-full">
            <div className="bg-[#181A20] rounded-2xl shadow-lg border border-[#23263A] p-2 flex items-center justify-center" style={{ width: 80, height: 80 }}>
              <Image src="/assets/bot-book-logo.png" alt="Bookora Bot Logo" width={64} height={64} className="mx-auto" priority />
            </div>
          </div>
          <div className="flex flex-col gap-8 w-full items-center">
            {navItems.map(({ name, href, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link key={name} href={href} className={`group flex flex-col items-center gap-1 px-2 py-3 rounded-xl hover:bg-[#23263A] transition-colors w-16`}>
                  <Icon className={`h-7 w-7 text-neutral-300 group-hover:text-[#4F46E5] transition-colors`} />
                  <span className={`text-xs md:text-sm hidden md:block font-semibold ${isActive ? 'text-[#4F46E5]' : 'text-neutral-400'} group-hover:text-[#4F46E5]`}>{name}</span>
                </Link>
              );
            })}
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