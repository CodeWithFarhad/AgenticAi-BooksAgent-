"use client"

import React, { useRef, useEffect, useState } from "react"
import { Send } from "lucide-react"
import ReactMarkdown from "react-markdown"
import styles from "./chatbg.module.css"
import { useRouter, useSearchParams } from "next/navigation";

const GENRES = ["Fiction", "Mystery", "Sci-Fi", "Non-Fiction", "Romance", "Fantasy"];
const MOODS = ["Relaxing", "Exciting", "Thoughtful", "Adventurous"];
const CHOICES = ["Add to Readlist", "Read Later"];

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { sender: "bot", content: "Hi! I'm your Book Agent. Ask me anything about books or get recommendations!" },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedMood, setSelectedMood] = useState<string>("")
  const [selectedChoice, setSelectedChoice] = useState<string>("")
  const [chatMode, setChatMode] = useState<'suggestion' | 'summary'>('suggestion');
  const latestBotMsgRef = useRef<HTMLDivElement>(null);
  const summaryTriggered = useRef(false);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (latestBotMsgRef.current) {
      latestBotMsgRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages]);

  useEffect(() => {
    if (summaryTriggered.current) return;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const summaryTitle = params.get('summary');
      if (summaryTitle) {
        summaryTriggered.current = true;
        setChatMode('summary');
        setInput(summaryTitle);
        setMessages([
          { sender: 'bot', content: 'Which book would you like a summary of?' },
          { sender: 'user', content: summaryTitle }
        ]);
        setTimeout(() => {
          sendMessage(summaryTitle);
        }, 300);
      }
    }
    // eslint-disable-next-line
  }, []);

  const sendMessage = async (customInput?: string, customPreferences?: any) => {
    const userInput = typeof customInput === 'string' ? customInput : input;
    if (!userInput.trim() && !customInput) return;
    setIsLoading(true);
    let newMessages;
    if (chatMode === 'summary') {
      newMessages = [{ sender: 'user', content: userInput }];
      setMessages(msgs => [...msgs, { sender: 'user', content: userInput }]);
    } else {
      newMessages = [...messages, { sender: 'user', content: userInput }];
      setMessages([...messages, { sender: 'user', content: userInput }]);
    }
    if (!customInput) setInput("");
    try {
      const response = await fetch(`${apiBase}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: chatMode,
          genre: selectedGenres[0] || undefined,
          mood: selectedMood || undefined,
          book: chatMode === 'summary' ? userInput : undefined,
          user_id: undefined, // Set user_id if available
          query: chatMode === 'suggestion' ? userInput : undefined,
        }),
      });
      if (response.status === 405) {
        setMessages(msgs => [...msgs, { sender: "bot", content: "❌ Error: Backend endpoint /agent only supports POST requests. Please check your backend code." }]);
        return;
      }
      if (!response.ok) throw new Error("No response from backend");
      const data = await response.json();
      setMessages(msgs => [...msgs, { sender: "bot", content: data.reply }]);
      // Reset genre and mood after a bot reply
      setSelectedGenres([]);
      setSelectedMood("");
    } catch (error) {
      setMessages([...newMessages, { sender: "bot", content: "Sorry, something went wrong or the backend is not reachable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (chatMode === 'suggestion') {
      if (selectedGenres.length > 0 || selectedMood) {
        let genrePart = selectedGenres.length > 0 ? selectedGenres.join(', ') : '';
        let moodPart = selectedMood ? selectedMood : '';
        let query = 'Recommend me';
        if (genrePart) query += ` ${genrePart}`;
        if (moodPart) query += ` books for a ${moodPart} mood`;
        else query += ' books';
        sendMessage(query.trim() + '!', {
          genres: selectedGenres,
          mood: selectedMood,
          choice: selectedChoice,
        });
      }
    } else if (chatMode === 'summary') {
      if (input.trim()) {
        sendMessage(input.trim(), {
          genres: selectedGenres,
          mood: selectedMood,
          choice: selectedChoice,
        });
      }
    }
    // eslint-disable-next-line
  }, [selectedGenres, selectedMood, chatMode]);

  const handleChatModeChange = (mode: 'suggestion' | 'summary') => {
    setChatMode(mode);
    if (mode === 'summary') {
      setMessages([
        { sender: 'bot', content: 'Which book would you like a summary of?' }
      ]);
      setInput("");
    } else if (mode === 'suggestion') {
      setMessages([
        { sender: 'bot', content: "Hi! I'm your Book Agent. Ask me anything about books or get recommendations!" }
      ]);
      setInput("");
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#101014] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 p-6 space-y-8 sidebar-theme border-r border-neutral-800 flex flex-col justify-center min-h-screen">
        <div>
          <h2 className="text-lg font-bold mb-3 tracking-tight">Discover</h2>
          <div className="flex flex-col gap-2">
            {GENRES.map((category) => (
              <button
                key={category}
                className={`w-full text-left px-4 py-2 rounded-full font-medium transition-colors ${selectedGenres.includes(category) ? 'bg-[#a020f0] text-white' : 'bg-white/10 text-neutral-200 hover:bg-white/20'}`}
                onClick={() => setSelectedGenres(selectedGenres.includes(category) ? [] : [category])}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold mb-3 tracking-tight">Mood</h2>
          <div className="flex flex-col gap-2">
            {MOODS.map((mood) => (
              <button
                key={mood}
                className={`w-full text-left px-4 py-2 rounded-full font-medium transition-colors ${selectedMood === mood ? 'bg-[#a020f0] text-white' : 'bg-white/10 text-neutral-200 hover:bg-white/20'}`}
                onClick={() => setSelectedMood(selectedMood === mood ? "" : mood)}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>
      </aside>
      {/* Main Chat Area */}
      <main className={`flex-1 flex flex-col p-0 sm:p-8 ${styles.animatedBg} overflow-hidden`}>
        <div className="w-full flex flex-col items-center" style={{marginTop: 0, marginBottom: 0, paddingTop: 0}}>
          <p className="text-sm md:text-base text-neutral-300 font-normal text-center max-w-xl">
            Your AI-powered books assistant. Ask anything about books, authors, or get recommendations.
          </p>
        </div>
        <div className="flex-1 flex flex-col justify-end min-h-0">
          <div
            ref={scrollRef}
            className="flex-1 flex flex-col gap-6 py-8 px-2 sm:px-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent min-h-0">
            {messages.map((msg, i) => {
              const isLastBotMsg = msg.sender === "bot" && i === messages.length - 1;
              return (
                <div
                  key={i}
                  ref={isLastBotMsg ? latestBotMsgRef : null}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`rounded-2xl px-6 py-4 shadow-lg bg-white/10 text-white max-w-[80vw] sm:max-w-[60%] font-medium whitespace-pre-line ${msg.sender === 'user' ? 'bg-[#a020f0] text-white' : 'bg-white/10 text-white'}`}>
                    <ReactMarkdown
                      components={{
                        a: ({node, ...props}) => <a {...props} className="underline text-[#a020f0] hover:text-[#c04cfb]" target="_blank" rel="noopener noreferrer"/>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-6 py-4 shadow-lg bg-white/10 text-white max-w-[60%] animate-pulse">
                  ...
                </div>
              </div>
            )}
          </div>
          {/* Chat Bar */}
          <form
            className="flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl px-4 py-4 mx-2 sm:mx-4 mb-6 w-full"
            style={{ alignSelf: 'center' }}
            onSubmit={e => { e.preventDefault(); sendMessage(); }}
          >
            <div className="flex items-center mr-3">
              <button
                type="button"
                className={`px-2.5 py-1.5 text-sm rounded-l-full font-medium transition-colors border border-r-0 border-neutral-700 focus:outline-none ${chatMode === 'suggestion' ? 'bg-[#a020f0] text-white' : 'bg-black/60 text-neutral-200 hover:bg-[#a020f0]/60'}`}
                aria-pressed={chatMode === 'suggestion'}
                onClick={() => handleChatModeChange('suggestion')}
              >
                Book Suggestion
              </button>
              <button
                type="button"
                className={`px-2.5 py-1.5 text-sm rounded-r-full font-medium transition-colors border border-neutral-700 focus:outline-none ${chatMode === 'summary' ? 'bg-[#a020f0] text-white' : 'bg-black/60 text-neutral-200 hover:bg-[#a020f0]/60'}`}
                aria-pressed={chatMode === 'summary'}
                onClick={() => handleChatModeChange('summary')}
              >
                Book Summary
              </button>
            </div>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={chatMode === 'summary' ? "Enter book title or paste text for summary..." : "Type your message..."}
              className="flex-1 bg-transparent text-white border-none outline-none rounded-full px-4 py-3 text-base shadow-none placeholder:text-neutral-300"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              type="submit"
              className="rounded-full bg-[#a020f0] hover:bg-[#c04cfb] text-white p-3 shadow-lg min-w-[44px] min-h-[44px] flex items-center justify-center border border-white/20 backdrop-blur"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  )
} 