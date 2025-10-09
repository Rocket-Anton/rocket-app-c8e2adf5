import * as React from "react";

const PHONE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

// Helper-Funktion für SSR-sichere Window-Checks
const getInitialIsPhone = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < PHONE_BREAKPOINT;
};

const getInitialIsTablet = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= PHONE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT;
};

export function useIsPhone() {
  const [isPhone, setIsPhone] = React.useState<boolean>(getInitialIsPhone());

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${PHONE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsPhone(window.innerWidth < PHONE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsPhone(window.innerWidth < PHONE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isPhone;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean>(getInitialIsTablet());

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${PHONE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`);
    const onChange = () => {
      const width = window.innerWidth;
      setIsTablet(width >= PHONE_BREAKPOINT && width < TABLET_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    const width = window.innerWidth;
    setIsTablet(width >= PHONE_BREAKPOINT && width < TABLET_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTablet;
}
