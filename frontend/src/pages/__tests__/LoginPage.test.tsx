import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../LoginPage';
import { BrowserRouter } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';

// Mock dependencies
vi.mock('@/context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

vi.mock('axios');
const mockedAxios = axios as vi.Mocked<typeof axios>;

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  const mockUserContext = {
    user: null,
    setUser: vi.fn(),
    branding: { clinic_name: 'Test Clinic' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppContext as any).mockReturnValue(mockUserContext);
  });

  it('renders login form correctly', () => {
    renderLoginPage();
    expect(screen.getByText('Login')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter your credentials')).toBeDefined();
    expect(screen.getByPlaceholderText('••••••••')).toBeDefined();
  });

  it('handles successful staff login', async () => {
    const mockUser = { id: 1, username: 'teststaff', roles: ['Admin'] };
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        user: mockUser,
        token: 'fake-token'
      }
    });

    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Enter your credentials'), 'teststaff');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/login', {
        identity: 'teststaff',
        password: 'password123',
        portal: 'staff'
      });
      expect(mockUserContext.setUser).toHaveBeenCalledWith(mockUser);
    });
  });

  it('displays error message on login failure', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { error: 'Invalid credentials' }
      }
    });

    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Enter your credentials'), 'wronguser');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeDefined();
  });
});
