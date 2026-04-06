'use client';

import React from 'react';
import { LogEntry } from '@/lib/types';

interface ProgressPanelProps {
  processedRows: number;
  totalRows: number;
  logs: LogEntry[];
}

export default function ProgressPanel({
  processedRows,
  totalRows,
  logs,
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
      <div className="log-wrap">
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
