"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/store/session";

export default function RootPage() {
  const router = useRouter();
  const userId = useSession((s) => s.userId);

  useEffect(() => {
    router.replace(userId ? "/home" : "/login");
  }, [userId, router]);

  return null;
}
