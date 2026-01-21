import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from './progress';

describe('Progress', () => {
  it('should render with default value', () => {
    render(<Progress data-testid="progress" />);
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });

  it('should render with specified value', () => {
    render(<Progress value={50} data-testid="progress" />);
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Progress className="custom-class" data-testid="progress" />);
    expect(screen.getByTestId('progress')).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = { current: null };
    render(<Progress ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should render with 0 value', () => {
    render(<Progress value={0} data-testid="progress" />);
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });

  it('should render with 100 value', () => {
    render(<Progress value={100} data-testid="progress" />);
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });

  it('should apply animated class when animated prop is true', () => {
    const { container } = render(<Progress value={50} animated={true} />);
    const indicator = container.querySelector('[class*="progress-animated"]');
    expect(indicator).toBeInTheDocument();
  });

  it('should not apply animated class when animated prop is false', () => {
    const { container } = render(<Progress value={50} animated={false} />);
    const indicator = container.querySelector('[class*="bg-gradient"]');
    expect(indicator).toBeInTheDocument();
    expect(indicator).not.toHaveClass('progress-animated');
  });
});
