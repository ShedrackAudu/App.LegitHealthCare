import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { useEffect, useState } from "react"

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="rounded-full w-10 h-10" />
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-full w-10 h-10 hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
    >
      <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${
        resolvedTheme === "dark" 
          ? "-rotate-90 scale-0 opacity-0" 
          : "rotate-0 scale-100 opacity-100"
      }`} />
      <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${
        resolvedTheme === "dark" 
          ? "rotate-0 scale-100 opacity-100" 
          : "rotate-90 scale-0 opacity-0"
      }`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
