import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey);
    if (!storedTheme) {
      fetch('/api/config/default-theme')
        .then(res => {
          if (!res.ok) throw new Error("API error");
          return res.json();
        })
        .then(data => {
          if (data.default_theme && (data.default_theme === 'light' || data.default_theme === 'dark' || data.default_theme === 'system')) {
            setTheme(data.default_theme);
          }
        })
        .catch(err => console.error("Failed to fetch default theme:", err));
    }
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    let current: "light" | "dark" = "light"
    if (theme === "system") {
      current = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    } else {
      current = theme as "light" | "dark"
    }

    root.classList.add(current)
    setResolvedTheme(current)

    // Update PWA theme-color meta tag dynamically to match current theme
    const themeColor = current === 'dark' ? '#000000' : '#ffffff'
    const existingMetas = document.querySelectorAll('meta[name="theme-color"]')
    existingMetas.forEach(meta => meta.remove())

    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', themeColor)
    document.head.appendChild(meta)

    // Set cookie for backend manifest sync
    document.cookie = `theme=${current}; path=/; max-age=31536000; SameSite=Lax`
  }, [theme])

  const value = {
    theme,
    resolvedTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
