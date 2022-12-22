import Emittery from 'emittery';
import WebSocket from 'ws';

enum SocketCloseReason {
	CLOSE = 'close',
	CLOSE_EARLY = 'closeEarly',
}

interface ManagedSocketEvents {
	open: undefined;
	message: string;
	close: undefined;
	error: Error;
}

export default class ManagedSocket extends Emittery<ManagedSocketEvents> {
	address: string;
	socket: WebSocket | null;
	shouldReconnect: boolean;
	closeReason: SocketCloseReason | Error | null;
	openedAt: number | null;
	constructor(address: string) {
		super();
		this.address = address;
		this.socket = null;
		this.shouldReconnect = true;
		this.closeReason = null;
		this.openedAt = null;
	}
	_addListeners() {
		if(!this.socket) {
			return;
		}
		this.socket.on('open', () => this._onOpen());
		this.socket.on('message', data => this._onMessage(data.toString()));
		this.socket.on('close', () => this._onClose());
		this.socket.on('error', error => this._onError(error));
	}
	_onOpen() {
		this.openedAt = Date.now();
		this.emit('open');
	}
	_onMessage(data: string) {
		this.emit('message', data);
	}
	_onClose() {
		const now = Date.now();
		if(this.openedAt && now - this.openedAt < 200) {
			console.log('Socket closed too early, reconnecting...');
			this.closeReason = SocketCloseReason.CLOSE_EARLY;
		}
		else {
			this.closeReason = SocketCloseReason.CLOSE;
		}
		this.emit('close');
	}
	_onError(error: Error) {
		this.closeReason = error;
		this.emit('error', error);
	}

	connect() {
		if(this.socket) {
			this.socket.close();
		}
		this.socket = new WebSocket(this.address);
		this._addListeners();
	}
	disconnect() {
		this.closeReason = SocketCloseReason.CLOSE;
		if(this.socket) {
			this.socket.close();
			this.socket.removeAllListeners();
		}
		this.socket = null;
	}
	reconnect() {
		this.disconnect();
		this.connect();
	}

	send(data: string) {
		if(!this.socket) {
			throw new Error('Socket is not connected');
		}
		this.socket.send(data, error => {
			if(error) {
				this._onError(error);
			}
		});
	}
}