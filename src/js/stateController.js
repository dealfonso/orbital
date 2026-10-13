export class StateController {
    _DEBUG = false;
    
    log(...args) {
        if (this._DEBUG) {
            console.log(`[${this.name}]`, ...args);
        }
    }

    set debug(value) {
        if (typeof value !== "boolean") {
            throw new Error("Debug value must be a boolean");
        }
        this._DEBUG = value;
    }

    get debug() {
        return this._DEBUG;
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
     * @param {string|null} name Optional name for the StateController instance. If not provided, a default name will be generated.
     */
    constructor(name = null) {
        this.state = null;
        this.callbacks = {};
        this.transitions = {};
        this.stateTime = null;
        if (name === null) {
            name = `StateController-${Date.now()}`;
        }
        this.name = name;

        // The states array is used to manage the states as a stack, allowing for "back" functionality. The last state in the array 
        //  is the current state, and the previous states are stored in the array for potential future use. Each element in the array 
        //  is an object with the following properties:
        // - state: The name of the state (string)
        // - data: Optional data associated with the state (object)
        // - timestamp: The time when the state was entered (number, milliseconds since epoch)
        this.statesStack = [];
    }

    /**
     * Returns true if the state controller can go back to the previous state, false otherwise. The controller can go back if there is at 
     *  least one previous state in the states array, the current state is not null, the current state is not the first state in the states 
     *  array, the current state is not the last state in the states array and there is a valid transition from the current state to the previous state.
     * @returns {boolean} true if the controller can go back, false otherwise.
     */
    canGoBack() {
        // We can go back if there is at least one previous state in the states array, the current state is not null, 
        //  the current state is not the first state in the states array, the current state is not the last state in 
        //  the states array and there is a valid transition from the current state to the previous state.
        if (this.statesStack.length < 2) {
            return false;
        }
        const currentState = this.state;
        const previousState = this.statesStack[this.statesStack.length - 2];
        return currentState !== null && currentState !== previousState && this.validateTransition(currentState, previousState.state);
    }

    /**
     * Returns the current state of the controller.
     * @returns {string|null} The current state or null if not set.
     */
    get currentState() {
        return this.state;
    }

    /**
     * Returns the time spent in the current state.
     * @returns {number} The time in milliseconds.
     */
    get timeInCurrentState() {
        if (this.stateTime === null) {
            return 0;
        }
        return Date.now() - this.stateTime;
    }

    /**
     * Returns the time spent in the current state in seconds.
     * @returns {number} The time in seconds.
     */
    get timeInCurrentStateSeconds() {
        return this.timeInCurrentState / 1000;
    }

    /**
     * Register a callback function to be called when the state changes to the specified state. The callback will receive the previous state, the new state, and the controller instance as arguments.
     *  - There is a special state name "*" that can be used to register callbacks that will be called on every state change, regardless of the new state.
     *  - Multiple callbacks can be registered for the same state, and they will be called in the order they were registered.
     * @param {string} event: The event name to listen for. For example, "change" or "enter".
     * @param {string} state
     * @param {function(string, string, StateController)} callback
     * @return {function()} a function that can be called to unregister the callback.
     * 
     * (*) Note: The callback will be called asynchronously after the state change is complete, to ensure that the state change is fully processed before the callback is executed.
     *      This is important to avoid issues where the callback tries to change the state again before the previous state change is complete.
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
        const callbacksToCall = [];

        if (this.callbacks && this.callbacks[`${event}:${state}`]) {
            this.log(`Emitting event "${event}" for state "${state}" with args:`, args);
            this.callbacks[`${event}:${state}`].forEach(callback => {
                callbacksToCall.push(callback);
            });
        }
        if (this.callbacks && this.callbacks[`${event}:*`]) {
            this.log(`Emitting event "${event}" for state "${state}" with args:`, args);
            this.callbacks[`${event}:*`].forEach(callback => {
                callbacksToCall.push(callback);
            });
        }

        // Call the callbacks asynchronously to avoid blocking the main thread and to ensure that the state change is fully processed before the callbacks are executed.
        setTimeout(() => {
            callbacksToCall.forEach(callback => {
                try {
                    this.log(`Calling callback for event "${event}" and state "${state}" with args:`, args);
                    callback(...args);
                } catch (error) {
                    console.error(`Error in callback for state ${state}:`, error);
                }
            });
        }, 0);
    }

    /**
     * Force the state to a new value, regardless of valid transitions.
     * @param {string} newState 
     * @param {Object} [data] Optional data to pass to the callbacks.
     * @param {boolean} callCallbacks: If true, the callbacks for the new state (and for "*") will be called (if needed). If false, the callbacks will not be called.
     */
    forceState(newState, data = null, callCallbacks = false) {
        this.log(`Forcing state from ${this.state} to ${newState}`);
        const prevState = this.state;
        if (callCallbacks) {
            this.emit("leave", this.state, data, prevState, newState, this);
        }
        this.state = newState;
        this.stateTime = Date.now();
        if (callCallbacks) {
            this.emit("enter", newState, data, prevState, newState, this);
        }
    }

    /** 
     * Changes the current state to the specified new state, clearing the state stack so that it only contains the current state. 
     * @param {string} newState
     * @param {Object} [data] Optional data to pass to the callbacks.
     * @returns {boolean} true if the state was changed, false if the transition was invalid or if the new state is the same as the current state.
     */
    change(newState, data = null) {
        this.statesStack = []; // Clear the state stack
        const changed = this._change(newState, data);
        if (changed) {
            // If the state was changed, we push the new state to the statesStack array.
            this.statesStack.push({ state: newState, data: data, timestamp: Date.now() });
        }
        return changed;
    }

    /**
     * Changes the current state to the specified new state, pushing the new state onto the statesStack array. This allows for "back" functionality, 
     *  where the controller can return to previous states (if possible) using the `goBack` method.
     * @param {string} newState
     * @param {Object} [data] Optional data to pass to the callbacks.
     * @returns {boolean} true if the state was changed, false if the transition was invalid or if the new state is the same as the current state.
     */
    pushState(newState, data = null) {
        const changed = this._change(newState, data);
        if (changed) {
            // If the state was changed, we push the new state to the statesStack array.
            this.statesStack.push({ state: newState, data: data, timestamp: Date.now() });
        }
        return changed;
    }

    /**
     * Goes back to the previous state in the statesStack array, if possible. This method will only work if there is a valid transition from the 
     *  current state to the previous state.
     * 
     * @param {Object} [data] Optional data to pass to the callbacks.
     * @returns {boolean} true if the state was changed, false if the transition was invalid or if there is no previous state to go back to.
     */
    goBack(data = null) {
        if (!this.canGoBack()) {
            console.warn(`Cannot go back from state ${this.state}`);
            return false;
        }
        const currentState = this.state;
        const previousState = this.statesStack[this.statesStack.length - 2].state;
        const changed = this._change(previousState, data || this.statesStack[this.statesStack.length - 2].data);
        if (changed) {
            // If the state was changed, we pop the current state from the statesStack array.
            this.statesStack.pop();
        }
        return changed;
    }

    /**
     * Change the current state to the specified new state. If the transition from the current state to the new state is valid according to the defined transitions, the state will be updated and the registered callbacks for the new state (and for "*") will be called.
     * 
     * @param {string} newState
     * @param {Object} [data] Optional data to pass to the callbacks.
     * @returns {boolean} true if the state was changed, false if the transition was invalid or if the new state is the same as the current state.
     */
    _change(newState, data = null) {
        this.log(`Changing state from ${this.state} to ${newState}`);
        if (newState === this.state) {
            this.log(`State unchanged: ${newState}`);
            return false; // No hacemos nada si el estado no cambia
        }

        let isValidTransition = true;

        // This is the case when the state is null, which means this is the first time we are setting the state.
        //  In this case, we don't need to validate the transition.
        if (this.state === null) {
            this.log(`Initial state set to ${newState}`);
            this.state = newState;
            this.stateTime = Date.now();
            this.emit("enter", newState, data, null, newState, this);
        } else {
            if (this.validateTransition(this.state, newState)) {
                const prevState = this.state;
                this.emit("leave", this.state, data, prevState, newState, this);
                this.state = newState;
                this.stateTime = Date.now();
                this.emit("enter", newState, data, prevState, newState, this);
            } else {
                console.warn(`Invalid state transition from ${this.state} to ${newState}`);
                isValidTransition = false;
            }
        }
        if (isValidTransition) {
            this.log(`State changed to ${newState}`);
        }
        return isValidTransition;
    }

    /**
     * Resets the state controller to its initial state, clearing the current state and state time. This does not affect the defined transitions or registered callbacks.
     *  - After calling this method, the state will be null and the state time will be null.
     *  - This method does not emit any events or call any callbacks.
     *  - This method does not validate the transitions or check for valid states.
     *  - This method does not change the defined transitions or registered callbacks.
     *  - This method does not change the current state or state time if they are already null.
     *  - This method does not affect the ability to change the state later using the `change` method.
     *  - This method does not affect the ability to force the state later using the `forceState` method.
     *  - This method does not affect the ability to register new callbacks later using the `on`, `onEnter`, `onLeave`, or `onState` methods.
     *  - This method does not affect the ability to unregister callbacks later using the `off` method.
     */
    reset() {
        this.log(`Resetting state controller from ${this.state} to null`);
        this.state = null;
        this.stateTime = null;
    }
};