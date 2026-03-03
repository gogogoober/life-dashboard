import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

const meta = {
  title: 'Design System/Borders',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: '#c8d8c8',
        marginBottom: 12,
      }}
    >
      {children}
    </h3>
  );
}

function TokenLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a7a5a' }}>
      {children}
    </span>
  );
}

export const BorderColors: StoryObj = {
  name: 'Border Colors',
  render: () => {
    const borders = [
      { name: '--border-emphasis', color: 'rgba(46, 204, 113, 0.4)' },
      { name: '--border-primary', color: 'rgba(40, 70, 40, 0.25)' },
      { name: '--border-secondary', color: 'rgba(40, 70, 40, 0.12)' },
      { name: '--border-alert', color: 'rgba(232, 93, 53, 0.35)' },
      { name: '--border-warning', color: 'rgba(232, 167, 53, 0.3)' },
    ];

    return (
      <div>
        <SectionTitle>Border Colors</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {borders.map(({ name, color }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 200,
                  height: 48,
                  borderRadius: 8,
                  border: `2px solid ${color}`,
                  background: 'rgba(10, 18, 10, 0.45)',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TokenLabel>{name}</TokenLabel>
                <TokenLabel>{color}</TokenLabel>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const BorderRadius: StoryObj = {
  name: 'Border Radius',
  render: () => {
    const radii = [
      { name: '--radius-emphasis', value: '24px', label: 'Capsule pills' },
      { name: '--radius-primary', value: '16px', label: 'Standard rounded' },
      { name: '--radius-secondary', value: '8px', label: 'Moderate' },
      { name: '--radius-tertiary', value: '4px', label: 'Barely rounded' },
    ];

    return (
      <div>
        <SectionTitle>Border Radius</SectionTitle>
        <div style={{ display: 'flex', gap: 24 }}>
          {radii.map(({ name, value, label }) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: value,
                  border: '1px solid rgba(46, 204, 113, 0.4)',
                  background: 'rgba(10, 18, 10, 0.45)',
                }}
              />
              <TokenLabel>{name}</TokenLabel>
              <TokenLabel>{value}</TokenLabel>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#3a5a3a' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const BorderWidths: StoryObj = {
  name: 'Border Widths',
  render: () => {
    const widths = [
      { name: '--border-width-emphasis', value: '2px' },
      { name: '--border-width-primary', value: '1px' },
      { name: '--border-width-secondary', value: '0.5px' },
    ];

    return (
      <div>
        <SectionTitle>Border Widths</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {widths.map(({ name, value }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 200,
                  height: 0,
                  borderTop: `${value} solid rgba(46, 204, 113, 0.4)`,
                }}
              />
              <TokenLabel>{name}: {value}</TokenLabel>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
