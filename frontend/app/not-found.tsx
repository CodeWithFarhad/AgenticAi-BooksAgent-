import Link from "next/link";
import styles from "./chat/chatbg.module.css";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#181A20]">
      <div className="bg-[#23263A] p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-5xl font-extrabold mb-4 text-white">404</h1>
        <p className="text-lg text-neutral-300 mb-6">This page could not be found.</p>
        <Link href="/discover">
          <button className="bg-[#a020f0] hover:bg-[#c04cfb] text-white font-bold py-2 px-6 rounded-2xl text-lg shadow transition-colors">Go to Home</button>
        </Link>
      </div>
    </div>
  );
} 