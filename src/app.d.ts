/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare namespace App {
	// interface Locals {}
	// interface Platform {}
	// interface Session {}
	// interface Stuff {}
}

declare namespace svelteHTML {
	interface HTMLAttributes<T> {
		'on:emojimapready'?: (event: CustomEvent<any>) => void;
		'on:emojimapdestroyed'?: (event: CustomEvent<any>) => void;
		'on:swipeleft'?: (event: CustomEvent<any>) => void;
		'on:swiperight'?: (event: CustomEvent<any>) => void;
	}
}
