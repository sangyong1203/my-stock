"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createTransactionAction,
  transactionActionInitialState,
} from "@/app/actions/transaction-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "저장 중..." : "거래 저장"}
    </Button>
  );
}

type Props = {
  triggerClassName?: string;
};

export function CreateTransactionDialog({ triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    createTransactionAction,
    transactionActionInitialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      const timer = window.setTimeout(() => setOpen(false), 0);
      return () => window.clearTimeout(timer);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className={triggerClassName}>
          거래 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>거래 입력</DialogTitle>
          <DialogDescription>
            평단법 기준으로 `transaction` 저장 후 `position`을 갱신합니다.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="symbol">종목코드</Label>
              <Input id="symbol" name="symbol" placeholder="AAPL" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityName">종목명</Label>
              <Input
                id="securityName"
                name="securityName"
                placeholder="Apple Inc."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="market">시장</Label>
              <select
                id="market"
                name="market"
                defaultValue="NASDAQ"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="KRX">KRX</option>
                <option value="NASDAQ">NASDAQ</option>
                <option value="NYSE">NYSE</option>
                <option value="ETF">ETF</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">통화</Label>
              <select
                id="currency"
                name="currency"
                defaultValue="USD"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="USD">USD</option>
                <option value="KRW">KRW</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="side">구분</Label>
              <select
                id="side"
                name="side"
                defaultValue="buy"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="buy">매수</option>
                <option value="sell">매도</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradeDate">거래일</Label>
              <Input id="tradeDate" name="tradeDate" type="date" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">수량</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="0.00000001"
                placeholder="10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">단가</Label>
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                min="0"
                step="0.000001"
                placeholder="185.25"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feeAmount">수수료</Label>
              <Input
                id="feeAmount"
                name="feeAmount"
                type="number"
                min="0"
                step="0.000001"
                defaultValue="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxAmount">세금</Label>
              <Input
                id="taxAmount"
                name="taxAmount"
                type="number"
                min="0"
                step="0.000001"
                defaultValue="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">거래 메모</Label>
            <textarea
              id="memo"
              name="memo"
              rows={3}
              placeholder="매수/매도 사유, 리스크 체크..."
              className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thesisNote">종목 메모 (선택)</Label>
            <textarea
              id="thesisNote"
              name="thesisNote"
              rows={3}
              placeholder="종목 관점/가설/체크리스트"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>

          {state.message ? (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                state.success
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {state.message}
            </div>
          ) : null}

          <div className="flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <Badge variant="outline">비로그인 시 demo portfolio 사용</Badge>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
