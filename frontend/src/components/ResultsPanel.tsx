'use client';

import React from 'react';
import { getDownloadUrl } from '@/lib/api';
import { PROVIDERS, AiProvider } from '@/lib/types';

interface ResultsPanelProps {
  provider: AiProvider;
  totalRows: number;
  filledCount: number;
  needReview: number;
  downloadId: string;
}

export default function ResultsPanel({
  provider,
  totalRows,
  filledCount,
  needReview,
  downloadId,
}: ResultsPanelProps) {
  const handleDownload = () => {
    const url = getDownloadUrl(downloadId);
    window.open(url, '_blank');
  };

  return (
    <div className="panel panel--success">
      <div className="results-header">
        <div className="results-icon">✅</div>
        <div>
          <div className="results-title">Catalog Ready</div>
          <div className="results-sub">
            {totalRows} medicines · 30 columns · via {PROVIDERS[provider].name}
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat">
          <div className="stat-value">{totalRows}</div>
          <div className="stat-label">Total rows</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{filledCount}</div>
          <div className="stat-label">AI-filled</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: 'var(--accent3)' }}>{needReview}</div>
          <div className="stat-label">Need review</div>
        </div>
        <div className="stat">
          <div className="stat-value">30</div>
          <div className="stat-label">Columns</div>
        </div>
      </div>

      <button className="download-btn" onClick={handleDownload}>
        ⬇ Download Excel — 30 Columns, Exact Required Format
      </button>
    </div>
  );
}
