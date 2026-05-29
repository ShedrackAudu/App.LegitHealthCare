import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Loading03Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import axios from 'axios';

interface PatientSearchProps {
  onSelect: (patient: any, searchType?: 'pid' | 'general') => void;
  onSearch: (searchTerm: string, searchType?: 'pid' | 'general') => void;
  placeholder?: string;
  themeColor?: 'emerald' | 'primary';
  className?: string;
  activeSection: string;
  initialValue?: string;
  searching?: boolean;
  buttonText?: string;
  year?: string | number;
  strict?: boolean;
  showPidToggle?: boolean;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({
  onSelect,
  onSearch,
  placeholder = "Search Staff ID or Name...",
  themeColor = 'primary',
  className = "",
  activeSection,
  initialValue = "",
  searching = false,
  buttonText = "Retrieve Record",
  year,
  strict = false,
  showPidToggle = false
}) => {
  const { pathname } = useLocation();
  const [searchId, setSearchId] = useState(initialValue);
  const [searchByPid, setSearchByPid] = useState(() => {
    const saved = localStorage.getItem(`searchByPid_${pathname}`);
    return saved === 'true';
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`searchByPid_${pathname}`);
    setSearchByPid(saved === 'true');
  }, [pathname]);

  useEffect(() => {
    setSearchId(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (searchId.length > 0) {
      if (isSelecting) {
        setIsSelecting(false);
        setSearchResults([]);
        return;
      }
      const fetchResults = async () => {
        try {
          const url = `/api/patients/search?q=${searchId}${year ? `&year=${year}` : ''}${strict ? '&strict=true' : ''}${searchByPid ? '&search_type=pid' : ''}`;
          const res = await axios.get(url, {
            headers: { 'X-Company-Context': activeSection }
          });
          // Handle both old (list) and new (paginated) formats for safety
          const results = res.data.results || (Array.isArray(res.data) ? res.data : []);
          // Sort by relevance: exact > prefix > contains
          const q = searchId.toLowerCase().trim();
          const sorted = [...results].sort((a, b) => {
            const scoreFields = (p: any) => {
              const fields = [
                (p.staff_id || '').toLowerCase(),
                (p.first_name || '').toLowerCase(),
                (p.last_name || '').toLowerCase(),
                (p.patient_id || '').toLowerCase(),
              ];
              for (const f of fields) { if (f === q) return 0; }
              for (const f of fields) { if (f.startsWith(q)) return 1; }
              return 2;
            };
            return scoreFields(a) - scoreFields(b);
          });
          setSearchResults(sorted);
        } catch (err) {
          console.error("Patient search failed:", err);
        }
      };
      const timer = setTimeout(fetchResults, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchId, activeSection, isSelecting, year, strict, searchByPid]);

  const colorClasses = {
    emerald: {
      border: "focus-within:border-primary/50",
      button: "bg-primary hover:bg-primary0 shadow-primary/20",
      dropdownBorder: "border-primary/20",
      dropdownHeader: "bg-primary/5",
      dropdownTitle: "text-primary/70",
      itemHover: "hover:bg-primary/5",
      avatarBg: "bg-primary/10",
      avatarText: "text-primary"
    },
    primary: {
      border: "focus-within:border-primary/50",
      button: "bg-primary hover:bg-primary/90 shadow-primary/20",
      dropdownBorder: "border-primary/20",
      dropdownHeader: "bg-primary/5",
      dropdownTitle: "text-primary/70",
      itemHover: "hover:bg-primary/5",
      avatarBg: "bg-primary/10",
      avatarText: "text-primary"
    }
  };

  const currentTheme = colorClasses[themeColor];

  const handleItemSelect = (p: any) => {
    setIsSelecting(true);
    setSearchId('');
    setSearchResults([]);
    onSelect(p, searchByPid ? 'pid' : 'general');
  };

  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);

  useEffect(() => {
    setActiveSearchIndex(-1);
  }, [searchId, searchResults]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveSearchIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
            handleItemSelect(searchResults[activeSearchIndex]);
          } else {
            setSearchResults([]);
            onSearch(searchId, searchByPid ? 'pid' : 'general');
            setSearchId('');
          }
          break;
        case 'Escape':
          setSearchResults([]);
          break;
      }
    } else if (e.key === 'Enter') {
      setSearchResults([]);
      onSearch(searchId, searchByPid ? 'pid' : 'general');
      setSearchId('');
    }
  };

  const computedPlaceholder = searchByPid ? "Search Patient ID (PID)..." : placeholder;

  return (
    <div className={`w-full max-w-2xl relative ${className}`}>
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/30 p-2 rounded-xl border-2 transition-all relative ${currentTheme.border}`}>
        {showPidToggle && (
          <div className="flex items-center px-3 py-1.5 bg-background/60 dark:bg-background/20 rounded-lg border border-muted-foreground/10 shrink-0 ml-1 sm:ml-0 self-start sm:self-auto">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={searchByPid}
                onChange={(e) => {
                  const val = e.target.checked;
                  setSearchByPid(val);
                  localStorage.setItem(`searchByPid_${pathname}`, String(val));
                  setSearchId('');
                  setSearchResults([]);
                }}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-muted-foreground/20 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-2 text-xs font-bold text-muted-foreground whitespace-nowrap">P.ID Search</span>
            </label>
          </div>
        )}
        <div className="flex items-center gap-2 flex-1 px-2 h-11">
          <HugeiconsIcon icon={Search01Icon} className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            placeholder={computedPlaceholder}
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="border-0 bg-transparent focus-visible:ring-0 min-w-0 flex-1 text-base sm:text-lg font-bold h-full px-0"
          />
        </div>
        <Button 
          onClick={() => {
            setSearchResults([]);
            onSearch(searchId, searchByPid ? 'pid' : 'general');
            setSearchId('');
          }}
          disabled={searching || !searchId.trim()}
          className={`${currentTheme.button} shadow-lg px-6 sm:px-8 whitespace-nowrap font-bold h-11 rounded-xl transition-all w-full sm:w-auto`}
        >
          {searching ? <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin mr-2" /> : buttonText}
        </Button>

        {/* Search Results Card */}
        {searchResults.length > 0 && (
          <Card className={`absolute top-full left-0 right-0 mt-2 z-[100] shadow-2xl border-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ${currentTheme.dropdownBorder}`}>
            <CardHeader className={`py-3 border-b ${currentTheme.dropdownHeader}`}>
              <CardTitle className={`text-xs uppercase tracking-widest ${currentTheme.dropdownTitle}`}>Matching Profiles</CardTitle>
            </CardHeader>
            <ul className="max-h-[300px] overflow-auto divide-y">
              {searchResults.map((p: any, index: number) => {
                const isActive = activeSearchIndex === index;
                const activeBg = themeColor === 'emerald' ? 'bg-primary/10' : 'bg-primary/10';
                const activeText = themeColor === 'emerald' ? 'text-primary' : 'text-primary';
                const activeAvatarBg = themeColor === 'emerald' ? 'bg-primary text-white' : 'bg-primary text-white';

                return (
                  <li 
                    key={p.staff_id}
                    className={`p-4 cursor-pointer transition-colors group ${isActive ? activeBg : currentTheme.itemHover}`}
                    onClick={() => handleItemSelect(p)}
                    onMouseEnter={() => setActiveSearchIndex(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center overflow-hidden font-black group-hover:scale-110 transition-transform ${isActive ? activeAvatarBg : `${currentTheme.avatarBg} ${currentTheme.avatarText}`}`}>
                          {p.passport_image ? (
                            <img 
                              src={p.passport_image.startsWith('http') || p.passport_image.startsWith('blob') || p.passport_image.startsWith('data') ? p.passport_image : `${(window as any).API_BASE_URL}${p.passport_image}`} 
                              alt="Avatar" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <>{p.first_name[0]}{p.last_name[0]}</>
                          )}
                        </div>
                        <div className="text-left">
                          <p className={`font-bold capitalize ${isActive ? activeText : 'text-foreground'}`}>{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="bg-muted px-1.5 py-0.5 rounded uppercase font-bold">{p.staff_id}</span>
                            {p.patient_id && (
                              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-semibold">PID: {p.patient_id}</span>
                            )}
                            • <span className="font-medium">{p.department}</span>
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className={`${isActive ? `opacity-100 ${activeBg} ${activeText}` : 'opacity-0 group-hover:opacity-100'} h-8 px-2`}>
                        Select <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
};
