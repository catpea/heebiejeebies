// SignalArray: A comprehensive exploration of reactive array patterns
// Drawing inspiration from industry-leading reactive frameworks

// ============================================================================
// 1. SOLID.JS PATTERN - Fine-grained reactivity with stores
// ============================================================================

// SolidJS uses createStore for reactive arrays with fine-grained updates
class SolidStyleArray {
  constructor(initial = []) {
    this.subscribers = new Set();
    this.data = initial;
    this.version = 0;

    // Create reactive proxy
    return new Proxy(this, {
      get(target, prop) {
        if (prop === 'length') {
          target.track();
          return target.data.length;
        }
        if (typeof prop === 'string' && !isNaN(prop)) {
          target.track();
          return target.data[prop];
        }
        if (prop in Array.prototype) {
          return target.createReactiveMethod(prop);
        }
        return target[prop];
      },
      set(target, prop, value) {
        if (prop === 'length') {
          target.data.length = value;
          target.notify();
          return true;
        }
        if (typeof prop === 'string' && !isNaN(prop)) {
          target.data[prop] = value;
          target.notify();
          return true;
        }
        return false;
      }
    });
  }

  track() {
    // Track current computation/effect
    if (currentComputation) {
      this.subscribers.add(currentComputation);
    }
  }

  notify() {
    this.version++;
    this.subscribers.forEach(sub => sub());
  }

  createReactiveMethod(method) {
    const self = this;
    return function(...args) {
      const result = Array.prototype[method].apply(self.data, args);
      // Notify for mutating methods
      if (['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].includes(method)) {
        self.notify();
      }
      return result;
    };
  }
}

// Usage example:
// const todos = new SolidStyleArray([{ text: 'Learn', done: false }]);
// todos.push({ text: 'Build', done: false }); // Triggers update

// ============================================================================
// 2. VUE 3 PATTERN - Deep reactivity with Proxy
// ============================================================================

class VueStyleReactive {
  constructor(initial = []) {
    this.deps = new Map(); // Property -> Set of effects
    this.version = 0;

    return this.reactive(initial);
  }

  reactive(target) {
    if (typeof target !== 'object') return target;

    return new Proxy(target, {
      get: (obj, prop) => {
        this.track(obj, prop);
        const value = obj[prop];

        // Deep reactivity for objects
        if (typeof value === 'object' && value !== null) {
          return this.reactive(value);
        }

        return value;
      },
      set: (obj, prop, value) => {
        const oldValue = obj[prop];

        // Only update if value changed
        if (oldValue !== value) {
          obj[prop] = value;
          this.trigger(obj, prop);
        }

        return true;
      },
      deleteProperty: (obj, prop) => {
        delete obj[prop];
        this.trigger(obj, prop);
        return true;
      }
    });
  }

  track(target, key) {
    if (!activeEffect) return;

    let depsMap = this.deps.get(target);
    if (!depsMap) {
      this.deps.set(target, depsMap = new Map());
    }

    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, dep = new Set());
    }

    dep.add(activeEffect);
  }

  trigger(target, key) {
    const depsMap = this.deps.get(target);
    if (!depsMap) return;

    const dep = depsMap.get(key);
    if (dep) {
      dep.forEach(effect => effect());
    }
  }
}

// Usage:
// const state = new VueStyleReactive([1, 2, 3]);
// state[0] = 10; // Triggers update
// state.push(4); // Also triggers update

// ============================================================================
// 3. MOBX PATTERN - Observable arrays with automatic tracking
// ============================================================================

class MobXStyleObservableArray {
  constructor(initial = []) {
    this.values = initial;
    this.observers = new Set();
    this.changeListeners = [];

    // Intercept array methods
    const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

    arrayMethods.forEach(method => {
      this[method] = function(...args) {
        const oldLength = this.values.length;
        const result = Array.prototype[method].apply(this.values, args);

        // Notify with change details
        this.notifyArrayChange({
          type: method,
          index: method === 'push' ? oldLength : 0,
          added: method === 'push' ? args : [],
          removed: [],
          oldLength,
          newLength: this.values.length
        });

        return result;
      };
    });

    // Proxy for indexed access
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'length') return target.values.length;
        if (typeof prop === 'string' && !isNaN(prop)) {
          target.reportObserved();
          return target.values[prop];
        }
        return undefined;
      },
      set(target, prop, value) {
        if (typeof prop === 'string' && !isNaN(prop)) {
          const index = Number(prop);
          const oldValue = target.values[index];
          target.values[index] = value;
          target.notifyArrayChange({
            type: 'update',
            index,
            newValue: value,
            oldValue
          });
          return true;
        }
        return false;
      }
    });
  }

  reportObserved() {
    if (currentObserver) {
      this.observers.add(currentObserver);
    }
  }

  notifyArrayChange(change) {
    this.changeListeners.forEach(listener => listener(change));
    this.observers.forEach(observer => observer());
  }

  observe(listener) {
    this.changeListeners.push(listener);
    return () => {
      const idx = this.changeListeners.indexOf(listener);
      if (idx >= 0) this.changeListeners.splice(idx, 1);
    };
  }

  map(fn) {
    this.reportObserved();
    return this.values.map(fn);
  }

  filter(fn) {
    this.reportObserved();
    return this.values.filter(fn);
  }

  find(fn) {
    this.reportObserved();
    return this.values.find(fn);
  }
}

// Usage:
// const todos = new MobXStyleObservableArray();
// todos.observe(change => console.log('Array changed:', change));
// todos.push({ text: 'New todo' });

// ============================================================================
// 4. SVELTE 5 PATTERN - Runes with deep reactivity
// ============================================================================

class SvelteStyleState {
  constructor(initial = []) {
    this.value = initial;
    this.subscribers = new Set();
    this.version = 0;

    // Make array deeply reactive
    return this.makeReactive(initial);
  }

  makeReactive(obj) {
    if (Array.isArray(obj)) {
      // Override array methods
      const reactive = [...obj];
      const arrayProto = Object.create(Array.prototype);

      ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
        arrayProto[method] = function(...args) {
          const result = Array.prototype[method].apply(this, args);
          this._notify();
          return result;
        };
      });

      Object.setPrototypeOf(reactive, arrayProto);
      reactive._notify = () => this.notify();

      // Make nested objects reactive
      reactive.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          reactive[i] = this.makeReactive(item);
        }
      });

      return reactive;
    }

    if (typeof obj === 'object' && obj !== null) {
      return new Proxy(obj, {
        set: (target, prop, value) => {
          target[prop] = value;
          this.notify();
          return true;
        }
      });
    }

    return obj;
  }

  notify() {
    this.version++;
    this.subscribers.forEach(sub => sub());
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
}

// Usage:
// const items = new SvelteStyleState([{ count: 0 }]);
// items[0].count++; // Triggers update
// items.push({ count: 1 }); // Also triggers update

// ============================================================================
// 5. PREACT SIGNALS PATTERN - Lightweight reactive arrays
// ============================================================================

class SignalArray {
  constructor(initial = []) {
    this.listeners = new Set();
    this.value = initial;

    // Create computed signals for common operations
    this.length = {
      get value() {
        return this.value.length;
      }
    };

    return new Proxy(this, {
      get(target, prop) {
        if (prop === 'value') {
          return target.value;
        }
        if (prop in target) {
          return target[prop];
        }
        // Delegate array methods
        if (prop in Array.prototype) {
          return function(...args) {
            const result = Array.prototype[prop].apply(target.value, args);

            // Notify on mutations
            if (['push', 'pop', 'shift', 'unshift', 'splice'].includes(prop)) {
              target.notify();
            }

            return result;
          };
        }
      },
      set(target, prop, value) {
        if (prop === 'value') {
          target.value = value;
          target.notify();
          return true;
        }
        return false;
      }
    });
  }

  notify() {
    this.listeners.forEach(listener => listener());
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn(); // Call immediately
    return () => this.listeners.delete(fn);
  }

  // Computed-like derived arrays
  map(fn) {
    const mapped = new SignalArray([]);

    this.subscribe(() => {
      mapped.value = this.value.map(fn);
    });

    return mapped;
  }

  filter(fn) {
    const filtered = new SignalArray([]);

    this.subscribe(() => {
      filtered.value = this.value.filter(fn);
    });

    return filtered;
  }
}

// Usage:
// const todos = new SignalArray([{ text: 'Task 1', done: false }]);
// const pending = todos.filter(t => !t.done);
// todos.push({ text: 'Task 2', done: false }); // Updates both arrays

// ============================================================================
// 6. ANGULAR SIGNALS PATTERN - With computed and effects
// ============================================================================

class AngularStyleSignalArray {
  constructor(initial = []) {
    this.value = initial;
    this.version = 0;
    this.computeds = new Set();
    this.effects = new Set();

    // Track array mutations
    this.value = this.wrapArray(initial);
  }

  wrapArray(arr) {
    const self = this;
    const wrapped = [...arr];

    // Override mutating methods
    ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
      wrapped[method] = function(...args) {
        const result = Array.prototype[method].apply(this, args);
        self.invalidate();
        return result;
      };
    });

    return wrapped;
  }

  get() {
    // Track access in computed context
    if (currentComputed) {
      currentComputed.dependencies.add(this);
      this.computeds.add(currentComputed);
    }
    return this.value;
  }

  set(newValue) {
    this.value = this.wrapArray(newValue);
    this.invalidate();
  }

  update(fn) {
    const newValue = fn(this.value);
    this.set(newValue);
  }

  invalidate() {
    this.version++;

    // Update computeds
    this.computeds.forEach(computed => computed.recompute());

    // Run effects
    this.effects.forEach(effect => effect());
  }

  // Create computed signal from this array
  computed(fn) {
    const computed = {
      value: undefined,
      dependencies: new Set(),
      recompute() {
        const prevComputed = currentComputed;
        currentComputed = this;
        this.value = fn();
        currentComputed = prevComputed;
      }
    };

    computed.recompute();
    return computed;
  }

  effect(fn) {
    this.effects.add(fn);
    fn(); // Run immediately
    return () => this.effects.delete(fn);
  }
}

// Usage:
// const items = new AngularStyleSignalArray([1, 2, 3]);
// const sum = items.computed(() => items.get().reduce((a, b) => a + b, 0));
// items.effect(() => console.log('Sum:', sum.value));
// items.push(4); // Logs: Sum: 10

// ============================================================================
// 7. UNIFIED SIGNAL ARRAY - Best of all worlds
// ============================================================================

class UnifiedSignalArray {
  constructor(initial = [], options = {}) {
    this.data = initial;
    this.options = {
      deep: true,
      trackMutations: true,
      ...options
    };

    this.subscribers = new Map(); // id -> callback
    this.computeds = new Map(); // id -> computed
    this.version = 0;
    this.mutationQueue = [];
    this.scheduledUpdate = null;

    return this.createProxy();
  }

  createProxy() {
    const handler = {
      get: (target, prop) => {
        // Array length
        if (prop === 'length') {
          this.track('length');
          return this.data.length;
        }

        // Array indices
        if (typeof prop === 'string' && !isNaN(prop)) {
          this.track(`index:${prop}`);
          const value = this.data[prop];

          // Deep reactivity
          if (this.options.deep && typeof value === 'object' && value !== null) {
            return this.makeReactive(value, `${prop}`);
          }

          return value;
        }

        // Array methods
        if (prop in Array.prototype) {
          return this.wrapArrayMethod(prop);
        }

        // Custom methods
        if (prop in this) {
          return this[prop].bind(this);
        }

        return undefined;
      },

      set: (target, prop, value) => {
        if (prop === 'length') {
          const oldLength = this.data.length;
          this.data.length = value;
          this.notify('length', { oldValue: oldLength, newValue: value });
          return true;
        }

        if (typeof prop === 'string' && !isNaN(prop)) {
          const index = Number(prop);
          const oldValue = this.data[index];
          this.data[index] = value;
          this.notify(`index:${index}`, { index, oldValue, newValue: value });
          return true;
        }

        return false;
      },

      has: (target, prop) => {
        return prop in this.data || prop in this;
      }
    };

    return new Proxy(this, handler);
  }

  makeReactive(obj, path = '') {
    if (Array.isArray(obj)) {
      return new UnifiedSignalArray(obj, this.options);
    }

    if (typeof obj === 'object' && obj !== null) {
      return new Proxy(obj, {
        get: (target, prop) => {
          this.track(`${path}.${prop}`);
          const value = target[prop];

          if (this.options.deep && typeof value === 'object' && value !== null) {
            return this.makeReactive(value, `${path}.${prop}`);
          }

          return value;
        },
        set: (target, prop, value) => {
          const oldValue = target[prop];
          target[prop] = value;
          this.notify(`${path}.${prop}`, { path: `${path}.${prop}`, oldValue, newValue: value });
          return true;
        }
      });
    }

    return obj;
  }

  wrapArrayMethod(method) {
    const self = this;

    return function(...args) {
      const oldLength = self.data.length;
      const oldArray = [...self.data];

      // Execute method
      const result = Array.prototype[method].apply(self.data, args);

      // Track mutations
      if (self.options.trackMutations && ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].includes(method)) {
        const mutation = {
          type: method,
          args,
          oldLength,
          newLength: self.data.length,
          oldArray,
          newArray: [...self.data]
        };

        self.queueMutation(mutation);
      }

      return result;
    };
  }

  track(key) {
    // Track in current computation context
    if (globalThis.currentEffect) {
      globalThis.currentEffect.dependencies.add({ target: this, key });
    }
  }

  notify(key, change) {
    this.version++;

    // Batch mutations
    if (this.options.batchUpdates) {
      this.scheduleUpdate();
    } else {
      this.runUpdate(key, change);
    }
  }

  queueMutation(mutation) {
    this.mutationQueue.push(mutation);
    this.notify('mutation', mutation);
  }

  scheduleUpdate() {
    if (!this.scheduledUpdate) {
      this.scheduledUpdate = queueMicrotask(() => {
        this.flushUpdates();
        this.scheduledUpdate = null;
      });
    }
  }

  flushUpdates() {
    const mutations = [...this.mutationQueue];
    this.mutationQueue = [];

    // Notify subscribers
    this.subscribers.forEach(callback => {
      callback({ mutations, version: this.version });
    });

    // Update computeds
    this.computeds.forEach(computed => {
      computed.dirty = true;
    });
  }

  runUpdate(key, change) {
    // Immediate update
    this.subscribers.forEach(callback => {
      callback({ key, change, version: this.version });
    });
  }

  // Public API
  subscribe(callback) {
    const id = Symbol();
    this.subscribers.set(id, callback);

    return () => {
      this.subscribers.delete(id);
    };
  }

  computed(fn) {
    const computed = {
      id: Symbol(),
      fn,
      value: undefined,
      dirty: true,
      dependencies: new Set(),

      get() {
        if (this.dirty) {
          const prevEffect = globalThis.currentEffect;
          globalThis.currentEffect = this;

          this.value = this.fn();
          this.dirty = false;

          globalThis.currentEffect = prevEffect;
        }
        return this.value;
      }
    };

    this.computeds.set(computed.id, computed);
    return computed;
  }

  // Utility methods
  map(fn) {
    this.track('map');
    return this.data.map(fn);
  }

  filter(fn) {
    this.track('filter');
    return this.data.filter(fn);
  }

  reduce(fn, initial) {
    this.track('reduce');
    return this.data.reduce(fn, initial);
  }

  find(fn) {
    this.track('find');
    return this.data.find(fn);
  }

  findIndex(fn) {
    this.track('findIndex');
    return this.data.findIndex(fn);
  }

  includes(value) {
    this.track('includes');
    return this.data.includes(value);
  }

  slice(start, end) {
    this.track('slice');
    return this.data.slice(start, end);
  }

  // Reactive derived arrays
  derivedMap(fn) {
    const derived = new UnifiedSignalArray([], this.options);

    this.subscribe(() => {
      derived.data = this.data.map(fn);
      derived.notify('derived', { source: 'map' });
    });

    return derived;
  }

  derivedFilter(fn) {
    const derived = new UnifiedSignalArray([], this.options);

    this.subscribe(() => {
      derived.data = this.data.filter(fn);
      derived.notify('derived', { source: 'filter' });
    });

    return derived;
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Basic usage
const todos = new UnifiedSignalArray([
  { id: 1, text: 'Learn reactive patterns', done: false },
  { id: 2, text: 'Build SignalArray', done: false }
]);

// Subscribe to changes
const unsubscribe = todos.subscribe(({ mutations }) => {
  console.log('Todos changed:', mutations);
});

// Example 2: Deep reactivity
todos[0].done = true; // Triggers update
todos.push({ id: 3, text: 'Ship to production', done: false }); // Also triggers

// Example 3: Computed values
const completedCount = todos.computed(() =>
  todos.filter(todo => todo.done).length
);

const pendingTodos = todos.derivedFilter(todo => !todo.done);

// Example 4: Batch updates
const batchedArray = new UnifiedSignalArray([], { batchUpdates: true });
batchedArray.push(1);
batchedArray.push(2);
batchedArray.push(3); // Only one update notification

// Export for use
export {
  UnifiedSignalArray,
  SignalArray,
  SolidStyleArray,
  VueStyleReactive,
  MobXStyleObservableArray,
  SvelteStyleState,
  AngularStyleSignalArray
};
