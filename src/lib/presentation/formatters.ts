export function initials(name: string | null | undefined, email: string) {
	const source = (name ?? '').trim() || email;
	return source
		.split(/\s+/)
		.map((segment) => segment[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

export function formatShortDate(value: string | Date) {
	const date = typeof value === 'string' ? new Date(value) : value;
	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function formatDateTime(value: string | Date) {
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit'
	});
}

export function formatRelativeTime(value: string | Date) {
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return String(value);

	const diffMs = Date.now() - date.getTime();
	const sec = Math.round(diffMs / 1000);
	if (sec < 10) return 'just now';
	if (sec < 60) return `${sec}s ago`;

	const min = Math.round(sec / 60);
	if (min < 60) return `${min}m ago`;

	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr}h ago`;

	const day = Math.round(hr / 24);
	if (day < 7) return `${day}d ago`;

	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
