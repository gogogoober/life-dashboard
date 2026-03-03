import type { Meta, StoryObj } from '@storybook/react-vite';
import { Banner } from './Banner';

const meta = {
  title: 'Components/Banner',
  component: Banner,
  argTypes: {
    status: {
      control: 'select',
      options: ['alert', 'warning'],
    },
  },
  args: {
    children: 'This is a banner message.',
    status: 'alert',
  },
  // Banner is position:fixed, so render in an iframe-like container
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AlertBanner: Story = {
  args: {
    status: 'alert',
    children: 'Critical: Something requires immediate attention.',
  },
};

export const WarningBanner: Story = {
  args: {
    status: 'warning',
    children: 'Warning: Review this before proceeding.',
  },
};

export const WithDismiss: Story = {
  args: {
    status: 'alert',
    children: 'Dismissible banner — click the X to close.',
    onDismiss: () => {},
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 80, position: 'relative', height: 300 }}>
      <Banner status="alert">Alert banner: Something went wrong.</Banner>
      <Banner status="warning">Warning banner: Heads up about this.</Banner>
    </div>
  ),
};
