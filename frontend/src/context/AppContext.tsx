import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../lib/api';

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
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  playGlobalSound: (type?: 'message' | 'alert') => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

import { toast } from 'react-hot-toast';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<Section>(() => {
    const section = (localStorage.getItem('activeSection') as Section) || 'DCP';
    axios.defaults.headers.common['X-Company-Context'] = section;
    return section;
  });

  const [activeYear, setActiveYear] = useState(() => {
    return localStorage.getItem('activeYear') || new Date().getFullYear().toString();
  });
  
  const [user, setUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const u = saved ? JSON.parse(saved) : null;
    if (u && token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return u;
  });

  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('app_muted') === 'true');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChatIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const MESSAGE_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2361/2361-preview.mp3';
  const ALERT_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2353/2353-preview.mp3';
  
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const playGlobalSound = useCallback((type: 'message' | 'alert' = 'message') => {
    if (isMuted) return;
    try {
        const soundUrl = type === 'message' ? MESSAGE_SOUND : ALERT_SOUND;
        const audio = new Audio(soundUrl);
        audio.volume = 0.6;
        audio.play().catch(e => console.warn("Auto-play blocked or audio failed:", e));
    } catch (err) {
        console.error("Global sound error:", err);
    }
  }, [isMuted]);

  const handleSetIsMuted = (muted: boolean) => {
    setIsMuted(muted);
    localStorage.setItem('app_muted', String(muted));
  };

  useEffect(() => {
    localStorage.setItem('activeSection', activeSection);
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem('activeYear', activeYear);
  }, [activeYear]);

  useEffect(() => {
    // Response interceptor to handle 401s globally
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Only clear and redirect if we thought we were logged in
          if (localStorage.getItem('token')) {
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            // Remove the Authorization header
            delete axios.defaults.headers.common['Authorization'];
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login?reason=session_expired';
            }
          }
        }
        return Promise.reject(error);
      }
    );

    if (user) {
      const token = localStorage.getItem('token');
      localStorage.setItem('user', JSON.stringify(user));
      
      const newSocket = io(API_BASE_URL, {
        auth: { token: token },
        query: { user_id: user.id }
      });
      // ... socket logic continues
      
      setSocket(newSocket);
      
      newSocket.on('message_notification', (msg: any) => {
          setUnreadMessagesCount(prev => prev + 1);
          
          const isChatActive = window.location.pathname.includes('/messaging') && 
            activeChatIdRef.current === (msg.group_id ? `group_${msg.group_id}` : `dm_${msg.sender_id}`);
          
          if (!isChatActive && msg.sender_id !== user.id) {
            playGlobalSound('message');
            
            const titleText = msg.group_id ? `Group: ${msg.sender_name}` : msg.sender_name;
            toast(
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-foreground text-sm">{titleText}</span>
                <span className="text-muted-foreground text-xs line-clamp-2">{msg.content}</span>
              </div>,
              { id: `message_${msg.id}` }
            );
          }
      });

      newSocket.on('unread_update', () => {
        axios.get('/api/messages/conversations').then(resp => {
          const total = resp.data.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0);
          setUnreadMessagesCount(total);
        }).catch(err => {
          // Interceptor will handle 401
        });
      });

      newSocket.on('user_update', (updatedUser) => {
        if (user && updatedUser.id === user.id) {
          const wasRevoked = (user.temp_access?.length || 0) > (updatedUser.temp_access?.length || 0);
          setUser(updatedUser);
          playGlobalSound('alert');
          if (wasRevoked) {
            toast.error("Administrative Alert: An access privilege has been revoked.");
          } else {
            toast.success("Security permissions synchronized.");
          }
        }
      });

      newSocket.on('force_logout', () => {
        toast.error("Your session has been revoked by an administrator.", { id: 'session_revoked' });
        setUser(null);
        setTimeout(() => {
          window.location.href = '/login?reason=session_revoked';
        }, 1500);
      });

      // Initial fetch for unread count
      axios.get('/api/messages/conversations').then(resp => {
        const total = resp.data.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0);
        setUnreadMessagesCount(total);
      }).catch(err => {
        // Interceptor will handle 401
      });

      // Global Heartbeat
      const hbInterval = setInterval(() => {
          axios.post('/api/messages/heartbeat', {}).catch(() => {});
      }, 45000);

      return () => {
        newSocket.close();
        clearInterval(hbInterval);
        axios.interceptors.response.eject(interceptor);
      };
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setSocket(null);
      return () => {
        axios.interceptors.response.eject(interceptor);
      };
    }
  }, [user]);
  
  // Auto-set section from user profile if available (especially for patients)
  useEffect(() => {
    if (user && user.section && user.section !== activeSection) {
      setActiveSection(user.section as Section);
    }
  }, [user?.section, activeSection]);

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
      const resp = await axios.get('/api/branding', {
        headers: { 'X-Company-Context': activeSection }
      });
      setBranding(resp.data);

      // Update document title
      if (resp.data.clinic_name) {
        document.title = resp.data.clinic_name;
      }

      // Update browser tab favicon (link[rel="icon"])
      const faviconUrl = resp.data.favicon || resp.data.logo_light;
      if (faviconUrl) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        const absoluteUrl = `${API_BASE_URL}${faviconUrl}`;
        link.href = absoluteUrl;
        // Set correct MIME type so the browser renders PNGs properly
        link.type = faviconUrl.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'image/png';
      }

      // Update PWA manifest link to use the backend's dynamic manifest.
      // The backend manifest now returns the clinic's uploaded favicon as the
      // PWA icon (prioritizing branding.favicon, then logo_light).
      // This makes the PWA install prompt show the clinic's custom logo
      // instead of the static Vite fallback icon.
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (manifestLink && (resp.data.favicon || resp.data.logo_light)) {
        const dynamicManifest = `${API_BASE_URL}/api/branding/manifest.json`;
        if (manifestLink.getAttribute('href') !== dynamicManifest) {
          manifestLink.setAttribute('href', dynamicManifest);
          manifestLink.setAttribute('crossorigin', 'anonymous');
        }
      }
    } catch (err) {
      setBrandingError(true);
    }
  }, [activeSection]);


  useEffect(() => {
    axios.defaults.headers.common['X-Company-Context'] = activeSection;
  }, [activeSection]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  return (
    <AppContext.Provider value={{ 
      activeSection, setActiveSection, 
      activeYear, setActiveYear, 
      user, setUser,
      branding, brandingError, fetchBranding,
      socket, unreadMessagesCount, setUnreadMessagesCount,
      isMuted, setIsMuted: handleSetIsMuted, playGlobalSound,
      activeChatId, setActiveChatId
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
