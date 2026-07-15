export class StateController {
    static DEBUG = false;

    static log(...args) {
        if (this.DEBUG) {
            console.log(...args);
        }
    }

    /**
     * Sets the valid state transitions for this StateController class. The transitions should be an object where the keys are the current states 
     *  and the values are arrays of valid next states.
     * e.g.
     * {
     *   "START": ["PLAYING", "PAUSED"],
     *   "PLAYING": ["PAUSED", "GAME_OVER"],
     *   "PAUSED": ["PLAYING", "GAME_OVER"],
     *   "GAME_OVER": []
     * }
     * @param {Object<string, Array<string>>} transitions
     * @param {boolean} allowUnreachableStates, if true, the transitions can contain states that are not reachable from the initial state. 
     *      If false, all states must be reachable from the initial state.
     *      Allowing unreachable states may be useful if you want to define a state machine that will consider future states that are not 
     *          yet implemented.
     *      
     * @throws {Error} if the transitions object is invalid or if the initial state is not defined in the transitions.
     * @throws {Error} if there are unreachable states in the transitions.
     * @throws {Error} if there are cycles in the transitions.
     * @throws {Error} if there are states that are not reachable from the initial state.
     */
    setStateTransitions(transitions, allowUnreachableStates = false) {
        // First, validate the transitions object
        if (typeof transitions !== "object" || transitions === null) {
            throw new Error("Transitions must be a non-null object");
        }
        for (const [state, nextStates] of Object.entries(transitions)) {
            if (!Array.isArray(nextStates)) {
                throw new Error(`Transitions for state "${state}" must be an array`);
            }
        }

        // We are checking that the state tree is valid:
        // - there are no unreachable states. 

        if (!allowUnreachableStates) {
            const allStates = Object.keys(transitions);
            const reachableStates = new Set();
            const stack = [ allStates[0] ]; // Start from the first state in the transitions object

            while (stack.length > 0) {
                const currentState = stack.pop();
                if (!reachableStates.has(currentState)) {
                    reachableStates.add(currentState);
                    const nextStates = transitions[currentState] || [];
                    for (const nextState of nextStates) {
                        if (!reachableStates.has(nextState)) {
                            stack.push(nextState);
                        }
                    }
                }
            }

            const unreachableStates = allStates.filter(state => !reachableStates.has(state));
            if (unreachableStates.length > 0) {
                throw new Error(`Unreachable states detected: ${unreachableStates.join(", ")}`);
            }
        }

        this.transitions = transitions;
    }

    /**
     * Validates if a transition from one state to another is allowed.
     * @param {string} fromState 
     * @param {string} toState 
     * @returns {boolean} true if the transition is valid, false otherwise.
     */
    validateTransition(fromState, toState) {
        if (!this.transitions) {
            throw new Error("Transitions are not defined for this StateController");
        }
        if (Object.keys(this.transitions).length === 0) {
            throw new Error("Transitions are empty for this StateController");
        }
        if (!this.transitions[fromState]) {
            throw new Error(`No transitions defined for state "${fromState}"`);
        }
        return this.transitions[fromState] && this.transitions[fromState].includes(toState);
    }

    /**
     * Creates a new StateController instance
     */
    constructor() {
        this.state = null;
        this.callbacks = {};
        this.transitions = {};
        this.stateTime = null;
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

    /**
     * Syntactic sugar for registering a callback function to be called when the state changes to the specified state. 
     *  (see `on` method for more details)
     * @param {string} state
     * @param {function(string, string, StateController)} callback
     * @return {function()} a function that can be called to unregister the callback.
     */
    onEnter(state, callback) {
        return this.on("enter", state, callback);
    }

    /**
     * Syntactic sugar for registering a callback function to be called when the state changes from the specified state. 
     *  (see `on` method for more details)
     * @param {string} state
     * @param {function(string, string, StateController)} callback
     * @return {function()} a function that can be called to unregister the callback.
     */
    onLeave(state, callback) {
        return this.on("leave", state, callback);
    }

    /**
     * Register a callback function to be called when the state changes to or from the specified state. The callback will receive the previous state, 
     * the new state, and the controller instance as arguments.
     *  - There is a special state name "*" that can be used to register callbacks that will be called on every state change, regardless of the new state.
     *  - Multiple callbacks can be registered for the same state, and they will be called in the order they were registered.
     * @param {string} state
     * @param {function(string, string, StateController)} onEnterCallback
     * @param {function(string, string, StateController)} onLeaveCallback
     * @return {Array<function()>} an array of functions that can be called to unregister the callbacks.
     */
    onState(state, onEnterCallback = null, onLeaveCallback = null) {
        if (onEnterCallback) {
            this.onEnter(state, onEnterCallback);
        }
        if (onLeaveCallback) {
            this.onLeave(state, onLeaveCallback);
        }
        return [
            () => this.off("enter", state, onEnterCallback),
            () => this.off("leave", state, onLeaveCallback)
        ];
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

        // This is the case when the state is null, which means this is the first time we are setting the state.
        //  In this case, we don't need to validate the transition.
        if (this.state === null) {
            StateController.log(`Initial state set to ${newState}`);
            this.state = newState;
            this.stateTime = Date.now();
            this.emit("enter", newState, null, newState, this);
            return true;
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