'use client';

import React from 'react';
import { LogEntry } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProgressPanelProps {
  processedRows: number;
  totalRows: number;
  logs: LogEntry[];
  tokenUsageData?: { batch: number; tokens: number }[];
}

export default function ProgressPanel({
  processedRows,
  totalRows,
  logs,
  tokenUsageData = [],
}: ProgressPanelProps) {
  const progress = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0;

  return (
    <div className="panel">
      <div className="progress-header">
        <div className="progress-title">Filling Pharmaceutical Data</div>
        <div className="progress-count">{processedRows} / {totalRows}</div>
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
          </div>
        ))}
      </div>
    </div>
  );
}
