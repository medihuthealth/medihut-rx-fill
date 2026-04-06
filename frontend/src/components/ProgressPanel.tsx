'use client';

import React from 'react';
import { LogEntry } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDownloadUrl } from '@/lib/api';

interface ProgressPanelProps {
  processedRows: number;
  totalRows: number;
  logs: LogEntry[];
  tokenUsageData?: { batch: number; tokens: number }[];
  isPaused?: boolean;
  onPauseToggle?: () => void;
  generating?: boolean;
}

export default function ProgressPanel({
  processedRows,
  totalRows,
  logs,
  tokenUsageData = [],
  isPaused = false,
  onPauseToggle,
  generating = false,
}: ProgressPanelProps) {
  const progress = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0;

  return (
    <div className="panel">
      <div className="progress-header">
        <div className="progress-title">Filling Pharmaceutical Data</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="progress-count">{processedRows} / {totalRows}</div>
          {generating && onPauseToggle && (
            <button 
              onClick={onPauseToggle}
              style={{
                background: isPaused ? 'var(--surface2)' : 'rgba(255, 77, 109, 0.1)',
                border: `1px solid ${isPaused ? 'var(--accent)' : 'rgba(255, 77, 109, 0.4)'}`,
                color: isPaused ? 'var(--accent)' : 'var(--danger)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: "'DM Mono', monospace"
              }}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
        </div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {tokenUsageData.length > 0 && (
        <div style={{ marginTop: '20px', marginBottom: '10px' }}>
          <div className="progress-title" style={{ marginBottom: '15px' }}>API Token Consumption per Batch</div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokenUsageData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="batch" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                  labelStyle={{ color: 'var(--color-text-secondary)' }}
                />
                <Bar dataKey="tokens" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="log-wrap" style={{ marginTop: '20px' }}>
        {logs.map((log) => (
          <div key={log.id} className="log-row">
            <div className={`log-dot ${log.status}`} />
            <div className="log-text">{log.message}</div>
            <div className={`log-badge ${log.status}`}>
              {log.status.toUpperCase()}
            </div>
            {log.downloadId && (
              <a 
                href={getDownloadUrl(log.downloadId)} 
                target="_blank" 
                rel="noreferrer"
                style={{
                  textDecoration: 'none',
                  fontSize: '10px',
                  color: 'var(--accent2)',
                  fontFamily: "'DM Mono', monospace",
                  border: '1px solid rgba(123, 92, 240, 0.3)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  marginLeft: '4px',
                  background: 'rgba(123, 92, 240, 0.05)'
                }}
              >
                ⤓ DL BATCH
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
