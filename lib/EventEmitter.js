/// <reference path="../types.d.ts" />

class EventEmitter {
	constructor() {
		this._events = new Map();
		this._maxListeners = 0;
	}
	setMaxListeners(n) {
		this._maxListeners = n;
		return this;
	}
	emit(eventType, ...args) {
		if(eventType === 'error' && (!this._events.has('error') || !this._events.get('error').length)) {
			if(args[0] instanceof Error) {
				throw args[0];
			}
			throw TypeError('Uncaught, unspecified "error" event.');
		}
		const listeners = this._events.get(eventType);
		if(!listeners) {
			return false;
		}
		listeners.forEach(listener => listener.apply(this, args));
		return true;
	}
	// Emit multiple events
	emits(types, values) {
		for(let i = 0; i < types.length; i++) {
			const val = i < values.length ? values[i] : values[values.length - 1];
			this.emit(types[i], ...val);
		}
	}
	on(eventType, listener) {
		if(!this._events.has(eventType)) {
			this._events.set(eventType, []);
		}
		const listeners = this._events.get(eventType);
		if(this._maxListeners && listeners.length >= this._maxListeners) {
			throw Error(`Max listeners exceeded for event '${eventType}'`);
		}
		listeners.push(listener);
		return this;
	}
	once(eventType, listener) {
		const onceListener = (...args) => {
			this.removeListener(eventType, onceListener);
			listener(...args);
		};
		return this.on(eventType, onceListener);
	}
	off(eventType, listener) {
		const listeners = this._events.get(eventType);
		if(!listeners) {
			return this;
		}
		const index = listeners.indexOf(listener);
		if(index === -1) {
			return this;
		}
		listeners.splice(index, 1);
		if(listeners.length === 0) {
			this._events.delete(eventType);
		}
		return this;
	}
	removeAllListeners(eventType) {
		if(!eventType) {
			this._events.clear();
		}
		else {
			this._events.delete(eventType);
		}
		return this;
	}
	listeners(eventType) {
		return this._events.get(eventType) || [];
	}
	listenerCount(eventType) {
		return this._events.get(eventType) ? this._events.get(eventType).length : 0;
	}
}

EventEmitter.prototype.addListener = EventEmitter.prototype.on;
EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

EventEmitter.EventEmitter = EventEmitter;

EventEmitter.defaultMaxListeners = 10;

module.exports = EventEmitter;
