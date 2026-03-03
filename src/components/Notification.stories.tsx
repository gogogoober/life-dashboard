import type { Meta, StoryObj } from '@storybook/react-vite';
import { Notification } from './Notification';
import { Text } from './Text';
import { Heading } from './Heading';

const meta = {
  title: 'Components/Notification',
  component: Notification,
  argTypes: {
    status: {
      control: 'select',
      options: ['alert', 'warning', 'primary'],
    },
    shake: { control: 'boolean' },
    shakeInterval: { control: 'number' },
  },
  args: {
    status: 'primary',
    shake: false,
  },
} satisfies Meta<typeof Notification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Notification {...args}>
      <Heading size="sm">Notification</Heading>
      <Text variant="secondary">Something happened that you should know about.</Text>
    </Notification>
  ),
};

export const AlertNotification: Story = {
  args: { status: 'alert' },
  render: (args) => (
    <Notification {...args}>
      <Heading size="sm">Overdue Task</Heading>
      <Text variant="alert">This task is past its deadline.</Text>
    </Notification>
  ),
};

export const WarningNotification: Story = {
  args: { status: 'warning' },
  render: (args) => (
    <Notification {...args}>
      <Heading size="sm">Due Soon</Heading>
      <Text variant="warning">This task is due within 3 days.</Text>
    </Notification>
  ),
};

export const WithShake: Story = {
  args: { status: 'alert', shake: true, shakeInterval: 5000 },
  render: (args) => (
    <Notification {...args}>
      <Heading size="sm">Attention</Heading>
      <Text variant="alert">This notification shakes periodically.</Text>
    </Notification>
  ),
};

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      {(['alert', 'warning', 'primary'] as const).map((status) => (
        <Notification key={status} status={status}>
          <Heading size="sm">{status}</Heading>
          <Text variant="secondary">Notification content here.</Text>
        </Notification>
      ))}
    </div>
  ),
};
