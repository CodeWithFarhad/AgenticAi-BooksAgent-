"use client"

import React, { useRef, useEffect, useState } from "react"
import { Send } from "lucide-react"
import ReactMarkdown from "react-markdown"
import styles from "./chatbg.module.css"
import { useRouter, useSearchParams } from "next/navigation";

const GENRES = ["Fiction", "Mystery", "Sci-Fi", "Non-Fiction", "Romance", "Fantasy"];
const MOODS = ["Relaxing", "Exciting", "Thoughtful", "Adventurous", "Motivated"];
const CHOICES = ["Add to Readlist", "Read Later"];

function extractSections(markdown) {
  // Returns an array of { type: 'title'|'summary'|'other', content: string }
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let buffer = [];
  let currentType = 'other';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^### [^\n]*\*.*\*/.test(line)) {
      // Title line
      if (buffer.length) sections.push({ type: currentType, content: buffer.join('\n') });
      buffer = [line];
      currentType = 'title';
    } else if (/^### 📝 Summary/.test(line)) {
      if (buffer.length) sections.push({ type: currentType, content: buffer.join('\n') });
      buffer = [line];
      currentType = 'summary';
    } else if (/^### /.test(line)) {
      // Other section
      if (buffer.length) sections.push({ type: currentType, content: buffer.join('\n') });
      buffer = [line];
      currentType = 'other';
    } else {
      buffer.push(line);
    }
  }
  if (buffer.length) sections.push({ type: currentType, content: buffer.join('\n') });
  return sections;
}

function extractBookBlocks(markdown) {
  // Splits the markdown into book blocks (delimited by ---) and parses each block into sections
  const blocks = markdown.split(/\n---+\n/).map(block => block.trim()).filter(Boolean);
  return blocks.map(block => {
    const titleMatch = block.match(/### 📘 \*(.*?)\*/);
    const coverMatch = block.match(/!\[Cover\]\((.*?)\)/);
    const authorMatch = block.match(/\*\*✍️ Author\*\*: (.*)/);
    const ratingMatch = block.match(/\*\*⭐ Rating\*\*: (.*)/);
    const tagMatch = block.match(/\*\*🏷️ Tag\*\*: (.*)/);
    const summaryMatch = block.match(/### 📝 Summary\s*([\s\S]*?)(?=\n###|$)/);
    const moralMatch = block.match(/### 🌟 Moral\s*([\s\S]*?)(?=\n###|$)/);
    const buyLinksMatch = block.match(/### 🔗 Where to Buy or Read\s*([\s\S]*)/);
    let buyLinks = [];
    if (buyLinksMatch) {
      buyLinks = buyLinksMatch[1].split(/\n|•/).map(l => l.trim()).filter(l => l && l.startsWith('['));
    }
    return {
      title: titleMatch ? titleMatch[1] : null,
      cover: coverMatch ? coverMatch[1] : null,
      author: authorMatch ? authorMatch[1] : null,
      rating: ratingMatch ? ratingMatch[1] : null,
      tag: tagMatch ? tagMatch[1] : null,
      summary: summaryMatch ? summaryMatch[1].trim() : null,
      moral: moralMatch ? moralMatch[1].trim() : null,
      buyLinks,
      raw: block,
    };
  });
}

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
  // Chat history state
  const [chatHistory, setChatHistory] = useState<{ sender: string; content: string }[][]>([]); // Array of message arrays
  const [activeChatIndex, setActiveChatIndex] = useState<number>(0);
  // Track last provided genre, mood, and last bot prompt type
  const lastGenreRef = useRef<string>("");
  const lastMoodRef = useRef<string>("");
  const lastBotPromptRef = useRef<"genre" | "mood" | null>(null);
  const [audioState, setAudioState] = useState({ playing: false, utterance: null, summary: null });

  // Detect if the last bot message was a prompt for genre or mood
  useEffect(() => {
    if (messages.length > 0) {
      const lastBotMsg = messages[messages.length - 1];
      if (lastBotMsg.sender === "bot") {
        if (lastBotMsg.content.toLowerCase().includes("what genre are you interested in")) {
          lastBotPromptRef.current = "genre";
        } else if (lastBotMsg.content.toLowerCase().includes("what mood are you in")) {
          lastBotPromptRef.current = "mood";
        } else {
          lastBotPromptRef.current = null;
        }
      }
    }
  }, [messages]);

  // Save chat history on new session
  useEffect(() => {
    if (messages.length > 1) {
      setChatHistory((prev: { sender: string; content: string }[][]) => {
        const updated = [...prev];
        updated[activeChatIndex] = messages;
        return updated;
      });
    }
  }, [messages]);

  // Start new chat session
  const startNewChat = () => {
    setChatHistory(prev => [...prev, [{ sender: "bot", content: "Hi! I'm your Book Agent. Ask me anything about books or get recommendations!" }]]);
    setActiveChatIndex(chatHistory.length);
    setMessages([{ sender: "bot", content: "Hi! I'm your Book Agent. Ask me anything about books or get recommendations!" }]);
  };

  // Switch to previous chat session
  const switchChat = (idx: number) => {
    setActiveChatIndex(idx);
    setMessages(chatHistory[idx] || [{ sender: "bot", content: "Hi! I'm your Book Agent. Ask me anything about books or get recommendations!" }]);
  };

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

    // --- New logic: auto-combine genre and mood based on last bot prompt ---
    let genre = selectedGenres[0] || lastGenreRef.current || undefined;
    let mood = selectedMood || lastMoodRef.current || undefined;
    const GENRES = ["fiction", "mystery", "sci-fi", "non-fiction", "romance", "fantasy", "biography", "history", "self-help", "horror", "young adult", "children", "comics", "poetry"];
    const MOODS = ["relaxing", "exciting", "thoughtful", "adventurous", "inspiring", "dark", "funny", "romantic", "sad", "happy"];
    const inputLower = userInput.trim().toLowerCase();
    if (GENRES.includes(inputLower)) {
      genre = inputLower.charAt(0).toUpperCase() + inputLower.slice(1);
      lastGenreRef.current = genre;
    }
    if (MOODS.includes(inputLower)) {
      mood = inputLower.charAt(0).toUpperCase() + inputLower.slice(1);
      lastMoodRef.current = mood;
    }
    // If the last bot prompt was for genre, treat this input as genre
    if (lastBotPromptRef.current === "genre" && !GENRES.includes(inputLower)) {
      genre = userInput.trim();
      lastGenreRef.current = genre;
    }
    // If the last bot prompt was for mood, treat this input as mood
    if (lastBotPromptRef.current === "mood" && !MOODS.includes(inputLower)) {
      mood = userInput.trim();
      lastMoodRef.current = mood;
    }
    // If both are available, send both to backend
    let sendGenre = genre;
    let sendMood = mood;
    // If userInput is a full query, try to extract both
    for (const g of GENRES) {
      if (userInput.toLowerCase().includes(g)) sendGenre = g.charAt(0).toUpperCase() + g.slice(1);
    }
    for (const m of MOODS) {
      if (userInput.toLowerCase().includes(m)) sendMood = m.charAt(0).toUpperCase() + m.slice(1);
    }
    if (sendGenre) lastGenreRef.current = sendGenre;
    if (sendMood) lastMoodRef.current = sendMood;

    // If replying to a prompt, always send both if available
    if (lastBotPromptRef.current && sendGenre && sendMood) {
      // Send a combined query to backend
      try {
        const response = await fetch(`${apiBase}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: chatMode,
            genre: sendGenre,
            mood: sendMood,
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
        setSelectedGenres([]);
        setSelectedMood("");
      } catch (error) {
        setMessages([...newMessages, { sender: "bot", content: "Sorry, something went wrong or the backend is not reachable." }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Otherwise, send as usual
    try {
      const response = await fetch(`${apiBase}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: chatMode,
          genre: sendGenre,
          mood: sendMood,
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
    }
    // No summary auto-trigger here!
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

  // Add Chat History Bar and Modal at the bottom of the chat page
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="flex h-screen bg-[#101014] text-white overflow-hidden">
      {/* Sidebar with Chat History */}
      <aside className="w-72 p-4 space-y-6 bg-[#181F2A] sidebar-theme border-r border-neutral-800 flex flex-col min-h-screen">
        {/* Discover Section */}
        <div>
          <h2 className="text-lg font-bold mb-3 tracking-tight">Discover</h2>
          <div className="flex flex-col gap-2">
            {GENRES.map((category) => (
              <button
                key={category}
                className={`w-full text-left px-4 py-2 rounded-full font-bold shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#60A5FA] 
                  ${selectedGenres.includes(category)
                    ? 'bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] text-white ring-2 ring-[#60A5FA]'
                    : 'bg-gradient-to-r from-[#23263A] via-[#23263A] to-[#181A20] text-white hover:from-[#4F46E5] hover:to-[#3B82F6] hover:text-white'}
                `}
                onClick={() => setSelectedGenres(selectedGenres.includes(category) ? [] : [category])}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        {/* Mood Section */}
        <div>
          <h2 className="text-lg font-bold mb-3 tracking-tight">Mood</h2>
          <div className="flex flex-col gap-2">
            {MOODS.map((mood) => (
              <button
                key={mood}
                className={`w-full text-left px-4 py-2 rounded-full font-bold shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#60A5FA] 
                  ${selectedMood === mood
                    ? 'bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] text-white ring-2 ring-[#60A5FA]'
                    : 'bg-gradient-to-r from-[#23263A] via-[#23263A] to-[#181A20] text-white hover:from-[#4F46E5] hover:to-[#3B82F6] hover:text-white'}
                `}
                onClick={() => setSelectedMood(selectedMood === mood ? "" : mood)}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>
      </aside>
      {/* Main Chat Area */}
      <main className={`flex-1 flex flex-col p-0 sm:p-8 bg-[#101014] overflow-hidden`}>
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
              const isBot = msg.sender === 'bot';
              if (!isBot) {
                // User message: render as before
                return (
                  <div
                    key={i}
                    ref={isLastBotMsg ? latestBotMsgRef : null}
                    className={`flex justify-end`}
                  >
                    <div className={`rounded-2xl px-6 py-4 shadow-lg bg-[#7B5CFA] text-white max-w-[80vw] sm:max-w-[60%] font-medium whitespace-pre-line`}>
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
              }
              // Bot message: check if it's a book block (contains title/summary)
              const bookBlocks = extractBookBlocks(msg.content);
              if (bookBlocks.length > 1 || (bookBlocks.length === 1 && (bookBlocks[0].title || bookBlocks[0].summary))) {
                return (
                  <div key={i} ref={isLastBotMsg ? latestBotMsgRef : null} className="flex justify-start">
                    <div className="bg-[#23263A] text-white max-w-[80vw] sm:max-w-[60%] font-medium rounded-2xl px-6 py-4 shadow-lg flex flex-col gap-6">
                      {bookBlocks.map((block, idx) => (
                        <div key={idx} className="flex flex-col gap-2 border-b border-white/10 pb-4 mb-2 last:border-b-0 last:pb-0 last:mb-0">
                          {block.title && (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">{block.title}</span>
                              <button
                                title="Copy Title"
                                onClick={() => navigator.clipboard.writeText(block.title)}
                                className="p-1 rounded hover:bg-white/10 focus:outline-none border border-white/10"
                                style={{ background: 'rgba(255,255,255,0.05)' }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                              </button>
                            </div>
                          )}
                          {block.cover && (
                            <img src={block.cover} alt="Book cover" className="w-24 h-32 object-cover rounded shadow mb-2" />
                          )}
                          <div className="flex flex-wrap gap-4 text-sm text-neutral-300">
                            {block.author && <span><b>Author:</b> {block.author}</span>}
                            {block.rating && <span><b>Rating:</b> {block.rating}</span>}
                            {block.tag && <span><b>Tag:</b> {block.tag}</span>}
                          </div>
                          {block.summary && (
                            <div className="flex items-start gap-2 mt-2">
                              <div className="flex-1">
                                <span className="font-semibold">Summary:</span>
                                <span className="ml-2">{block.summary}</span>
                              </div>
                              <button
                                title="Copy Summary"
                                onClick={() => navigator.clipboard.writeText(block.summary)}
                                className="p-1 rounded hover:bg-white/10 focus:outline-none border border-white/10"
                                style={{ background: 'rgba(255,255,255,0.05)' }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                              </button>
                              <button
                                title={audioState.playing && audioState.summary === block.summary ? "Stop Audio" : "Read Summary Aloud"}
                                onClick={() => {
                                  if (audioState.playing && audioState.summary === block.summary) {
                                    window.speechSynthesis.cancel();
                                    setAudioState({ playing: false, utterance: null, summary: null });
                                  } else {
                                    if (audioState.playing) window.speechSynthesis.cancel();
                                    const utterance = new window.SpeechSynthesisUtterance(block.summary);
                                    utterance.rate = 1;
                                    utterance.pitch = 1;
                                    utterance.lang = 'en-US';
                                    utterance.onend = () => setAudioState({ playing: false, utterance: null, summary: null });
                                    setAudioState({ playing: true, utterance, summary: block.summary });
                                    window.speechSynthesis.speak(utterance);
                                  }
                                }}
                                className={`p-1 rounded hover:bg-white/10 focus:outline-none border border-white/10 ${audioState.playing && audioState.summary === block.summary ? 'bg-red-500/20' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.05)' }}
                              >
                                {audioState.playing && audioState.summary === block.summary ? (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                )}
                              </button>
                            </div>
                          )}
                          {block.moral && (
                            <div className="mt-2 text-sm text-yellow-300"><b>Moral:</b> {block.moral}</div>
                          )}
                          {block.buyLinks.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2 text-sm">
                              {block.buyLinks.map((l, j) => {
                                const m = l.match(/\[(.*?)\]\((.*?)\)/);
                                if (!m) return null;
                                // Only show Amazon and Goodreads links
                                const label = m[1].toLowerCase();
                                if (label.includes('amazon') || label.includes('goodreads')) {
                                  return (
                                    <a
                                      key={j}
                                      href={m[2]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline text-[#2563eb] hover:text-[#60A5FA] transition-colors"
                                    >
                                      {m[1]}
                                    </a>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              // Fallback: render as before (for non-book bot messages)
              const sections = extractSections(msg.content);
              return (
                <div
                  key={i}
                  ref={isLastBotMsg ? latestBotMsgRef : null}
                  className={`flex justify-start`}
                >
                  <div className={`rounded-2xl px-6 py-4 shadow-lg bg-[#23263A] text-white max-w-[80vw] sm:max-w-[60%] font-medium whitespace-pre-line relative flex flex-col gap-2`}>
                    {sections.map((section, idx) => {
                      if (section.type === 'title') {
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <ReactMarkdown
                              components={{
                                a: ({node, ...props}) => <a {...props} className="underline text-[#a020f0] hover:text-[#c04cfb]" target="_blank" rel="noopener noreferrer"/>,
                              }}
                            >
                              {section.content}
                            </ReactMarkdown>
                            <button
                              title="Copy Title"
                              onClick={() => {
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(section.content.replace(/^### [^\n]*\*|\*$/g, '').trim());
                                }
                              }}
                              className="p-1 rounded hover:bg-white/10 focus:outline-none border border-white/10"
                              style={{ background: 'rgba(255,255,255,0.05)' }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                          </div>
                        );
                      }
                      if (section.type === 'summary') {
                        // Remove the heading for copy/audio
                        const summaryText = section.content.replace(/^### 📝 Summary\s*/, '').trim();
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="flex-1">
                              <ReactMarkdown
                                components={{
                                  a: ({node, ...props}) => <a {...props} className="underline text-[#a020f0] hover:text-[#c04cfb]" target="_blank" rel="noopener noreferrer"/>,
                                }}
                              >
                                {section.content}
                              </ReactMarkdown>
                            </div>
                            <button
                              title="Copy Summary"
                              onClick={() => {
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(summaryText);
                                }
                              }}
                              className="p-1 rounded hover:bg-white/10 focus:outline-none border border-white/10"
                              style={{ background: 'rgba(255,255,255,0.05)' }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                            <button
                              title="Read Summary Aloud"
                              onClick={() => {
                                if ('speechSynthesis' in window) {
                                  window.speechSynthesis.cancel();
                                  const utterance = new window.SpeechSynthesisUtterance(summaryText);
                                  utterance.rate = 1;
                                  utterance.pitch = 1;
                                  utterance.lang = 'en-US';
                                  window.speechSynthesis.speak(utterance);
                                }
                              }}
                              className="p-1 rounded hover:bg-white/10 focus:outline-none border border-white/10"
                              style={{ background: 'rgba(255,255,255,0.05)' }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                            </button>
                          </div>
                        );
                      }
                      // Other section: render as normal
                      return (
                        <ReactMarkdown
                          key={idx}
                          components={{
                            a: ({node, ...props}) => <a {...props} className="underline text-[#a020f0] hover:text-[#c04cfb]" target="_blank" rel="noopener noreferrer"/>,
                          }}
                        >
                          {section.content}
                        </ReactMarkdown>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-6 py-4 shadow-lg bg-[#23263A] text-white max-w-[60%] flex items-center gap-4">
                  {/* Flipping Bot Loader */}
                  <span className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="animate-botflip" style={{width: '2.5rem', height: '2.5rem'}} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="10" y="18" width="28" height="18" rx="6" fill="#60A5FA" stroke="#4F46E5" strokeWidth="2"/>
                      <ellipse cx="24" cy="18" rx="8" ry="6" fill="#4F46E5"/>
                      <circle cx="18" cy="27" r="2.5" fill="#fff"/>
                      <circle cx="30" cy="27" r="2.5" fill="#fff"/>
                      <rect x="21" y="32" width="6" height="2.5" rx="1.2" fill="#fff"/>
                      <rect x="22.5" y="10" width="3" height="8" rx="1.5" fill="#60A5FA" stroke="#4F46E5" strokeWidth="1.2"/>
                      <circle cx="24" cy="10" r="2.5" fill="#fff" stroke="#4F46E5" strokeWidth="1.2"/>
                    </svg>
                    <style>{`
                      @keyframes botflip {
                        0% { transform: rotateY(0deg); }
                        40% { transform: rotateY(180deg); }
                        60% { transform: rotateY(180deg); }
                        100% { transform: rotateY(360deg); }
                      }
                      .animate-botflip { animation: botflip 1.2s infinite cubic-bezier(.4,0,.2,1); transform-style: preserve-3d; }
                    `}</style>
                  </span>
                  <span className="text-base md:text-lg font-bold animate-pulse text-white">Thinking...</span>
                </div>
              </div>
            )}
          </div>
          {/* Chat Bar */}
          <form
            className="flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl px-4 py-4 mx-2 sm:mx-4 mb-6 w-full sticky bottom-0 z-20"
            style={{ alignSelf: 'center' }}
            onSubmit={e => { e.preventDefault(); sendMessage(); }}
          >
            <div className="flex items-center mr-3">
              <button
                type="button"
                className={`px-2.5 py-1.5 text-sm rounded-l-full font-medium transition-colors border border-r-0 border-neutral-700 focus:outline-none ${chatMode === 'suggestion' ? 'bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] text-white font-bold shadow' : 'bg-black/60 text-neutral-200 hover:bg-gradient-to-r hover:from-[#60A5FA]/60 hover:to-[#4F46E5]/60'}`}
                aria-pressed={chatMode === 'suggestion'}
                onClick={() => handleChatModeChange('suggestion')}
              >
                Book Suggestion
              </button>
              <button
                type="button"
                className={`px-2.5 py-1.5 text-sm rounded-r-full font-medium transition-colors border border-neutral-700 focus:outline-none ${chatMode === 'summary' ? 'bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] text-white font-bold shadow' : 'bg-black/60 text-neutral-200 hover:bg-gradient-to-r hover:from-[#60A5FA]/60 hover:to-[#4F46E5]/60'}`}
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
              className="rounded-full bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] hover:from-[#60A5FA] hover:to-[#4F46E5] text-white p-3 shadow-lg min-w-[44px] min-h-[44px] flex items-center justify-center border border-white/20 backdrop-blur font-bold transition-colors duration-200"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  )
} 
