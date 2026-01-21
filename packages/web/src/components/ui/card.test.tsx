import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render with children', () => {
      render(<Card data-testid="card">Card content</Card>);
      expect(screen.getByTestId('card')).toHaveTextContent('Card content');
    });

    it('should apply custom className', () => {
      render(<Card data-testid="card" className="custom-class">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Card ref={ref}>Card</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardHeader', () => {
    it('should render with children', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      expect(screen.getByTestId('header')).toHaveTextContent('Header');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<CardHeader ref={ref}>Header</CardHeader>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardTitle', () => {
    it('should render as h3', () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Title');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<CardTitle ref={ref}>Title</CardTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe('CardDescription', () => {
    it('should render with children', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      expect(screen.getByTestId('desc')).toHaveTextContent('Description');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<CardDescription ref={ref}>Desc</CardDescription>);
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe('CardContent', () => {
    it('should render with children', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      expect(screen.getByTestId('content')).toHaveTextContent('Content');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<CardContent ref={ref}>Content</CardContent>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardFooter', () => {
    it('should render with children', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId('footer')).toHaveTextContent('Footer');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<CardFooter ref={ref}>Footer</CardFooter>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});
