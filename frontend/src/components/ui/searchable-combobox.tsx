import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  // Reset active index when search or open state changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [search, open]);

  // Ensure active element is scrolled into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
        const activeElement = listRef.current.children[activeIndex] as HTMLElement;
        if (activeElement) {
            activeElement.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [activeIndex]);

  const handleSelect = (val: string) => {
    onChange(val);
    setSearch("");
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
            setOpen(true);
            return;
        }
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelect(filteredOptions[activeIndex]);
        } else if (filteredOptions.length > 0) {
            // If nothing active, select the first match
            handleSelect(filteredOptions[0]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div className="relative w-full" ref={ref}>
      <div 
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all",
          open && "ring-2 ring-ring ring-offset-2 border-primary"
        )}
      >
        <input 
          className="flex-1 min-w-0 bg-transparent outline-none border-none font-semibold text-foreground placeholder:text-muted-foreground placeholder:font-normal"
          placeholder={placeholder}
          value={open ? search : (value || "")}
          onFocus={() => { setOpen(true); }}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <ChevronDown 
            className="h-4 w-4 opacity-50 cursor-pointer hover:opacity-100 transition-opacity ml-2 shrink-0" 
            onClick={() => { setOpen(!open); if(!open) setSearch(""); }}
        />
      </div>
      
      {open && (
        <div className="absolute top-full left-0 z-[200] w-full mt-2 max-h-60 overflow-y-auto rounded-md border border-input shadow-2xl bg-popover text-popover-foreground animate-in fade-in slide-in-from-top-2">
          <div className="p-1" ref={listRef}>
            {filteredOptions.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground font-medium">No results found.</div>
            ) : (
                filteredOptions.map((opt, index) => (
                <div
                    key={opt}
                    className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-colors font-semibold",
                    (value === opt || activeIndex === index) ? "bg-primary/10 text-primary" : "hover:bg-primary/5"
                    )}
                    onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input onBlur
                        handleSelect(opt);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                >
                    <span className="flex-1 truncate">{opt}</span>
                    {value === opt && <Check className="h-5 w-5 text-primary shrink-0" />}
                </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
