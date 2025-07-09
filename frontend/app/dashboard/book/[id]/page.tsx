"use client";
import styles from "../../../chat/chatbg.module.css";
import { useParams } from "next/navigation";
import Link from "next/link";

const books = [
  { id: "1", title: "Atomic Habits", author: "James Clear", description: "A guide to building good habits and breaking bad ones.", year: 2018 },
  { id: "2", title: "Deep Work", author: "Cal Newport", description: "Rules for focused success in a distracted world.", year: 2016 },
  { id: "3", title: "The Pragmatic Programmer", author: "Andrew Hunt, David Thomas", description: "Your journey to mastery as a modern developer.", year: 1999 },
];

export default function BookDetailPage() {
  const params = useParams();
  const book = books.find(b => b.id === params.id);

  if (!book) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen w-full ${styles.animatedBg}`}>
        <div className="bg-black/70 rounded-3xl shadow-2xl p-8 max-w-lg w-full flex flex-col items-center">
          <h1 className="text-2xl font-bold text-white mb-2">Book Not Found</h1>
          <Link href="/dashboard" className="text-[#a020f0] hover:underline mt-4">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen w-full ${styles.animatedBg}`}>
      <div className="bg-black/70 rounded-3xl shadow-2xl p-8 max-w-lg w-full flex flex-col items-center">
        <h1 className="text-3xl font-extrabold text-white mb-2 drop-shadow">{book.title}</h1>
        <p className="text-lg text-neutral-300 mb-2">by {book.author}</p>
        <p className="text-base text-neutral-200 mb-4">Published: {book.year}</p>
        <p className="text-white mb-6 text-center">{book.description}</p>
        <Link href="/dashboard" className="text-[#a020f0] hover:underline font-bold">Back to Dashboard</Link>
      </div>
    </div>
  );
} 