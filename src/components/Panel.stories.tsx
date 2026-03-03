import type { Meta, StoryObj } from '@storybook/react-vite';
import { Panel } from './Panel';
import { Text } from './Text';
import { Heading } from './Heading';

const meta = {
  title: 'Components/Panel',
  component: Panel,
  argTypes: {
    status: {
      control: 'select',
      options: ['none', 'alert', 'warning', 'primary', 'secondary'],
    },
    divider: { control: 'boolean' },
  },
  args: {
    children: 'Panel content goes here.',
    status: 'none',
    divider: false,
  },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Panel {...args}>
      <Text variant="primary">Default panel with no status indicator.</Text>
    </Panel>
  ),
};

export const WithDivider: Story = {
  args: { divider: true },
  render: (args) => (
    <Panel {...args}>
      <Text variant="primary">Panel with a top divider line.</Text>
    </Panel>
  ),
};

export const StatusAlert: Story = {
  args: { status: 'alert' },
  render: (args) => (
    <Panel {...args}>
      <Text variant="alert">Alert status — left border indicator.</Text>
    </Panel>
  ),
};

export const StatusWarning: Story = {
  args: { status: 'warning' },
  render: (args) => (
    <Panel {...args}>
      <Text variant="warning">Warning status — left border indicator.</Text>
    </Panel>
  ),
};

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
      {(['none', 'alert', 'warning', 'primary', 'secondary'] as const).map((status) => (
        <Panel key={status} status={status}>
          <Heading size="sm">{status}</Heading>
          <Text variant="secondary">Panel content for {status} status.</Text>
        </Panel>
      ))}
    </div>
  ),
};
