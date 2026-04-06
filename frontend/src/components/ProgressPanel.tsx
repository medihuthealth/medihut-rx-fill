'use client';

import React from 'react';
import { LogEntry } from '@/lib/types';
import { getDownloadUrl } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  // Format data for Recharts
  const chartData = tokenUsageData.map((d) => ({
    name: `Batch ${d.batch}`,
    tokens: d.tokens,
  }));

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

      {(generating || chartData.length > 0) && (
        <div style={{ marginTop: '24px', marginBottom: '16px' }}>
          <div className="progress-title" style={{ marginBottom: '16px' }}>API Token Consumption per Batch</div>
          <div style={{ width: '100%', height: 220, marginLeft: '-24px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: "'DM Mono', monospace" }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: "'DM Mono', monospace" }} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--surface2)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    fontSize: '11px',
                    fontFamily: "'DM Mono', monospace",
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: 'var(--accent)', fontWeight: 600 }}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="tokens" 
                  stroke="var(--accent)" 
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--surface)', stroke: 'var(--accent)', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </LineChart>
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
