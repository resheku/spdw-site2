declare namespace App {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface Locals {}
}

declare module '*.sql' {
	const content: string;
	export default content;
}
