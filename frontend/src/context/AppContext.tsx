import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

type Section = 'DCP' | 'DCT';

interface AppContextType {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  activeYear: string;
  setActiveYear: (year: string) => void;
  user: any | null;
  setUser: (user: any | null) => void;
  branding: any | null;
  brandingError: boolean;
  fetchBranding: () => Promise<void>;
  socket: Socket | null;
  unreadMessagesCount: number;
  setUnreadMessagesCount: (count: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

import { toast } from 'react-hot-toast';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<Section>(() => {
    return (localStorage.getItem('activeSection') as Section) || 'DCP';
  });

  const [activeYear, setActiveYear] = useState(() => {
    return localStorage.getItem('activeYear') || new Date().getFullYear().toString();
  });
  
  const [user, setUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('activeSection', activeSection);
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem('activeYear', activeYear);
  }, [activeYear]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      
      const newSocket = io('http://localhost:5000', {
        query: { user_id: user.id }
      });
      
      setSocket(newSocket);
      
      newSocket.on('message_notification', () => {
          setUnreadMessagesCount(prev => prev + 1);
          // Optional: sound or browser notification
      });

      newSocket.on('new_message', () => {
        // If the user is on the messaging page but not in the specific chat, 
        // we might need to update the conversation list.
        // This is mostly handled in MessagingPage.tsx, but having a global listener
        // for "new message in some chat" is good for the badge.
      });

      newSocket.on('user_presence', () => {
        // This could trigger a refresh of certain states if needed
      });

      newSocket.on('user_update', (updatedUser) => {
        if (user && updatedUser.id === user.id) {
          const wasRevoked = (user.temp_access?.length || 0) > (updatedUser.temp_access?.length || 0);
          setUser(updatedUser);
          if (wasRevoked) {
            toast.error("Administrative Alert: An access privilege has been revoked.");
          } else {
            toast.success("Security permissions synchronized.");
          }
        }
      });

      // Initial fetch for unread count
      axios.get('http://localhost:5000/api/messages/conversations', {
        headers: { 'X-User-ID': user.id }
      }).then(resp => {
        const total = resp.data.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0);
        setUnreadMessagesCount(total);
      }).catch(err => {});

      return () => {
        newSocket.close();
      };
    } else {
      localStorage.removeItem('user');
      setSocket(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.temp_access || user.temp_access.length === 0) return;

    const checkExpiries = () => {
      const now = new Date();
      // Check if any code has expired
      const expiredExist = user.temp_access.some((t: any) => t.expires_at && new Date(t.expires_at) <= now);
      
      if (expiredExist) {
        // Filter out expired ones
        const activeOnly = user.temp_access.filter((t: any) => !t.expires_at || new Date(t.expires_at) > now);
        if (activeOnly.length !== user.temp_access.length) {
            setUser({ ...user, temp_access: activeOnly });
            toast.error("Security Alert: A temporary access session has expired.");
        }
      }
    };

    const interval = setInterval(checkExpiries, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [user, setUser]);

  useEffect(() => {
    if (!user) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setUser(null);
        localStorage.removeItem('user');
        window.location.href = '/login?reason=inactivity';
      }, 10 * 60 * 1000); // 10 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user, setUser]);


  const [branding, setBranding] = useState<any | null>(null);
  const [brandingError, setBrandingError] = useState(false);

  const fetchBranding = useCallback(async () => {
    try {
      setBrandingError(false);
      const resp = await axios.get('http://localhost:5000/api/branding', {
        headers: { 'X-Company-Context': activeSection }
      });
      setBranding(resp.data);
      // Update document title and favicon
      if (resp.data.clinic_name) {
        document.title = resp.data.clinic_name;
      }
      if (resp.data.favicon) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = `http://localhost:5000${resp.data.favicon}`;
      }
    } catch (err) {
      setBrandingError(true);
    }
  }, [activeSection]);

  useEffect(() => {
    axios.defaults.headers.common['X-Company-Context'] = activeSection;
    if (user) {
      axios.defaults.headers.common['X-User-ID'] = user.id;
    } else {
      delete axios.defaults.headers.common['X-User-ID'];
    }
  }, [activeSection, user]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  return (
    <AppContext.Provider value={{ 
      activeSection, setActiveSection, 
      activeYear, setActiveYear, 
      user, setUser,
      branding, brandingError, fetchBranding,
      socket, unreadMessagesCount, setUnreadMessagesCount
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
