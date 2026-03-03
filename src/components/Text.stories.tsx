import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text';

const meta = {
  title: 'Components/Text',
  component: Text,
  argTypes: {
    variant: {
      control: 'select',
      options: ['emphasis', 'primary', 'secondary', 'tertiary', 'alert', 'warning'],
    },
    as: {
      control: 'select',
      options: ['p', 'span', 'div'],
    },
  },
  args: {
    children: 'The quick brown fox jumps over the lazy dog.',
    variant: 'primary',
    as: 'span',
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Emphasis: Story = { args: { variant: 'emphasis' } };
export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Tertiary: Story = { args: { variant: 'tertiary' } };
export const Alert: Story = { args: { variant: 'alert' } };
export const Warning: Story = { args: { variant: 'warning' } };

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(['emphasis', 'primary', 'secondary', 'tertiary', 'alert', 'warning'] as const).map((v) => (
        <Text key={v} variant={v}>
          {v}: The quick brown fox jumps over the lazy dog.
        </Text>
      ))}
    </div>
  ),
};
