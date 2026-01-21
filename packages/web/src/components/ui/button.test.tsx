import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, buttonVariants } from './button';

describe('Button', () => {
  it('should render with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should render with custom className', () => {
    render(<Button className="custom-class">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('should render different variants', () => {
    const { rerender } = render(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button size="icon">Icon</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render as child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    expect(screen.getByRole('link')).toHaveTextContent('Link Button');
  });

  it('should forward ref', () => {
    const ref = { current: null };
    render(<Button ref={ref}>Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('should export buttonVariants helper', () => {
    expect(buttonVariants).toBeDefined();
    expect(typeof buttonVariants).toBe('function');
    const classes = buttonVariants({ variant: 'default', size: 'default' });
    expect(typeof classes).toBe('string');
  });
});
