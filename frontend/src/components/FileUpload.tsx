'use client';

import React, { useRef, useState, useCallback } from 'react';
import { uploadFile } from '@/lib/api';
import { UploadResponse } from '@/lib/types';

interface FileUploadProps {
  onUploadComplete: (data: UploadResponse) => void;
  onReset: () => void;
  uploadId: string | null;
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
}

export default function FileUpload({
  onUploadComplete,
  onReset,
  uploadId,
  fileName,
  fileSize,
  rowCount,
  columnCount,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Upload .xlsx, .xls, or .csv files only');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await uploadFile(file);
      onUploadComplete(result);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (uploadId) {
    return (
      <div className="panel">
        <div className="file-card-inner">
          <div className="file-icon">📊</div>
          <div className="file-meta">
            <div className="file-name">{fileName}</div>
            <div className="file-stats">
              {rowCount} rows · {columnCount} columns · {(fileSize / 1024).toFixed(1)} KB
            </div>
          </div>
          <button className="file-remove" onClick={onReset}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`drop-zone ${isDragging ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <span className="drop-zone-icon">{uploading ? '⏳' : '📋'}</span>
        <h3>{uploading ? 'Uploading & Parsing...' : 'Drop your Stock Report here'}</h3>
        <p>Drag & drop your Excel or CSV, or click to browse</p>
        <div className="file-tags">
          <span className="file-tag">.xlsx</span>
          <span className="file-tag">.xls</span>
          <span className="file-tag">.csv</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </div>
      {error && <div className="error-msg">⚠ {error}</div>}
    </>
  );
}
