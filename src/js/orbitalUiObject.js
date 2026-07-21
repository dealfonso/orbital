import { s2c, isElement } from "./utils.js";

export class OrbitalUIObject {

    /**
     * Create a new OrbitalUIObject instance. The element must have a data-ui attribute, which will be used as the unique identifier for this object.
     * @param {HTMLElement} element The element to wrap in an OrbitalUIObject. It must have a data-ui attribute.
     * @param {boolean} selfDiscover If true, the constructor will automatically discover child elements with data-ui attributes and 
     *  create OrbitalUIObject instances for them. If false, you can call discoverChildren() later to do this manually.
     */
    constructor(element) {
        if (!isElement(element)) {
            throw new Error("The provided value is not a valid HTMLElement.");
        }

        // Make sure that the element has a data-ui attribute, otherwise throw an error
        if (!element || !element.dataset || !element.dataset.ui) {
            throw new Error("The provided element does not have a data-ui attribute.");
        }

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

        // Store a reference to this OrbitalUIObject in the element itself, so we can retrieve it later if needed.
        element._orb = this; // Store a reference to this OrbitalUIObject in the element itself, so we can retrieve it later if needed.
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
    static discoverChildren(element) {
        // Now we will find all child elements of this.element that have a data-ui attribute, and create OrbitalUIObject instances for them.
        const childElements = element.querySelectorAll("[data-ui]");
        const discovered = {};
        for (const child of childElements) {
            // Get the nearest ancestor with data-ui that and make sure it is this.element, otherwise skip this child
            const nearestDataUiAncestor = child.parentElement.closest("[data-ui]");
            if (nearestDataUiAncestor !== element) {
                continue;
            }
            const childUiObject = OrbitalUIObject.discover(child);
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
    static discover(element) {
        const orbitalUIObject = new OrbitalUIObject(element);
        const discovered = OrbitalUIObject.discoverChildren(element);

        // Let's verify that the discovered object do not hide any keys that are already present in the orbitalUIObject, to avoid overwriting them. 
        //   If there is a conflict, we will throw an error.
        for (const key of Object.keys(discovered)) {
            if (orbitalUIObject.hasOwnProperty(key)) {
                throw new Error(`Conflict: The key "${key}" is already present in the OrbitalUIObject for "${orbitalUIObject.uiId}".`);
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
                    handler(event);
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
}