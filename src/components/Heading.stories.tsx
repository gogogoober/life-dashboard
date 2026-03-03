import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading } from './Heading';

const meta = {
  title: 'Components/Heading',
  component: Heading,
  argTypes: {
    size: {
      control: 'select',
      options: ['lg', 'md', 'sm'],
    },
    as: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'div'],
    },
  },
  args: {
    children: 'Section Heading',
    size: 'md',
    as: 'h2',
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = { args: { size: 'lg' } };
export const Medium: Story = { args: { size: 'md' } };
export const Small: Story = { args: { size: 'sm' } };

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Heading size="lg">Heading Large</Heading>
      <Heading size="md">Heading Medium</Heading>
      <Heading size="sm">Heading Small</Heading>
    </div>
  ),
};
