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
          <CardTitle>로그인</CardTitle>
          <CardDescription>
            GitHub OAuth로 myStock에 로그인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GitHubSignInButton />
          <p className="text-xs text-muted-foreground">
            환경변수 `GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET`, `DATABASE_URL`
            설정이 필요합니다.
          </p>
          <Link
            href="/"
            className="inline-block text-xs text-muted-foreground underline underline-offset-4"
          >
            홈으로 돌아가기
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
