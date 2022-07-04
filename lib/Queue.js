// Initialize the queue with a specific delay
class Queue {
	constructor(defaultDelay) {
		this.queue = [];
		this.index = 0;
		this.defaultDelay = defaultDelay === undefined ? 3000 : defaultDelay;
	}
	// Add a new function to the queue
	add(fn, delay) {
		this.queue.push({ fn, delay });
	}
	// Go to the next in queue
	next() {
		const i = this.index++;
		const at = this.queue[i];
		if(!at) {
			return;
		}
		const next = this.queue[this.index];
		at.fn();
		if(next) {
			const delay = next.delay === undefined ? this.defaultDelay : next.delay;
			setTimeout(() => this.next(), delay);
		}
	}
}

module.exports = Queue;
