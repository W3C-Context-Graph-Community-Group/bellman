class EventBus {
  constructor() {
    this._listeners = {};
  }

  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }

  off(event, cb) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(fn => fn !== cb);
  }

  emit(event, data) {
    if (!this._listeners[event]) return;
    for (const cb of this._listeners[event]) {
      cb(data);
    }
  }
}

export default new EventBus();
