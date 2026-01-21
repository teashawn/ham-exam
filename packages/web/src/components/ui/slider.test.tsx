import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Slider } from './slider';

describe('Slider', () => {
  it('should render', () => {
    render(<Slider data-testid="slider" />);
    expect(screen.getByTestId('slider')).toBeInTheDocument();
  });

  it('should render with value', () => {
    render(<Slider defaultValue={[50]} data-testid="slider" />);
    expect(screen.getByTestId('slider')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Slider className="custom-class" data-testid="slider" />);
    expect(screen.getByTestId('slider')).toHaveClass('custom-class');
  });

  it('should render with min and max', () => {
    render(<Slider min={0} max={100} defaultValue={[25]} data-testid="slider" />);
    expect(screen.getByTestId('slider')).toBeInTheDocument();
  });

  it('should render with step', () => {
    render(<Slider step={5} defaultValue={[50]} data-testid="slider" />);
    expect(screen.getByTestId('slider')).toBeInTheDocument();
  });
});
