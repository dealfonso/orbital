export class StateController {
    static transitions = {};
    static DEBUG = false;

    static log(...args) {
        if (this.DEBUG) {
            console.log(...args);
        }
    }

    /**
     * Validates if a transition from one state to another is allowed.
     * @param {string} fromState 
     * @param {string} toState 
     * @returns {boolean} true if the transition is valid, false otherwise.
     */
    validateTransition(fromState, toState) {
        if (!this.constructor.transitions) {
            throw new Error("Transitions are not defined for this StateController");
        }
        if (Object.keys(this.constructor.transitions).length === 0) {
            throw new Error("Transitions are empty for this StateController");
        }
        if (!this.constructor.transitions[fromState]) {
            throw new Error(`No transitions defined for state "${fromState}"`);
        }
        return this.constructor.transitions[fromState] && this.constructor.transitions[fromState].includes(toState);
    }

    /**
     * Creates a new StateController instance with the specified initial state.
     * @param {string} firstState 
     */
    constructor(firstState) {
        this.state = firstState;
        this.callbacks = {};
    }

    /**
     * Register a callback function to be called when the state changes to the specified state. The callback will receive the previous state, the new state, and the controller instance as arguments.
     *  - There is a special state name "*" that can be used to register callbacks that will be called on every state change, regardless of the new state.
     *  - Multiple callbacks can be registered for the same state, and they will be called in the order they were registered.
     * @param {string} event: The event name to listen for. For example, "change" or "enter".
     * @param {string} state
     * @param {function(string, string, StateController)} callback
     * @return {function()} a function that can be called to unregister the callback.
     */
    on(event, state, callback) {
        if (!this.callbacks) {
            this.callbacks = {};
        }
        if (!this.callbacks[`${event}:${state}`]) {
            this.callbacks[`${event}:${state}`] = [];
        }
        this.callbacks[`${event}:${state}`].push(callback);
        return () => this.off(event, state, callback);
    }


    /**
     * Unregister a callback function for the specified state.
     * @param {string} event The event name to stop listening for. For example, "change" or "enter".
     * @param {string} state
     * @param {function(string, string, StateController)} callback
     * @return {boolean} true if the callback was found and removed, false otherwise.
     */
    off(event, state, callback) {
        if (this.callbacks && this.callbacks[`${event}:${state}`]) {
            const index = this.callbacks[`${event}:${state}`].indexOf(callback);
            if (index !== -1) {
                this.callbacks[`${event}:${state}`].splice(index, 1);
                return true;
            }
        }
        return false;
    }

    onEnter(state, callback) {
        return this.on("enter", state, callback);
    }

    onLeave(state, callback) {
        return this.on("leave", state, callback);
    }

    /**
     * Emit an event for the specified state, calling all registered callbacks for that state and for the special "*" state.
     * @param {string} state 
     * @param  {...any} args 
     */
    emit(event, state, ...args) {
        if (this.callbacks && this.callbacks[`${event}:${state}`]) {
            StateController.log(`Emitting event "${event}" for state "${state}" with args:`, args);
            this.callbacks[`${event}:${state}`].forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in callback for state ${state}:`, error);
                }
            });
        }
        if (this.callbacks && this.callbacks[`${event}:*`]) {
            StateController.log(`Emitting event "${event}" for state "${state}" with args:`, args);
            this.callbacks[`${event}:*`].forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in callback for state ${state}:`, error);
                }
            });
        }
    }

    /**
     * Force the state to a new value, regardless of valid transitions.
     * @param {string} newState 
     * @param {boolean} callCallbacks: If true, the callbacks for the new state (and for "*") will be called (if needed). If false, the callbacks will not be called.
     */
    forceState(newState, callCallbacks = false) {
        StateController.log(`Forcing state from ${this.state} to ${newState}`);
        const prevState = this.state;
        if (callCallbacks) {
            this.emit("leave", this.state, prevState, newState, this);
        }
        this.state = newState;
        this.stateTime = Date.now();
        if (callCallbacks) {
            this.emit("enter", newState, prevState, newState, this);
        }
    }

    /**
     * Change the current state to the specified new state. If the transition from the current state to the new state is valid according to the defined transitions, the state will be updated and the registered callbacks for the new state (and for "*") will be called.
     * 
     * @param {string} newState 
     * @returns {boolean} true if the state was changed, false if the transition was invalid or if the new state is the same as the current state.
     */
    change(newState) {
        StateController.log(`Changing state from ${this.state} to ${newState}`);
        if (newState === this.state) {
            return false; // No hacemos nada si el estado no cambia
        }
        if (this.validateTransition(this.state, newState)) {
            const prevState = this.state;

            this.emit("leave", this.state, prevState, newState, this);

            this.state = newState;
            this.stateTime = Date.now();

            this.emit("enter", newState, prevState, newState, this);
            return true;
        } else {
            console.warn(`Invalid state transition from ${this.state} to ${newState}`);
        }
        return false;
    }
};