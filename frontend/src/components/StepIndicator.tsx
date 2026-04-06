'use client';

import React from 'react';
import { WizardStep } from '@/lib/types';

interface StepIndicatorProps {
  currentStep: WizardStep;
}

const STEPS = [
  { num: 1, label: 'Upload' },
  { num: 2, label: 'Map Columns' },
  { num: 3, label: 'Settings' },
  { num: 4, label: 'Generate' },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="steps">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.num}>
          <div
            className={`step ${
              step.num < currentStep ? 'done' : step.num === currentStep ? 'active' : ''
            }`}
          >
            <div className="step-num">
              {step.num < currentStep ? '✓' : step.num}
            </div>
            <div className="step-label">{step.label}</div>
          </div>
          {i < STEPS.length - 1 && <div className="step-line" />}
        </React.Fragment>
      ))}
    </div>
  );
}
