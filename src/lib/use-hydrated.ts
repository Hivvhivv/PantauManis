"use client";

import { useEffect, useState } from "react";

/**
 * true setelah React selesai hidrasi. Tombol kirim dinonaktifkan sebelum itu, karena form yang
 * dikirim sebelum hidrasi akan memakai submit bawaan browser dan bisa menaruh isian
 * (mis. kata sandi) di URL.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
