import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from './Label';

const meta = {
  title: 'Components/Label',
  component: Label,
  argTypes: {
    variant: {
      control: 'select',
      options: ['emphasis', 'primary', 'secondary'],
    },
  },
  args: {
    children: 'Label Text',
    variant: 'primary',
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Emphasis: Story = { args: { variant: 'emphasis' } };
export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Label variant="emphasis">Emphasis Label</Label>
      <Label variant="primary">Primary Label</Label>
      <Label variant="secondary">Secondary Label</Label>
    </div>
  ),
};
