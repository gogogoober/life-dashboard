import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { Heading } from '../components/Heading';
import { Text } from '../components/Text';
import { Label } from '../components/Label';

const meta = {
  title: 'Design System/Typography',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

function TypeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginBottom: 16 }}>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: '#5a7a5a',
          width: 120,
          flexShrink: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function SpecLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: '#3a5a3a',
        marginLeft: 16,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export const HeadingScale: StoryObj = {
  name: 'Heading Scale',
  render: () => (
    <div>
      <TypeRow label="heading-lg">
        <Heading size="lg">Heading Large</Heading>
        <SpecLabel>18px / 700 / uppercase / 0.15em</SpecLabel>
      </TypeRow>
      <TypeRow label="heading-md">
        <Heading size="md">Heading Medium</Heading>
        <SpecLabel>13px / 600 / uppercase / 0.12em</SpecLabel>
      </TypeRow>
      <TypeRow label="heading-sm">
        <Heading size="sm">Heading Small</Heading>
        <SpecLabel>11px / 600 / uppercase / 0.08em</SpecLabel>
      </TypeRow>
    </div>
  ),
};

export const BodyScale: StoryObj = {
  name: 'Body Scale',
  render: () => (
    <div>
      <TypeRow label="body-primary">
        <Text variant="primary">Body Primary — The quick brown fox jumps over the lazy dog.</Text>
        <SpecLabel>11px / 500</SpecLabel>
      </TypeRow>
      <TypeRow label="body-secondary">
        <Text variant="secondary">Body Secondary — The quick brown fox jumps over the lazy dog.</Text>
        <SpecLabel>11px / 400 / 1.5 line-height</SpecLabel>
      </TypeRow>
    </div>
  ),
};

export const LabelScale: StoryObj = {
  name: 'Label Scale',
  render: () => (
    <div>
      <TypeRow label="label-emphasis">
        <Label variant="emphasis">Label Emphasis</Label>
        <SpecLabel>12px / 700 / capitalize</SpecLabel>
      </TypeRow>
      <TypeRow label="label-primary">
        <Label variant="primary">Label Primary</Label>
        <SpecLabel>11px / 600 / capitalize</SpecLabel>
      </TypeRow>
      <TypeRow label="label-secondary">
        <Label variant="secondary">Label Secondary</Label>
        <SpecLabel>11px / 400 / capitalize</SpecLabel>
      </TypeRow>
    </div>
  ),
};

export const TextVariants: StoryObj = {
  name: 'Text Color Variants',
  render: () => (
    <div>
      {(['emphasis', 'primary', 'secondary', 'tertiary', 'alert', 'warning'] as const).map((variant) => (
        <TypeRow key={variant} label={variant}>
          <Text variant={variant}>The quick brown fox jumps over the lazy dog.</Text>
        </TypeRow>
      ))}
    </div>
  ),
};

export const FontStack: StoryObj = {
  name: 'Font Stack',
  render: () => (
    <div>
      <TypeRow label="font-primary">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#c8d8c8' }}>
          JetBrains Mono
        </span>
      </TypeRow>
      <div style={{ marginTop: 16 }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#5a7a5a', marginBottom: 8 }}>
          Character set:
        </p>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#c8d8c8', lineHeight: 1.8 }}>
          ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
          abcdefghijklmnopqrstuvwxyz<br />
          0123456789<br />
          !@#$%^&amp;*()-_=+[]{'{}'}|;:&apos;,&lt;.&gt;/?
        </p>
      </div>
    </div>
  ),
};
