// The amount of time before a queue entry it allowed to be overwritten
var intervalInMiliseconds = 30000;
var preDefinedLimits = {
    "user": 20,
    "mod": 100
};

function error(limit) {
    throw new TypeError(
        `[Config] Ratelimiter setup with: ${limit}, but expected: either a ` +
        `boolean, a String ("user" or "mod") or a number (below 100). ` +
        `Please check your IRC client configuration.`
    );
}

function setLimit(limit) {
    switch(typeof limit) {
        case "boolean":
            if (!limit) return error(limit);
            return preDefinedLimits['user'];
        case "number":
            if (limit <= 0 || limit > 100) return error(limit);
            return Math.round(limit);
        case "string":
            if (!preDefinedLimits[limit]) return error(limit);
            return preDefinedLimits[limit];
        default:
            return error(limit);
    }
}

function slotAllowedToBeUsed(timestamp) {
    timestamp = timestamp || 0;
    return timestamp + intervalInMiliseconds < Date.now();
}

/**
 * The RateLimiter class constructor
 * @param {Number|String|Boolean} limit the amount of message is being allowed per 30 seconds
 */
function RateLimiter(limit) {
    this.limit = setLimit(limit);
    this.queue = [];
    this.index = 0;
}

/**
 * Checks if the next message is not going to hit the ratelimit
 * @return {Boolean} whether it is allowed to send a message
 */
RateLimiter.prototype.canSendMessage = function canSendMessage() {
    var index = this.index;
    if (index === this.limit) { index = this.index = 0; }

    return slotAllowedToBeUsed(this.queue[index]);
}

/**
 * Adds an entry to the ratelimiter queue
 * @return {Boolean} whether it is allowed to add the entry to the queue
 */
RateLimiter.prototype.hit = function hit() {
    if (!this.canSendMessage()) { return false; }

    this.queue[this.index] = Date.now();
    this.index++;
    return true;
}

module.exports = RateLimiter;
