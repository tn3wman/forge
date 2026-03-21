import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type Screen = { type: 'harbor' } | { type: 'bay'; bayId: string };

interface NavigationContextValue {
  screen: Screen;
  openBay: (bayId: string) => void;
  openHarbor: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>({ type: 'harbor' });

  const openBay = useCallback((bayId: string) => {
    setScreen({ type: 'bay', bayId });
  }, []);

  const openHarbor = useCallback(() => {
    setScreen({ type: 'harbor' });
  }, []);

  return (
    <NavigationContext.Provider value={{ screen, openBay, openHarbor }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}
