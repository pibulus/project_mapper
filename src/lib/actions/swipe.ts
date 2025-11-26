/**
 * Swipe Action
 * 
 * Dispatches 'swipeleft' and 'swiperight' events on touch devices.
 * Usage: <div use:swipe on:swipeleft={handler} on:swiperight={handler}>
 */

export function swipe(node: HTMLElement, parameters = { threshold: 50, timeout: 300 }) {
	let startX: number;
	let startY: number;
	let startTime: number;

	function handleTouchStart(e: TouchEvent) {
		const touch = e.touches[0];
		startX = touch.clientX;
		startY = touch.clientY;
		startTime = Date.now();
	}

	function handleTouchEnd(e: TouchEvent) {
		const touch = e.changedTouches[0];
		const endX = touch.clientX;
		const endY = touch.clientY;
		const endTime = Date.now();

		const diffX = endX - startX;
		const diffY = endY - startY;
		const duration = endTime - startTime;

		if (duration > parameters.timeout) return;

		// Ensure horizontal swipe is dominant
		if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > parameters.threshold) {
			if (diffX > 0) {
				node.dispatchEvent(new CustomEvent('swiperight'));
			} else {
				node.dispatchEvent(new CustomEvent('swipeleft'));
			}
		}
	}

	node.addEventListener('touchstart', handleTouchStart, { passive: true });
	node.addEventListener('touchend', handleTouchEnd, { passive: true });

	return {
		destroy() {
			node.removeEventListener('touchstart', handleTouchStart);
			node.removeEventListener('touchend', handleTouchEnd);
		}
	};
}
