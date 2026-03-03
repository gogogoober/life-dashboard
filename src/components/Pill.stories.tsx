import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pill } from './Pill';

const meta = {
  title: 'Components/Pill',
  component: Pill,
  argTypes: {
    position: {
      control: 'select',
      options: ['overlay', 'inline'],
    },
    status: {
      control: 'select',
      options: ['alert', 'warning', 'primary', 'secondary'],
    },
  },
  args: {
    children: '3 days',
    position: 'inline',
    status: 'primary',
  },
} satisfies Meta<typeof Pill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InlineAlert: Story = { args: { position: 'inline', status: 'alert', children: 'Overdue' } };
export const InlineWarning: Story = { args: { position: 'inline', status: 'warning', children: '2 days' } };
export const InlinePrimary: Story = { args: { position: 'inline', status: 'primary', children: '5 days' } };
export const InlineSecondary: Story = { args: { position: 'inline', status: 'secondary', children: '30 days' } };

export const OverlayAlert: Story = { args: { position: 'overlay', status: 'alert', children: 'Urgent' } };
export const OverlayWarning: Story = { args: { position: 'overlay', status: 'warning', children: 'Soon' } };
export const OverlayPrimary: Story = { args: { position: 'overlay', status: 'primary', children: 'On track' } };

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a7a5a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Inline</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill position="inline" status="alert">Alert</Pill>
          <Pill position="inline" status="warning">Warning</Pill>
          <Pill position="inline" status="primary">Primary</Pill>
          <Pill position="inline" status="secondary">Secondary</Pill>
        </div>
      </div>
      <div>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a7a5a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overlay</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill position="overlay" status="alert">Alert</Pill>
          <Pill position="overlay" status="warning">Warning</Pill>
          <Pill position="overlay" status="primary">Primary</Pill>
          <Pill position="overlay" status="secondary">Secondary</Pill>
        </div>
      </div>
    </div>
  ),
};
