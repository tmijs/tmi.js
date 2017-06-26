// Initialize the queue with a specific delay..
function queue(defaultDelay) {
    this.queue = [];
    this.index = 0;
    this.defaultDelay = defaultDelay || 3000;
}

// Add a new function to the queue..
queue.prototype.add = function add(fn, delay) {
    this.queue.push({
        fn: fn,
        delay: delay
    });
};

// Run the current queue..
queue.prototype.run = function run(index) {
    (index || index === 0) && (this.index = index);
    this.next();
};

// Go to the next in queue..
queue.prototype.next = function next() {
    var i = this.index++;
    var at = this.queue[i];
    var next = this.queue[this.index];

    if (!at) { return; }

    at.fn();
    next && setTimeout(() => {
        this.next();
    }, next.delay || this.defaultDelay);
};

// Reset the queue..
queue.prototype.reset = function reset() {
    this.index = 0;
};

// Clear the queue..
queue.prototype.clear = function clear() {
    this.index = 0;
    this.queue = [];
};

exports.queue = queue;
