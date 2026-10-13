import { snakeCaseToCamelCase, escapeCssValue, findUIElement } from "./utils.js";
import { OrbitalUIObject } from "./orbitalUiObject.js";

const defaultOptions = {
    // The CSS class to add to the container when the screen is shown. You can use this class to define the styles for the visible state of the screen, such as display: block or opacity: 1.
    visibleClass: "active",
    // The CSS class to add to the container when the screen is hidden. You can use this class to define the styles for the hidden state of the screen, such as display: none or opacity: 0.
    hiddenClass: "not-active",
    // If true, this class will throw an exception whenever a uiKey is not found in the specified scope. If false, it will log a warning instead.
    //  (*) this is useful for debugging and development, but may be too strict for production use.
    throwOnMissingElement: false
};

export class BaseScreen extends OrbitalUIObject {
    /**
     * Create a new screen instance. The screen will be rendered inside the provided container element. Optionally, you can 
     *  provide an array of UI keys to acquire and bind to this screen for easy access.
     * @param {StateController} controller The state controller that manages the state transitions for this screen. It should be an instance of StateController or a subclass of it.
     * @param {HTMLElement} baseContainer container element for this screen.
     * @param {Dict<string, string>} uiElementSelectors optional dictionary of element selectors to acquire and bind to this screen. 
     *          For example: { "startBtn": "#start-btn", "modeButtons": ".mode-btn" }
     *          
     *          The keys will be stored as property names in this._els, as Arrays[HTMLElement]. So that you can access them later with 
     *          this._els.startBtn or this._els["startBtn"] or this._els["modeButtons"]. Each of them will be an array of elements matching the selector). This is useful for acquiring multiple elements with the same class or data attribute, such as buttons for different game modes.
     */
    constructor(element, controller, uiElementSelectors = {}, options = {}) {
        super(element, controller);

        this.options = { ...defaultOptions, ...options };
        this.acquireElementsBySelector(uiElementSelectors);
    }

    /**
     * Show the screen. This method should be implemented by subclasses to define how the screen is displayed. For example, 
     *  it could set the container's display style to "block" or add a CSS class to make it visible.
     * 
     * In this method, you can also initialize any dynamic content or start any animations that should run when the screen is shown.
     * @param {any} payload optional data to pass to the screen when showing it. For example, you could pass the current game state or user settings.
     */
    show(payload = null) {
        // This is a lazy initialization approach. We only initialize the screen when it is shown for the first time. 
        //  This way, we avoid unnecessary initialization of screens that may never be shown.
        if (!this._initialized) {
            this.init();
        }
        this.options.visibleClass.split(" ").forEach(cls => this.element.classList.add(cls));
        this.options.hiddenClass.split(" ").forEach(cls => this.element.classList.remove(cls));
        this.activate(payload);
    }

    /**
     * Hide the screen. This method should be implemented by subclasses to define how the screen is hidden. For example, 
     *  it could set the container's display style to "none" or remove a CSS class to hide it.
     *
     * In this method, you can also stop any animations or clean up any dynamic content that should not run when the screen is hidden.
     * @param {any} payload optional data to pass to the screen when hiding it. For example, you could pass the current game state or user settings.
     */
    hide(payload = null) {
        this.deactivate(payload);
        this.options.visibleClass.split(" ").forEach(cls => this.element.classList.remove(cls));
        this.options.hiddenClass.split(" ").forEach(cls => this.element.classList.add(cls));
    }

    /**
     * Bind elements by CSS selectors. The elements should be inside the container of this screen.
     * 
     * @param {Dict<string, string>} selectors An object with CSS selectors as values and keys for the property names. 
     *      For example: { "startBtn": "#start-btn", "modeButtons": ".mode-btn" }
     * @returns {Dict<string, Array<HTMLElement>>} An object with the acquired elements, keyed by their selector keys. 
     *      For example: { "startBtn": [HTMLElement], "modeButtons": [HTMLElement, HTMLElement] }
     */
    bindElementsBySelector(selectors = {}) {
        const elements = {};
        for (const [key, selector] of Object.entries(selectors)) {
            const els = this.element.querySelectorAll(selector);
            if (els.length === 0) {
                console.warn(`No elements found for selector "${selector}"`);
            }
            elements[key] = els;
        }
        return elements;
    }

    /**
     * Acquire and bind elements by CSS selectors. The elements should be inside the container of this screen.
     *   - The acquired elements will be stored in this._els for easy access. For example, if you acquire with key "startBtn", 
     *     you can access it later with this._els.startBtn or this._els["startBtn"] (which will be an array of elements matching the selector). 
     *     This is useful for acquiring multiple elements with the same class or data attribute, such as buttons for different game modes.
     * @param {Dict<string, string>} selectors An object with CSS selectors as values and keys for the property names. 
     *      For example: { "startBtn": "#start-btn", "modeButtons": ".mode-btn" }
     * @returns {Dict<string, Array<HTMLElement>>} An object with the acquired elements, keyed by their selector keys. 
     *      For example: { "startBtn": [HTMLElement], "modeButtons": [HTMLElement, HTMLElement] }
     */
    acquireElementsBySelector(selectors = {}) {
        const elements = this.bindElementsBySelector(selectors);
        for (const [key, els] of Object.entries(elements)) {
            const camelCaseKey = snakeCaseToCamelCase(key);
            if (camelCaseKey !== key) {
                elements[camelCaseKey] = els;
            }
        }
        this._els = elements;
        return elements;
    }

    /**
     * Activate the screen. This method can be used to start any animations, timers, or other dynamic content that should run when the screen is shown.
     *  It can also be used to reset the state of the screen if necessary. This method is called at the end of the show() method, after the screen is made visible.
     * @param {any} payload optional data to pass to the screen when activating it. For example, you could pass the current game state or user settings.
     */
    activate(payload = null) {
    }

    /**
     * Deactivate the screen. This method can be used to stop any animations, timers, or other dynamic content that should not run when the screen is hidden.
     *  It can also be used to clean up any resources or reset any state that should not persist while the screen is hidden. This method is called at the beginning of the hide() method, before the screen is hidden.
     * @param {any} payload optional data to pass to the screen when deactivating it. For example, you could pass the current game state or user settings.
     */
    deactivate(payload = null) {
    }
}