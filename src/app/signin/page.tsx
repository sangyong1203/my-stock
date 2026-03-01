import Link from "next/link";
import { GitHubSignInButton } from "@/components/auth/github-sign-in-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border/70">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Sign in to myStock with your GitHub account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GitHubSignInButton />
          <p className="text-xs text-muted-foreground">
            Configure `GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET`, and
            `DATABASE_URL` before using authentication.
          </p>
          <Link
            href="/"
            className="inline-block text-xs text-muted-foreground underline underline-offset-4"
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
