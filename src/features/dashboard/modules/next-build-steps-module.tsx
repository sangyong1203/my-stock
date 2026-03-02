"use client";

import { Moon, Sun } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NextBuildStepsModule() {
  return (
    <Card className="module-card module-next-build-steps h-full border-border/70">
      <CardHeader className="module-card-header module-next-build-steps-header">
        <CardTitle className="module-next-build-steps-title">Next Build Steps</CardTitle>
        <CardDescription className="module-next-build-steps-description">
          Recommended sequence for production readiness
        </CardDescription>
      </CardHeader>
      <CardContent className="module-next-build-steps-content space-y-4 text-sm">
        <div className="module-next-build-step-item rounded-xl border border-border/70 bg-muted/30 p-4">
          <p className="font-medium">1. Connect Neon + migrate schema</p>
          <p className="mt-1 text-muted-foreground">
            Run `db:generate` and `db:migrate` after setting `DATABASE_URL`.
          </p>
        </div>
        <div className="module-next-build-step-item rounded-xl border border-border/70 bg-muted/30 p-4">
          <p className="font-medium">2. Add price snapshot sync job</p>
          <p className="mt-1 text-muted-foreground">
            Save daily close prices to calculate portfolio performance over time.
          </p>
        </div>
        <div className="module-next-build-step-item rounded-xl border border-border/70 bg-muted/30 p-4">
          <p className="font-medium">3. Require auth for live portfolios</p>
          <p className="mt-1 text-muted-foreground">
            Keep demo mode, but route real user data through Auth.js sessions.
          </p>
        </div>
        <div className="module-next-build-steps-footer flex items-center gap-2 rounded-xl border border-border/70 p-3 text-muted-foreground">
          <Moon className="size-4 dark:hidden" />
          <Sun className="hidden size-4 dark:block" />
          Dark mode is enabled by default
        </div>
      </CardContent>
    </Card>
  );
}
