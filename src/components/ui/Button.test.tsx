import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Submit</Button>);
    
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick} disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
    
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies variant classes correctly', () => {
    render(<Button variant="outline">Outline Button</Button>);
    
    const button = screen.getByRole('button', { name: /outline button/i });
    expect(button).toHaveClass('btn-outline');
  });
});
