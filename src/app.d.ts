import type { User, Session } from 'better-auth/minimal';
import type { Workspace } from '$lib/db/schema';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Window {
		turnstile: {
			render: (container: HTMLElement, options: Record<string, unknown>) => string;
			reset: (widgetId: string) => void;
			remove: (widgetId: string) => void;
		};
	}

	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
			workspace?: Workspace;
			workspaces?: Workspace[];
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
