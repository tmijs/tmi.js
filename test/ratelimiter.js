var sinon = require("sinon");
var RateLimiter = require("./../lib/ratelimiter");

function fillQueue(rateLimiter) {
  rateLimiter.queue = Array(100).fill(Date.now());
  rateLimiter.index = 100;
}

describe("Ratelimiter()", function() {
  var rateLimiter;
  beforeEach(function() { rateLimiter = new RateLimiter(); });

  describe("constructor()", function() {
    it("should have default values", function() {
      rateLimiter.queue.should.be.empty().and.an.Array();
      rateLimiter.index.should.eql(0);
    });
  })

  describe("canSendMessage()", function() {
    context("when you can send a message", function() {
      it("should return true", function() {
        rateLimiter.canSendMessage().should.be.true();
      });
    });

    context("when you cannot send a message", function() {
      beforeEach(function() { fillQueue(rateLimiter); });

      it("should return false", function() {
        rateLimiter.canSendMessage().should.be.false();
      });

    });
  });

  describe("hit()", function() {
    var clock;

    before(function() { clock = sinon.useFakeTimers(Date.now()); });
    after(function() { clock.restore(); });

    context("when the queue is empty", function() {
      it("should add the current timestamp to the queue", function() {
        rateLimiter.queue.should.be.empty().and.an.Array();
        rateLimiter.hit().should.be.true();
        rateLimiter.queue[0].should.eql(Date.now());
      });
    });

    context("when the queue is full", function() {
      beforeEach(function() { fillQueue(rateLimiter); });

      it("should not add a current timestamp to the queue", function() {
        var oldTimestamp = rateLimiter.queue[0];
        rateLimiter.hit().should.eql(false);
        rateLimiter.queue[0].should.eql(oldTimestamp);
      });
    });

    context("when the first timestamp is expired", function() {
      beforeEach(function() { fillQueue(rateLimiter); });
      afterEach(function() { clock.restore(); })

      it("should replace the first queue item", function() {
        var oldTimestamp = rateLimiter.queue[0];

        // Wait 31 seconds
        clock.tick(31000);

        rateLimiter.hit().should.be.true();
        rateLimiter.queue[0].should.eql(Date.now());
      });
    });
  });
});
