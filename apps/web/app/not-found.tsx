import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-black mb-4" style={{ color: '#CCFF00' }}>404</h1>
      <h2 className="text-2xl font-bold mb-6">Page Not Found</h2>
      <p className="text-gray-400 mb-8 max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link 
        href="/" 
        className="px-6 py-2 bg-[#CCFF00] text-black font-bold rounded-lg"
      >
        Go Back Home
      </Link>
    </div>
  );
}
