import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider } from './Divider';
import { Text } from './Text';

const meta = {
  title: 'Components/Divider',
  component: Divider,
  argTypes: {
    variant: {
      control: 'select',
      options: ['emphasis', 'primary', 'secondary'],
    },
    spacing: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    variant: 'secondary',
    spacing: 'sm',
  },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div style={{ maxWidth: 400 }}>
      <Text variant="secondary">Content above</Text>
      <Divider {...args} />
      <Text variant="secondary">Content below</Text>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
      {(['emphasis', 'primary', 'secondary'] as const).map((variant) => (
        <div key={variant}>
          <Text variant="tertiary">{variant}</Text>
          <Divider variant={variant} spacing="md" />
          <Text variant="secondary">Content below {variant} divider.</Text>
        </div>
      ))}
    </div>
  ),
};

export const Spacings: Story = {
  render: () => (
    <div style={{ maxWidth: 400 }}>
      {(['sm', 'md', 'lg'] as const).map((spacing) => (
        <div key={spacing}>
          <Text variant="tertiary">spacing: {spacing}</Text>
          <Divider variant="primary" spacing={spacing} />
          <Text variant="secondary">Content after {spacing} spacing.</Text>
        </div>
      ))}
    </div>
  ),
};
