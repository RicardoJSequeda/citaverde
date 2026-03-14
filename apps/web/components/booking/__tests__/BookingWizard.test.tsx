import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookingWizard } from '../BookingWizard';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({ data: [], error: null })),
        })),
      })),
    })),
    auth: {
      getUser: jest.fn(() => ({ data: { user: { id: 'test-user-id' } }, error: null })),
    },
  }),
}));

jest.mock('@/lib/actions/appointments', () => ({
  getAvailableSlots: jest.fn(() => Promise.resolve({ slots: [] })),
}));

jest.mock('@acme/ui/use-toast', () => ({
  toast: jest.fn(),
}));

describe('BookingWizard', () => {
  it('should render the first step (StepService) initially', () => {
    render(<BookingWizard />);

    // Check if the main title is there
    expect(screen.getByText('Reservar Nueva Cita')).toBeInTheDocument();

    // Check for a title specific to the first step to confirm it's rendered
    // Assuming StepService has a unique title or element.
    // As we build out the tests, we'll make these selectors more robust.
    expect(screen.getByText(/selecciona un servicio/i)).toBeInTheDocument();
  });
});
