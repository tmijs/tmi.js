var sinon = require("sinon");
var RateLimiter = require("../lib/ratelimiter");

function fillQueue(rateLimiter, amount) {
    rateLimiter.queue = Array(amount).fill(Date.now());
    rateLimiter.index = amount;
}

describe("Ratelimiter()", function() {
    beforeEach(function() { this.rateLimiter = new RateLimiter(30); });
    afterEach(function() { this.rateLimiter = null; });

    describe("constructor()", function() {
        it("should have default values", function() {
            this.rateLimiter.queue.should.be.empty().and.an.Array();
            this.rateLimiter.index.should.eql(0);
        });

        context("when initialized with a Boolean", function() {
            it("should handle true", function() {
                new RateLimiter(true).should.not.throw(TypeError);
            });

            it("should not handle false", function() {
                () => new RateLimiter(false).should.throw(TypeError);
            });
        });

        context("when initialized with a Number", function() {
            it("should handle 30", function() {
                new RateLimiter(30).should.not.throw(TypeError);
            });

            it("should handle 100", function() {
                new RateLimiter(100).should.not.throw(TypeError);
            });

            it("should handle 1.5", function() {
                new RateLimiter(1.5).should.not.throw(TypeError);
                new RateLimiter(1.5).limit.should.eql(2);
            });

            it("should not handle 0", function() {
                () => new RateLimiter(0).should.throw(TypeError);
            });

            it("should not handle 101", function() {
                () => new RateLimiter(101).should.throw(TypeError);
            });

            it("should not handle -100", function() {
                () => new RateLimiter(-100).should.throw(TypeError);
            });
        });

        context("when initialized with a String", function() {
            it("should handle 'user'", function() {
                var limiter = new RateLimiter("user");
                limiter.should.not.throw(TypeError);
                limiter.limit.should.eql(20);
            });

            it("should handle 'mod'", function() {
                var limiter = new RateLimiter("mod");
                limiter.should.not.throw(TypeError);
                limiter.limit.should.eql(100);
            })

            it("should not handle any other string", function() {
                () => new RateLimiter("string").should.throw(Error);
            });
        });
    });

    describe("canSendMessage()", function() {
        context("when you can send a message", function() {
            it("should return true", function() {
                this.rateLimiter.canSendMessage().should.be.true();
            });
        });

        context("when you cannot send a message", function() {
            beforeEach(function() { fillQueue(this.rateLimiter, 30); });

            it("should return false", function() {
                this.rateLimiter.canSendMessage().should.be.false();
            });

        });
    });

    describe("hit()", function() {
        before(function() { this.clock = sinon.useFakeTimers(Date.now()); });
        after(function() { this.clock.restore(); });

        context("when the queue is empty", function() {
            it("should add the current timestamp to the queue", function() {
                this.rateLimiter.queue.should.be.empty().and.an.Array();
                this.rateLimiter.hit().should.be.true();
                this.rateLimiter.queue[0].should.eql(Date.now());
            });
        });

        context("when the queue is full", function() {
            beforeEach(function() { fillQueue(this.rateLimiter, 30); });

            it("should not add a current timestamp to the queue", function() {
                var oldTimestamp = this.rateLimiter.queue[0];
                this.rateLimiter.hit().should.eql(false);
                this.rateLimiter.queue[0].should.eql(oldTimestamp);
            });
        });

        context("when the first timestamp is expired", function() {
            beforeEach(function() { fillQueue(this.rateLimiter, 30); });
            afterEach(function() { this.clock.restore(); })

            it("should replace the first queue item", function() {
                var oldTimestamp = this.rateLimiter.queue[0];

                // Wait 31 seconds
                this.clock.tick(31000);

                this.rateLimiter.hit().should.be.true();
                this.rateLimiter.queue[0].should.eql(Date.now());
            });
        });
    });
});
