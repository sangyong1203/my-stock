CREATE TABLE "watchlist_item" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolioId" text NOT NULL,
	"securityId" text NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watchlist_item" ADD CONSTRAINT "watchlist_item_portfolioId_portfolio_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_item" ADD CONSTRAINT "watchlist_item_securityId_security_id_fk" FOREIGN KEY ("securityId") REFERENCES "public"."security"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_item_portfolio_security_idx" ON "watchlist_item" USING btree ("portfolioId","securityId");