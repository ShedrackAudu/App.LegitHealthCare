import { HugeiconsIcon } from '@hugeicons/react'
import { Moon02Icon, Sun01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Button variant="outline" size="icon" className="rounded-xl w-10 h-10 border-2 border-primary text-primary" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl w-10 h-10 border-2 border-primary text-primary hover:bg-primary/10 hover:text-primary transition-all active:scale-95 relative shadow-xs"
          title={`Theme: ${theme === 'system' ? `System (${resolvedTheme})` : theme.charAt(0).toUpperCase() + theme.slice(1)}`}
        >
          <HugeiconsIcon icon={Sun01Icon} className={`h-[1.2rem] w-[1.2rem] transition-all ${
            resolvedTheme === "dark" 
              ? "-rotate-90 scale-0 opacity-0" 
              : "rotate-0 scale-100 opacity-100"
          }`} />
          <HugeiconsIcon icon={Moon02Icon} className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${
            resolvedTheme === "dark" 
              ? "rotate-0 scale-100 opacity-100" 
              : "rotate-90 scale-0 opacity-0"
          }`} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl shadow-lg border-2" sideOffset={8}>
        <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center justify-between cursor-pointer font-medium py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Sun01Icon} className="h-4 w-4 text-amber-500" />
            <span>Light</span>
          </div>
          {theme === "light" && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center justify-between cursor-pointer font-medium py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Moon02Icon} className="h-4 w-4 text-indigo-400" />
            <span>Dark</span>
          </div>
          {theme === "dark" && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center justify-between cursor-pointer font-medium py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
            <span>System</span>
          </div>
          {theme === "system" && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
