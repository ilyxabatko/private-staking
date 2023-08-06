import { useEffect, useState } from "react";

// is used to avoid the "Hydration" error with the WalletAdapter
export default function useIsMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}