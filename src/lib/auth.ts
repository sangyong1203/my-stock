import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { db, schema } from "@/db";

const githubClientId = process.env.GITHUB_ID;
const githubClientSecret = process.env.GITHUB_SECRET;

if (!githubClientId || !githubClientSecret) {
  throw new Error("Missing GITHUB_ID or GITHUB_SECRET environment variable.");
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
    authenticatorsTable: schema.authenticators,
  }),
  session: {
    strategy: "database",
  },
  providers: [
    GitHubProvider({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
};
