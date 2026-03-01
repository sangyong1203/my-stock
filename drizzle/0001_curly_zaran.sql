CREATE TABLE "dashboard_preference" (
	"userId" text PRIMARY KEY NOT NULL,
	"layout" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dashboard_preference" ADD CONSTRAINT "dashboard_preference_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;