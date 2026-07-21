import { HugeiconsIcon } from '@hugeicons/react'
import { Moon02Icon, Sun01Icon } from '@hugeicons/core-free-icons'
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
    return <Button variant="outline" size="icon" className="rounded-xl w-10 h-10 border-2 border-primary text-primary" />
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-xl w-10 h-10 border-2 border-primary text-primary hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
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
  )
}
