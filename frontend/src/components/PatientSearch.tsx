import React, { useState, useEffect } from 'react';
import { Search, Loader2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import axios from 'axios';

interface PatientSearchProps {
  onSelect: (patient: any) => void;
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
  themeColor?: 'emerald' | 'primary';
  className?: string;
  activeSection: string;
  initialValue?: string;
  searching?: boolean;
  buttonText?: string;
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
  buttonText = "Retrieve Record"
}) => {
  const [searchId, setSearchId] = useState(initialValue);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    setSearchId(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (searchId.length > 2) {
      if (isSelecting) {
        setIsSelecting(false);
        setSearchResults([]);
        return;
      }
      const fetchResults = async () => {
        try {
          const res = await axios.get(`http://localhost:5000/api/patients/search?q=${searchId}`, {
            headers: { 'X-Company-Context': activeSection }
          });
          setSearchResults(res.data || []);
        } catch (err) {
          console.error("Patient search failed:", err);
        }
      };
      const timer = setTimeout(fetchResults, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchId, activeSection, isSelecting]);

  const colorClasses = {
    emerald: {
      border: "focus-within:border-emerald-500/50",
      button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
      dropdownBorder: "border-emerald-500/20",
      dropdownHeader: "bg-emerald-500/5",
      dropdownTitle: "text-emerald-600/70",
      itemHover: "hover:bg-emerald-500/5",
      avatarBg: "bg-emerald-500/10",
      avatarText: "text-emerald-600"
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
    onSelect(p);
  };

  return (
    <div className={`flex-1 max-w-2xl relative ${className}`}>
      <div className={`flex items-center gap-3 bg-muted/30 p-2 rounded-xl border-2 transition-all relative ${currentTheme.border}`}>
        <Search className="h-6 w-6 text-muted-foreground ml-2" />
        <Input
          placeholder={placeholder}
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch(searchId)}
          className="border-0 bg-transparent focus-visible:ring-0 min-w-[300px] text-lg font-bold"
        />
        <Button 
          onClick={() => onSearch(searchId)}
          disabled={searching || !searchId.trim()}
          className={`${currentTheme.button} shadow-lg px-8 whitespace-nowrap font-bold h-11 rounded-xl transition-all`}
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : buttonText}
        </Button>

        {/* Search Results Card */}
        {searchResults.length > 0 && (
          <Card className={`absolute top-full left-0 right-0 mt-2 z-[100] shadow-2xl border-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ${currentTheme.dropdownBorder}`}>
            <CardHeader className={`py-3 border-b ${currentTheme.dropdownHeader}`}>
              <CardTitle className={`text-xs uppercase tracking-widest ${currentTheme.dropdownTitle}`}>Matching Profiles</CardTitle>
            </CardHeader>
            <ul className="max-h-[300px] overflow-auto divide-y">
              {searchResults.map((p: any) => (
                <li 
                  key={p.staff_id}
                  className={`p-4 cursor-pointer transition-colors group ${currentTheme.itemHover}`}
                  onClick={() => handleItemSelect(p)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black group-hover:scale-110 transition-transform ${currentTheme.avatarBg} ${currentTheme.avatarText}`}>
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-foreground capitalize">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="bg-muted px-1.5 py-0.5 rounded uppercase font-bold">{p.staff_id}</span>
                          • <span className="font-medium">{p.department}</span>
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-8 px-2">
                      Select <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
};
