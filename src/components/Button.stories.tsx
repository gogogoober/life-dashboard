import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'ghost'],
    },
    status: {
      control: 'select',
      options: ['alert', 'warning', 'primary'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
    disabled: { control: 'boolean' },
  },
  args: {
    children: 'Button',
    variant: 'ghost',
    status: 'primary',
    size: 'md',
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const GhostDefault: Story = {
  args: { variant: 'ghost', children: 'Ghost Button' },
};

export const PrimaryAlert: Story = {
  args: { variant: 'primary', status: 'alert', children: 'Alert Action' },
};

export const PrimaryWarning: Story = {
  args: { variant: 'primary', status: 'warning', children: 'Warning Action' },
};

export const PrimaryDefault: Story = {
  args: { variant: 'primary', status: 'primary', children: 'Primary Action' },
};

export const SmallSize: Story = {
  args: { size: 'sm', children: 'Small' },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a7a5a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ghost</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost">Ghost</Button>
          <Button variant="ghost" disabled>Ghost Disabled</Button>
        </div>
      </div>
      <div>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a7a5a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Primary</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" status="primary">Primary</Button>
          <Button variant="primary" status="warning">Warning</Button>
          <Button variant="primary" status="alert">Alert</Button>
        </div>
      </div>
      <div>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a7a5a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sizes</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button variant="primary" status="primary" size="sm">Small</Button>
          <Button variant="primary" status="primary" size="md">Medium</Button>
        </div>
      </div>
    </div>
  ),
};
