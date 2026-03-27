'use client';

import { useState, useRef, useEffect } from 'react';

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function CustomSelect({ options, value, onChange, className = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="input-field flex items-center justify-between !rounded-2xl cursor-pointer text-left"
        type="button"
      >
        <span className="truncate">{value}</span>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ml-2 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--text-secondary)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute z-[100] w-full mt-2 glass-strong overflow-hidden shadow-2xl animate-fade-in"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xl)' }}
        >
          <div className="max-h-60 overflow-y-auto py-2 custom-scrollbar">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[var(--volt-dim)] hover:text-[var(--volt)] ${
                  value === option ? 'bg-[var(--volt-dim)] text-[var(--volt)] font-bold' : 'text-[var(--text-primary)]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
