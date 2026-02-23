"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function GitHubSignInButton() {
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      className="w-full"
      onClick={async () => {
        setIsPending(true);
        await signIn("github", { callbackUrl: "/" });
        setIsPending(false);
      }}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
      GitHub로 로그인
    </Button>
  );
}
