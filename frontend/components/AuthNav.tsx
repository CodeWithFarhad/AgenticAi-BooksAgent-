import Link from 'next/link';

export default function AuthNav() {
  return (
    <div className="flex justify-end items-center w-full p-4 bg-black/30">
      <Link href="/signin">
        <button className="bg-black text-white font-bold py-2 px-6 rounded shadow hover:bg-neutral-900 transition-colors">
          Sign In / Sign Up
        </button>
      </Link>
    </div>
  );
} 