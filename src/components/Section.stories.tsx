import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from './Section';
import { Text } from './Text';

const meta = {
  title: 'Components/Section',
  component: Section,
  argTypes: {
    use: {
      control: 'select',
      options: ['base', 'primary', 'overlay', 'ghost'],
    },
    flush: {
      control: 'select',
      options: ['none', 'top', 'bottom'],
    },
    title: { control: 'text' },
  },
  args: {
    title: 'Section Title',
    use: 'primary',
    flush: 'none',
  },
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Section {...args}>
      <Text variant="secondary">Section content goes here. This is a primary surface panel.</Text>
    </Section>
  ),
};

export const Base: Story = {
  args: { use: 'base', title: 'Base Section' },
  render: (args) => (
    <Section {...args}>
      <Text variant="secondary">Base section — invisible wrapper, no styling.</Text>
    </Section>
  ),
};

export const Overlay: Story = {
  args: { use: 'overlay', title: 'Overlay Section' },
  render: (args) => (
    <Section {...args}>
      <Text variant="secondary">Overlay section — floating surface with stronger blur.</Text>
    </Section>
  ),
};

export const Ghost: Story = {
  args: { use: 'ghost', title: 'Ghost Section' },
  render: (args) => (
    <Section {...args}>
      <Text variant="secondary">Ghost section — no surface, just padding.</Text>
    </Section>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
      {(['base', 'primary', 'overlay', 'ghost'] as const).map((use) => (
        <Section key={use} use={use} title={`${use} section`}>
          <Text variant="secondary">Content inside a {use} section variant.</Text>
        </Section>
      ))}
    </div>
  ),
};
