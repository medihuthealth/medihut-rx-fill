'use client';

import React from 'react';
import { ColumnMapping, FIELD_MAPPINGS } from '@/lib/types';

interface ColumnMappingProps {
  headers: string[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

export default function ColumnMappingPanel({
  headers,
  mapping,
  onMappingChange,
}: ColumnMappingProps) {
  const handleChange = (key: keyof ColumnMapping, value: string) => {
    onMappingChange({
      ...mapping,
      [key]: value === '' ? -1 : parseInt(value),
    });
  };

  return (
    <div className="panel">
      <div className="panel-title">Column Mapping</div>
      <p className="help-note" style={{ marginBottom: 12 }}>
        Map which columns in your file contain each data point. Auto-detected where possible.
      </p>
      <div className="map-grid">
        {FIELD_MAPPINGS.map((field) => {
          const currentValue = mapping[field.key];
          const isMatched = currentValue >= 0;

          return (
            <div key={field.key} className="map-row">
              <div className="map-label">{field.label}</div>
              <select
                className={`map-select ${isMatched ? 'ok' : ''}`}
                value={currentValue >= 0 ? currentValue.toString() : ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
              >
                <option value="">— skip —</option>
                {headers.map((h, i) => (
                  <option key={i} value={i.toString()}>
                    {h || `Col ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
