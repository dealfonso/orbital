import { s2c, isElement, findUIElement } from "./utils.js";
import { ScreenController } from "./screenController.js";

export class OrbitalUIObject {

    /**
     * Create a new OrbitalUIObject instance. The element must have a data-ui attribute, which will be used as the unique identifier for this object.
     * @param {HTMLElement} element The element to wrap in an OrbitalUIObject. It must have a data-ui attribute.
     * @param {Object} controller The controller instance that will manage this UI object.
     */
    constructor(element, controller = null) {
        if (!isElement(element)) {
            throw new Error("The provided value is not a valid HTMLElement.");
        }

        // Make sure that the element has a data-ui attribute, otherwise throw an error
        if (!element || !element.dataset || !element.dataset.ui) {
            throw new Error("The provided element does not have a data-ui attribute.");
        }

        // If a controller is provided, make sure it is a descendant of ScreenController, otherwise throw an error
        if (!controller || !(controller instanceof ScreenController)) {
            throw new Error("The provided controller is not an instance of ScreenController.");
        }

        this._controller = controller;

        if (element._orb) {
            // console.log(`Warning: The element with data-ui="${element.dataset.ui}" already has an OrbitalUIObject associated with it. Returning the existing instance.`);
            return element._orb; // Return the existing OrbitalUIObject if it already exists for this element
        }

        this.uiId = element.dataset.ui;
        this.element = element;

        // We are handling the event listeners and handlers in a way that allows us to add multiple listeners for the same event type, 
        //  and also to remove them if needed. We will store the listeners in a dictionary where the keys are the event types and the 
        //  values are arrays of callback functions.
        this._eventListeners = {};
        this._eventHandlers = {};
        this._ui = null; // This will hold the discovered child OrbitalUIObjects, if any. It will be populated by discoverChildren() or discover().

        this._initialized = false; // This flag will be set to true when init() is called, to prevent re-initialization.

        // Store a reference to this OrbitalUIObject in the element itself, so we can retrieve it later if needed.
        element._orb = this; // Store a reference to this OrbitalUIObject in the element itself, so we can retrieve it later if needed.
    }

    get controller() {
        return this._controller;
    }

    /**
     * This function will discover child elements of this.element that have a data-ui attribute, and create OrbitalUIObject instances for them.
     * The result will be an object where the keys are the data-ui values of the child elements, and the values are the corresponding OrbitalUIObject instances.
     * @returns {Dict<string, OrbitalUIObject>} An object with the discovered child OrbitalUIObjects, keyed by their data-ui values.
     */
    discoverChildren() {
        this._ui = OrbitalUIObject.discoverChildren(this.element);
        return this._ui;
    }

    /**
     * Gets the discovered child UI objects.
     * @returns {Dict<string, OrbitalUIObject>} An object with the discovered child OrbitalUIObjects, keyed by their data-ui values.
     */
    get ui() {
        if (!this._ui) {
            this.discoverChildren();
        }
        return this._ui;
    }

    /**
     * This function will search for child elements of this.element that have a data-ui attribute, and create OrbitalUIObject instances 
     *  for them. The function will be recursive, so it will also search for child elements of those elements, and so on. The result will 
     *  be an object where the keys are the data-ui values of the child elements, and the values are the corresponding OrbitalUIObject instances. 
     *  This allows for easy access to nested UI elements.
     * 
     * e.g.
     * 
     * <div data-ui="panel">
     *  <button data-ui="start-btn">Start</button>
     *  <div data-ui="score-display">Score
     *    <span data-ui="score-value">0</span>
     *  </div>
     * </div>
     * 
     * Calling discoverChildren() on the OrbitalUIObject for the "panel" element will return:
     * {
     *  "startBtn": OrbitalUIObject for the button,
     *  "scoreDisplay": OrbitalUIObject + {
     *    "scoreValue": OrbitalUIObject for the span
     *  }
     * }
     */
    static discoverChildren(element, controller = null) {
        // Now we will find all child elements of this.element that have a data-ui attribute, and create OrbitalUIObject instances for them.
        const childElements = element.querySelectorAll("[data-ui]");
        const discovered = {};
        for (const child of childElements) {
            // Get the nearest ancestor with data-ui that and make sure it is this.element, otherwise skip this child
            const nearestDataUiAncestor = child.parentElement.closest("[data-ui]");
            if (nearestDataUiAncestor !== element) {
                continue;
            }
            const childUiObject = OrbitalUIObject.discover(child, controller);
            const camelId = s2c(childUiObject.uiId);
            discovered[camelId] = childUiObject;
        }
        return discovered;
    }

    /**
     * This function will create an OrbitalUIObject for the provided element, and also discover its child elements with data-ui attributes.
     * The result will be an object where the keys are the data-ui values of the element and its children, and the values are the corresponding 
     * OrbitalUIObject instances.
     * @param {HTMLElement} element The element to create an OrbitalUIObject for. It must have a data-ui attribute.
     * @return {OrbitalUIObject} An object with the OrbitalUIObject for the element and its children, keyed by their data-ui values.
     * @throws {Error} If there is a conflict between the keys of the OrbitalUIObject and its children, an error will be thrown.
     */
    static discover(element, controller = null) {
        const orbitalUIObject = new OrbitalUIObject(element, controller);
        const discovered = OrbitalUIObject.discoverChildren(element, controller);

        // Let's verify that the discovered object do not hide any keys that are already present in the orbitalUIObject, to avoid overwriting them. 
        //   If there is a conflict, we will throw an error.
        for (const key of Object.keys(discovered)) {
            if (orbitalUIObject.hasOwnProperty(key)) {
                if (orbitalUIObject[key] !== discovered[key]) {
                    console.error(`Conflict: The key "${key}" is already present in the OrbitalUIObject for "${orbitalUIObject.uiId}".`);
                    console.error("Existing value:", orbitalUIObject[key]);
                    console.error("New value:", discovered[key]);
                    throw new Error(`Conflict: The key "${key}" is already present in the OrbitalUIObject for "${orbitalUIObject.uiId}".`);
                } else {
                    // We are re-discovering the same child, so we can ignore this conflict.
                }
            }
        }
        return Object.assign(orbitalUIObject, discovered);
    }

    /**
     * Add an event listener for a specific event type.
     * @param {string} eventType The event type to listen for.
     * @param {Function} callback The function to call when the event is triggered.
     * @param {number|null} position The position in the event listener array to insert the callback. If null, the callback will be added to the 
     *  end of the array. If -1, the callback will be added to the beginning of the array. If a positive number, the callback will be added at that 
     *  index in the array.
     * @return {Function} A function that can be called to remove the event listener.
     */
    on(eventType, callback, position = null) {
        if (!this._eventHandlers[eventType]) {
            this._eventHandlers[eventType] = function(event) {
                for (const handler of this._eventListeners[eventType] || []) {
                    handler.call(this, event, this);
                }
            }.bind(this);
            this.element.addEventListener(eventType, this._eventHandlers[eventType]);
        }            
        if (!this._eventListeners[eventType]) {
            this._eventListeners[eventType] = [];
        }
        if (position === null) {
            this._eventListeners[eventType].push(callback);
        } else if (position === -1) {
            this._eventListeners[eventType].unshift(callback);
        } else {
            this._eventListeners[eventType].splice(position, 0, callback);
        }
        return function() {
            self.off(eventType, callback);
        };
    }

    /**
     * Remove an event listener for a specific event type.
     * @param {string} eventType The event type to remove the listener for.
     * @param {Function} callback The function to remove from the event listeners.
     */
    off(eventType, callback) {
        if (!this._eventListeners[eventType]) {
            return;
        }
        const index = this._eventListeners[eventType].indexOf(callback);
        if (index !== -1) {
            this._eventListeners[eventType].splice(index, 1);
        }
        if (this._eventListeners[eventType].length === 0) {
            this.element.removeEventListener(eventType, this._eventHandlers[eventType]);
            delete this._eventHandlers[eventType];
            delete this._eventListeners[eventType];
        }
    }

    /**
     * Remove all event listeners for a specific event type, or for all event types if no event type is provided.
     * @param {string|null} eventType The event type to remove listeners for, or null to remove all listeners for all event types.
     */
    removeAllEventListeners(eventType = null) {
        if (eventType === null) {
            for (const type in this._eventListeners) {
                this.element.removeEventListener(type, this._eventHandlers[type]);
            }
            this._eventListeners = {};
            this._eventHandlers = {};
        } else {
            if (this._eventListeners[eventType]) {
                this.element.removeEventListener(eventType, this._eventHandlers[eventType]);
                delete this._eventListeners[eventType];
                delete this._eventHandlers[eventType];
            }
        }
    }

    /**
     * Find a child element of this.element by its data-ui attribute. The search will be scoped to this.element, so it will only find elements 
     *  that are descendants of this.element.
     *  For example: "panel.start-btn"
     * @param {string} uiKey The data-ui key of the element to find. For example: "panel.start-btn"
     * @return {HTMLElement|null} The found element, or null if not found.
     */
    $(uiKey) {
        return findUIElement(uiKey, this.element);
    }

    /**
     * Find a child element of this.element by its data-ui attribute. The search will be scoped to this.element, so it will only find elements 
     *  that are descendants of this.element.
     *  For example: "panel.start-btn"
     * @param {string} uiKey The data-ui key of the element to find. For example: "panel.start-btn"
     * @return {OrbitalUIObject|null} The found OrbitalUIObject, or null if not found.
     */
    find(uiKey) {
        const element = this.$(uiKey);
        if (element) {
            return new OrbitalUIObject(element, this.controller);
        } else {
            return null;
        }
    }

    /**
     * Request fullscreen for this.element. If the element is already in fullscreen, it will exit fullscreen first.
     * This method will attempt to use the standard Fullscreen API, and will also handle vendor-prefixed versions for Safari and IE11.
     * Note: Some browsers may require user interaction (like a click) to allow fullscreen mode.
     * @returns {Promise<void>} A promise that resolves when the request is complete.
     * @throws {Error} If the browser does not support fullscreen or if the request fails.
     * @example
     *  const orb = new OrbitalUIObject(document.getElementById("myElement"));
     *  orb.enterFullscreen();
     */
    enterFullscreen() {
        const elem = this.element;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        if (elem.requestFullscreen) {
            return elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            return elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE11 */
            return elem.msRequestFullscreen();
        }
    }

    /**
     * Exit fullscreen mode if this.element is currently in fullscreen.
     * This method will attempt to use the standard Fullscreen API, and will also handle vendor-prefixed versions for Safari and IE11.
     * @returns {Promise<void>} A promise that resolves when the exit request is complete.
     * @throws {Error} If the browser does not support fullscreen or if the exit request fails.
     * @example
     *  const orb = new OrbitalUIObject(document.getElementById("myElement"));
     *  orb.exitFullscreen();
     */
    exitFullscreen() {
        if (document.fullscreenElement === this.element) {
            return document.exitFullscreen();
        }
    }


    /**
     * Initialize the object. This method should be called after creating an instance of the screen to set up event listeners and any other 
     *  necessary initialization logic. For example, you could call this method in the constructor of the subclass after calling super(), or 
     *  you could call it separately after creating an instance of the screen.
     */
    init() {
        // Avoid re-initializing the screen if it has already been initialized. 
        //  This is useful if you want to call init() multiple times, for example, if you want to re-initialize the screen after it has been hidden and shown again.
        if (!this._initialized) {
            this._initialized = true;
            this.initEventListeners();
        }
    }

    /**
     * Initialize event listeners for the screen. This method should be implemented by subclasses to define the specific event 
     *  listeners for the screen's UI elements. For example, you could add click event listeners to buttons or input event listeners 
     *  to form fields.
     */
    initEventListeners() {
    }    

    /**
     * Add an event listener to a UI element identified by its data-ui key. The element should be inside the container of this screen.
     * @param {string|Array<string} uiKey The data-ui key of the element to add the event listener to. The uiKey must use the dot-notation to reference the element. For example: "panel.start-btn"
     *      (*) You can also pass an array of uiKeys to add the same event listener to multiple elements. For example: ["panel.start-btn", "panel.stop-btn"]
     * @param {string} eventType The type of the event to listen for. For example: "click", "input", "change"
     * @param {Function} handler The function to call when the event is triggered. It will receive the event object as its argument.
     * @return {Function|null} A function to remove the event listener, or null if the element was not found. The returned function can be called to remove the event listener when it is no longer needed.
     * 
     * Example usage:
     *  this.$on("panel.start-btn", "click", (event) => {
     *      console.log("Start button clicked!", event);
     *  });
     */
    on$(uiKey, eventType, handler) {
        if (!Array.isArray(uiKey)) {
            uiKey = [uiKey];
        }

        const returnFunctions = [];

        for (const key of uiKey) {
            if (typeof key !== "string") {
                throw new Error(`Invalid uiKey: ${key}. It must be a string or an array of strings.`);
            }
            const element = findUIElement(key, this.element);
            if (element) {
                // As it has a data-ui attribute, we can create an OrbitalUIObject for it and use its on() method 
                //  to add the event listener.
                const orbitalUIObject = new OrbitalUIObject(element, this.controller);
                orbitalUIObject.on(eventType, handler);
                returnFunctions.push(() => orbitalUIObject.off(eventType, handler));
            }
            else {
                if (this.throwOnMissingElement) {
                    throw new Error(`Element "${key}" not found in container for event listener`);
                } else {
                    console.warn(`Element "${key}" not found in container for event listener`);
                }
            }
        }

        if (returnFunctions.length === 1) {
            return returnFunctions[0];
        } else if (returnFunctions.length > 1) {
            return () => {
                for (const removeListener of returnFunctions) {
                    removeListener();
                }
            };
        } else {
            return null;
        }
    }    
}