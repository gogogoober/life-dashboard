import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

const meta = {
  title: 'Design System/Elevation',
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

function ElevationCard({ name, shadow, bg }: { name: string; shadow: string; bg?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 120,
          height: 80,
          borderRadius: 12,
          background: bg || 'rgba(10, 18, 10, 0.45)',
          border: '1px solid rgba(40, 70, 40, 0.25)',
          boxShadow: shadow,
        }}
      />
      <TokenLabel>{name}</TokenLabel>
    </div>
  );
}

export const Shadows: StoryObj = {
  render: () => (
    <div>
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Surface Shadows</SectionTitle>
        <div style={{ display: 'flex', gap: 24 }}>
          <ElevationCard name="surface-emphasis" shadow="0 4px 24px rgba(0, 0, 0, 0.4)" />
          <ElevationCard name="surface-primary" shadow="0 2px 12px rgba(0, 0, 0, 0.25)" />
          <ElevationCard name="surface-secondary" shadow="0 1px 6px rgba(0, 0, 0, 0.15)" />
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Overlay Shadows</SectionTitle>
        <div style={{ display: 'flex', gap: 24 }}>
          <ElevationCard name="overlay-emphasis" shadow="0 6px 30px rgba(0, 0, 0, 0.5)" />
          <ElevationCard name="overlay-primary" shadow="0 4px 20px rgba(0, 0, 0, 0.3)" />
          <ElevationCard name="overlay-secondary" shadow="0 2px 10px rgba(0, 0, 0, 0.2)" />
        </div>
      </div>

      <div>
        <SectionTitle>Pill Shadows</SectionTitle>
        <div style={{ display: 'flex', gap: 24 }}>
          <ElevationCard name="pill-emphasis" shadow="0 0 16px rgba(0, 0, 0, 0.15)" />
          <ElevationCard name="pill-primary" shadow="0 0 10px rgba(0, 0, 0, 0.1)" />
          <ElevationCard name="pill-secondary" shadow="none" />
        </div>
      </div>
    </div>
  ),
};

export const Glows: StoryObj = {
  render: () => (
    <div>
      <SectionTitle>Status Glows</SectionTitle>
      <div style={{ display: 'flex', gap: 24 }}>
        <ElevationCard name="glow-alert" shadow="0 0 20px rgba(232, 93, 53, 0.35)" bg="rgba(232, 93, 53, 0.1)" />
        <ElevationCard name="glow-warning" shadow="0 0 16px rgba(232, 167, 53, 0.2)" bg="rgba(232, 167, 53, 0.1)" />
        <ElevationCard name="glow-primary" shadow="0 0 12px rgba(46, 204, 113, 0.15)" bg="rgba(46, 204, 113, 0.1)" />
        <ElevationCard name="glow-secondary" shadow="0 0 8px rgba(26, 138, 74, 0.08)" bg="rgba(26, 138, 74, 0.05)" />
      </div>
    </div>
  ),
};

export const Opacity: StoryObj = {
  render: () => {
    const groups = [
      {
        title: 'Surface Opacity',
        tokens: [
          { name: 'emphasis', value: 0.65 },
          { name: 'primary', value: 0.45 },
          { name: 'secondary', value: 0.30 },
          { name: 'tertiary', value: 0.15 },
        ],
      },
      {
        title: 'Overlay Opacity',
        tokens: [
          { name: 'emphasis', value: 0.60 },
          { name: 'primary', value: 0.45 },
          { name: 'secondary', value: 0.25 },
          { name: 'tertiary', value: 0.12 },
        ],
      },
      {
        title: 'Pill Opacity',
        tokens: [
          { name: 'emphasis', value: 0.55 },
          { name: 'primary', value: 0.40 },
          { name: 'secondary', value: 0.25 },
          { name: 'tertiary', value: 0.12 },
        ],
      },
    ];

    return (
      <div>
        {groups.map(({ title, tokens }) => (
          <div key={title} style={{ marginBottom: 32 }}>
            <SectionTitle>{title}</SectionTitle>
            <div style={{ display: 'flex', gap: 16 }}>
              {tokens.map(({ name, value }) => (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 80,
                      height: 60,
                      borderRadius: 8,
                      background: `rgba(10, 18, 10, ${value})`,
                      border: '1px solid rgba(40, 70, 40, 0.25)',
                    }}
                  />
                  <TokenLabel>{name}</TokenLabel>
                  <TokenLabel>{value}</TokenLabel>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  },
};

export const Blur: StoryObj = {
  render: () => (
    <div>
      <SectionTitle>Blur</SectionTitle>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 120,
              height: 80,
              borderRadius: 12,
              background: 'rgba(10, 18, 10, 0.3)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(40, 70, 40, 0.25)',
            }}
          />
          <TokenLabel>--blur-surface: 16px</TokenLabel>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 120,
              height: 80,
              borderRadius: 12,
              background: 'rgba(10, 18, 10, 0.3)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(40, 70, 40, 0.25)',
            }}
          />
          <TokenLabel>--blur-overlay: 24px</TokenLabel>
        </div>
      </div>
    </div>
  ),
};
