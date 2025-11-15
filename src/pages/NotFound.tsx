import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBF5EE] px-6 py-16 text-center text-[#3B2B1A]">
      <div className="max-w-md space-y-6 rounded-[20px] border border-[rgba(226,185,127,0.3)] bg-white px-8 py-10 shadow-[0_24px_48px_-30px_rgba(59,43,26,0.25)]">
        <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Page not found</p>
        <h1 className="text-[2.2rem] font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>
          Oops, that page has crumbled.
        </h1>
        <p className="text-sm text-[#6B5E57]">
          The link you followed doesn&apos;t exist anymore. Let&apos;s get you back to the cookie counter.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/cookies"
            className="inline-flex items-center justify-center rounded-[12px] bg-[#C47A41] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(196,122,65,0.26)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B2B1A]"
          >
            Browse cookies
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-[#FFF7F0] px-5 py-2.5 text-sm font-semibold text-[#6B5E57] transition-colors duration-150 hover:bg-[#FFF0E4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
