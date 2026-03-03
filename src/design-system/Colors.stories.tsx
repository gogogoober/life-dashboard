import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { canvasColors, hue } from './canvas';

/* ── Swatch Component ─────────────────────────────────────── */

function Swatch({ name, color, wide }: { name: string; color: string; wide?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: wide ? 120 : 80 }}>
      <div
        style={{
          width: '100%',
          height: 48,
          borderRadius: 8,
          background: color,
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      />
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#c8d8c8', wordBreak: 'break-all' }}>
        {name}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a7a5a' }}>
        {color}
      </span>
    </div>
  );
}

/* ── Group wrapper ────────────────────────────────────────── */

function ColorGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
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
        {title}
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{children}</div>
    </div>
  );
}

/* ── CSS Variable reader ──────────────────────────────────── */

function CSSVariableSwatch({ varName, wide }: { varName: string; wide?: boolean }) {
  const [resolved, setResolved] = useState('');

  useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    setResolved(raw);
  }, [varName]);

  return <Swatch name={varName} color={resolved || '#000'} wide={wide} />;
}

function CSSRGBSwatch({ varName }: { varName: string }) {
  const [resolved, setResolved] = useState('');

  useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    setResolved(`rgb(${raw})`);
  }, [varName]);

  return <Swatch name={varName} color={resolved || '#000'} />;
}

/* ── Stories ───────────────────────────────────────────────── */

const meta = {
  title: 'Design System/Colors',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

export const Background: StoryObj = {
  render: () => (
    <ColorGroup title="Background">
      <Swatch name="--bg-base" color={canvasColors.bg.base} />
      <CSSRGBSwatch varName="--bg-surface" />
      <CSSRGBSwatch varName="--bg-surface-secondary" />
      <CSSRGBSwatch varName="--bg-surface-alert" />
      <CSSRGBSwatch varName="--bg-surface-warning" />
    </ColorGroup>
  ),
};

export const TextColors: StoryObj = {
  name: 'Text',
  render: () => (
    <ColorGroup title="Text">
      {Object.entries(canvasColors.text).map(([name, color]) => (
        <Swatch key={name} name={`--text-${name}`} color={color} />
      ))}
    </ColorGroup>
  ),
};

export const Status: StoryObj = {
  render: () => (
    <ColorGroup title="Status">
      {Object.entries(canvasColors.status).map(([name, color]) => (
        <Swatch key={name} name={`--status-${name}`} color={color} />
      ))}
    </ColorGroup>
  ),
};

export const Categories: StoryObj = {
  render: () => (
    <>
      {Object.entries(canvasColors.category).map(([category, tiers]) => (
        <ColorGroup key={category} title={`Category: ${category}`}>
          {Object.entries(tiers).map(([tier, color]) => (
            <Swatch key={tier} name={`--category-${category}-${tier}`} color={color} />
          ))}
        </ColorGroup>
      ))}
    </>
  ),
};

export const Borders: StoryObj = {
  name: 'Border Colors',
  render: () => (
    <ColorGroup title="Border Colors">
      {Object.entries(canvasColors.border).map(([name, color]) => (
        <Swatch key={name} name={`--border-${name}`} color={color} wide />
      ))}
      <Swatch name="grid" color={canvasColors.grid} wide />
    </ColorGroup>
  ),
};

export const HueScale: StoryObj = {
  name: 'Hue Scale (0-100)',
  render: () => {
    const steps = Array.from({ length: 21 }, (_, i) => i * 5);
    return (
      <div>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#5a7a5a', marginBottom: 16 }}>
          Linear hue function: 0 = urgent/alert, 100 = calm/dormant
        </p>
        <div style={{ display: 'flex', gap: 2 }}>
          {steps.map((v) => (
            <div key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 32,
                  height: 48,
                  borderRadius: 4,
                  background: hue(v),
                }}
              />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#5a7a5a' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
