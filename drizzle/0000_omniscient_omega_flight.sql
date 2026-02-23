CREATE TYPE "public"."market" AS ENUM('KRX', 'NASDAQ', 'NYSE', 'ETF');--> statement-breakpoint
CREATE TYPE "public"."portfolio_currency" AS ENUM('KRW', 'USD');--> statement-breakpoint
CREATE TYPE "public"."transaction_side" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticator_userId_credentialID_pk" PRIMARY KEY("userId","credentialID"),
	CONSTRAINT "authenticator_credentialID_unique" UNIQUE("credentialID")
);
--> statement-breakpoint
CREATE TABLE "portfolio_metrics_daily" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portfolio_metrics_daily_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"portfolioId" text NOT NULL,
	"tradingDay" timestamp NOT NULL,
	"marketValue" numeric(20, 6) NOT NULL,
	"costBasis" numeric(20, 6) NOT NULL,
	"unrealizedPnl" numeric(20, 6) NOT NULL,
	"realizedPnlCumulative" numeric(20, 6) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"currency" "portfolio_currency" DEFAULT 'KRW' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolioId" text NOT NULL,
	"securityId" text NOT NULL,
	"quantity" numeric(20, 8) DEFAULT '0' NOT NULL,
	"avgCostPerShare" numeric(20, 6) DEFAULT '0' NOT NULL,
	"totalCostBasis" numeric(20, 6) DEFAULT '0' NOT NULL,
	"realizedPnl" numeric(20, 6) DEFAULT '0' NOT NULL,
	"lastCalculatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"securityId" text NOT NULL,
	"tradingDay" timestamp NOT NULL,
	"closePrice" numeric(20, 6) NOT NULL,
	"source" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"market" "market" NOT NULL,
	"name" text NOT NULL,
	"currency" "portfolio_currency" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_note" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolioId" text NOT NULL,
	"securityId" text NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_note" (
	"id" text PRIMARY KEY NOT NULL,
	"transactionId" text NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolioId" text NOT NULL,
	"securityId" text NOT NULL,
	"side" "transaction_side" NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"unitPrice" numeric(20, 6) NOT NULL,
	"feeAmount" numeric(20, 6) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(20, 6) DEFAULT '0' NOT NULL,
	"tradeDate" timestamp NOT NULL,
	"executedAt" timestamp,
	"memo" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticator" ADD CONSTRAINT "authenticator_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_metrics_daily" ADD CONSTRAINT "portfolio_metrics_daily_portfolioId_portfolio_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position" ADD CONSTRAINT "position_portfolioId_portfolio_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position" ADD CONSTRAINT "position_securityId_security_id_fk" FOREIGN KEY ("securityId") REFERENCES "public"."security"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshot" ADD CONSTRAINT "price_snapshot_securityId_security_id_fk" FOREIGN KEY ("securityId") REFERENCES "public"."security"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_note" ADD CONSTRAINT "security_note_portfolioId_portfolio_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_note" ADD CONSTRAINT "security_note_securityId_security_id_fk" FOREIGN KEY ("securityId") REFERENCES "public"."security"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_note" ADD CONSTRAINT "transaction_note_transactionId_transaction_id_fk" FOREIGN KEY ("transactionId") REFERENCES "public"."transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_portfolioId_portfolio_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_securityId_security_id_fk" FOREIGN KEY ("securityId") REFERENCES "public"."security"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_metrics_daily_idx" ON "portfolio_metrics_daily" USING btree ("portfolioId","tradingDay");--> statement-breakpoint
CREATE UNIQUE INDEX "position_portfolio_security_idx" ON "position" USING btree ("portfolioId","securityId");--> statement-breakpoint
CREATE UNIQUE INDEX "price_snapshot_security_day_idx" ON "price_snapshot" USING btree ("securityId","tradingDay");--> statement-breakpoint
CREATE UNIQUE INDEX "security_symbol_market_idx" ON "security" USING btree ("symbol","market");