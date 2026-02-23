import { Moon, Sun, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const positions = [
  {
    symbol: "AAPL",
    name: "Apple",
    quantity: 12,
    avgCost: 188.42,
    currentPrice: 201.5,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    quantity: 5,
    avgCost: 742.1,
    currentPrice: 711.4,
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    quantity: 8,
    avgCost: 176.25,
    currentPrice: 189.2,
  },
];

const summaries = (() => {
  const marketValue = positions.reduce(
    (sum, item) => sum + item.quantity * item.currentPrice,
    0,
  );
  const invested = positions.reduce(
    (sum, item) => sum + item.quantity * item.avgCost,
    0,
  );
  const unrealizedPnl = marketValue - invested;
  const returnRate = invested === 0 ? 0 : (unrealizedPnl / invested) * 100;

  return { marketValue, invested, unrealizedPnl, returnRate };
})();

function currency(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 text-zinc-50 shadow-sm">
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(34,197,94,0.25),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.2),transparent_40%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <Badge className="bg-white/10 text-white hover:bg-white/10">
                myStock MVP
              </Badge>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  투자 관리 대시보드
                </h1>
                <p className="mt-1 text-sm text-zinc-300">
                  평단법 기준 수익률 계산 + 메모/거래 원장 기반 구조
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <CreateTransactionDialog triggerClassName="bg-white/10 text-white hover:bg-white/20" />
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>총 평가금액</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Wallet className="size-5 text-emerald-500" />
                {currency(summaries.marketValue)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>총 매입금액</CardDescription>
              <CardTitle className="text-2xl">
                {currency(summaries.invested)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>미실현 손익</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {summaries.unrealizedPnl >= 0 ? (
                  <TrendingUp className="size-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="size-5 text-rose-500" />
                )}
                <span
                  className={
                    summaries.unrealizedPnl >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }
                >
                  {currency(summaries.unrealizedPnl)}
                </span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>수익률 (평단법)</CardDescription>
              <CardTitle
                className={
                  summaries.returnRate >= 0
                    ? "text-2xl text-emerald-500"
                    : "text-2xl text-rose-500"
                }
              >
                {summaries.returnRate.toFixed(2)}%
              </CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>보유 종목</CardTitle>
              <CardDescription>
                미실현 손익은 `(현재가 - 평단가) x 보유수량` 기준으로 계산
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>종목</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                      <TableHead className="text-right">평단가</TableHead>
                      <TableHead className="text-right">현재가</TableHead>
                      <TableHead className="text-right">손익률</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((row) => {
                      const pnlRate =
                        ((row.currentPrice - row.avgCost) / row.avgCost) * 100;
                      const positive = pnlRate >= 0;
                      return (
                        <TableRow key={row.symbol}>
                          <TableCell>
                            <div className="font-medium">{row.symbol}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {row.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {currency(row.avgCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {currency(row.currentPrice)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${positive ? "text-emerald-500" : "text-rose-500"}`}
                          >
                            {pnlRate.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>다음 구현 우선순위</CardTitle>
              <CardDescription>
                Neon + Drizzle + Auth.js 조합 기준 MVP 로드맵
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                <p className="font-medium">1. 거래 원장 입력</p>
                <p className="mt-1 text-muted-foreground">
                  매수/매도/수수료/세금 저장 후 평단법으로 포지션 반영 (구현됨)
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                <p className="font-medium">2. 메모/투자일지</p>
                <p className="mt-1 text-muted-foreground">
                  종목별 메모와 거래별 메모 분리 저장
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                <p className="font-medium">3. 시세 동기화</p>
                <p className="mt-1 text-muted-foreground">
                  일별 종가 스냅샷 저장 후 기간 성과 분석
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border/70 p-3 text-muted-foreground">
                <Moon className="size-4 dark:hidden" />
                <Sun className="hidden size-4 dark:block" />
                다크모드 기본값 활성화됨
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
