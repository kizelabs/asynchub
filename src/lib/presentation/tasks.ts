export type TaskActivityEntry = {
	id: string;
	action: string;
	oldValue: string | null;
	newValue: string | null;
	createdAt: string;
	userId: string | null;
	userName: string | null;
	userEmail: string | null;
	userImage: string | null;
};

type MemberLookup = Record<
	string,
	{
		name?: string | null;
		email: string;
	}
>;

export const TASK_STATUS_OPTIONS = [
	{ value: 'todo', label: 'To Do', accent: 'bg-gray-100 text-gray-700' },
	{ value: 'in_progress', label: 'In Progress', accent: 'bg-amber-100 text-amber-800' },
	{ value: 'done', label: 'Done', accent: 'bg-green-100 text-green-800' }
] as const;

export function actorLabel(entry: TaskActivityEntry) {
	if (entry.userName && entry.userName.trim()) return entry.userName;
	if (entry.userEmail) return entry.userEmail;
	return 'Unknown user';
}

export function formatTaskActivity(entry: TaskActivityEntry, memberMap: MemberLookup) {
	switch (entry.action) {
		case 'created':
			return 'created the task';
		case 'status_changed':
			return `changed status from ${entry.oldValue ?? '?'} to ${entry.newValue ?? '?'}`;
		case 'assignees_added': {
			const ids = (entry.newValue ?? '').split(',').filter(Boolean);
			const names = ids.map((id) => memberMap[id]?.name || memberMap[id]?.email || 'Unknown');
			return `assigned ${names.join(', ')}`;
		}
		default:
			return entry.action;
	}
}
