import { useEffect, useRef, useState } from "react";

export function useTabShimmer(tabValue: string, duration = 350): boolean {
  const [isShimmering, setIsShimmering] = useState(false);
  const isFirstRender = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setIsShimmering(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsShimmering(false);
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [tabValue, duration]);

  return isShimmering;
}
