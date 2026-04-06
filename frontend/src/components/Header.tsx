'use client';

import React from 'react';
import Image from 'next/image';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="header">
      <Image
        src="/medihut-logo.png"
        alt="Medihut"
        height={36}
        width={160}
        style={{ height: 36, width: 'auto', objectFit: 'contain' }}
        className="header-logo-img"
        priority
      />

      <div className="header-divider" />
      <span className="header-subtitle">RxFill · Catalog Auto-Generator</span>

      <div className="header-right">
        <span className="header-badge">v5 · NestJS</span>

        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
