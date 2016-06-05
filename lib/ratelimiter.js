var intervalInMiliseconds = 30000;
var messageLimit = 100;

function slotAllowedToBeUsed(timestamp) {
    timestamp = timestamp || 0;
    return timestamp + intervalInMiliseconds < Date.now();
}

function RateLimiter() {
    this.queue = [];
    this.index = 0;
}

RateLimiter.prototype.canSendMessage = function canSendMessage() {
    var index = this.index;
    if (index === messageLimit) { index = this.index = 0; }

    return slotAllowedToBeUsed(this.queue[this.index]);
}

RateLimiter.prototype.hit = function hit() {
    if (!this.canSendMessage()) { return false; }

    this.queue[this.index] = Date.now();
    this.index++;
    return true;
}

module.exports = RateLimiter;
