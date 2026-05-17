export const PROJECT_STATUS_OPTIONS = [
	{ value: 'active', label: 'Active' },
	{ value: 'paused', label: 'Paused' },
	{ value: 'completed', label: 'Completed' }
] as const;

export const PROJECT_STATUS_CLASSES: Record<string, string> = {
	active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
	paused: 'border-amber-200 bg-amber-50 text-amber-800',
	completed: 'border-blue-200 bg-blue-50 text-blue-700'
};
