'use client';

import React from 'react';

interface SettingsProps {
  batchSize: number;
  outputFileName: string;
  onBatchSizeChange: (size: number) => void;
  onOutputFileNameChange: (name: string) => void;
}

export default function Settings({
  batchSize,
  outputFileName,
  onBatchSizeChange,
  onOutputFileNameChange,
}: SettingsProps) {
  return (
    <div className="panel">
      <div className="panel-title">Settings</div>
      <div className="settings-row">
        <div className="setting-item">
          <div className="setting-label">Batch size (medicines per call)</div>
          <select
            className="setting-select"
            value={batchSize}
            onChange={(e) => onBatchSizeChange(parseInt(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={8}>8</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </select>
        </div>
        <div className="setting-item">
          <div className="setting-label">Output filename</div>
          <input
            type="text"
            className="setting-input"
            value={outputFileName}
            onChange={(e) => onOutputFileNameChange(e.target.value)}
          />
        </div>
      </div>
      <p className="help-note" style={{ marginTop: 10 }}>
        API keys are sent to the backend for processing. They are stored only in-memory during the request and in your browser&apos;s localStorage.
      </p>
    </div>
  );
}
