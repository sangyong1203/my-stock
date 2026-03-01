"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  isAuthenticated: boolean;
  displayName?: string | null;
};

export function SessionControls({ isAuthenticated, displayName }: Props) {
  if (!isAuthenticated) {
    return (
      <Button
        asChild
        variant="outline"
        className="border-white/20 bg-white/5 text-white hover:bg-white/10"
      >
        <Link href="/signin">Sign In</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium text-white">
          {displayName || "Signed in"}
        </p>
        <p className="text-xs text-zinc-300">Authenticated</p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="border-white/20 bg-white/5 text-white hover:bg-white/10"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        <LogOut className="size-4" />
        Sign Out
      </Button>
    </div>
  );
}
