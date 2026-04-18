import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from "$lib/db";
import { PUBLIC_APP_URL } from '$env/static/public';
import { BETTER_AUTH_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
import { randomUUID } from 'crypto';

export const auth = betterAuth({
  baseURL: PUBLIC_APP_URL,
  secret: BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, { 
    provider: "pg"
  }), 
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
  },

  socialProviders: {
    github: {
      clientId: GITHUB_CLIENT_ID || "",
      clientSecret: GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: GOOGLE_CLIENT_ID || "",
      clientSecret: GOOGLE_CLIENT_SECRET || "",
    },
  },

  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
    expiresAfter: 60 * 60 * 24 * 30, // 30 days
    freshAge: 0,
  },

  advanced: {
    generateId: () => randomUUID(),
    cookiePrefix: "asynchub",
    secureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: { enabled: false },
  },

  user: {
    // Extend user schema if needed
    additionalFields: {},
  },

  plugins: [
	  sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
  ]
  
});
