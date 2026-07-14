import { snakeCaseToCamelCase, escapeCssValue } from "./utils.js";

const defaultOptions = {
    // The CSS class to add to the container when the screen is shown. You can use this class to define the styles for the visible state of the screen, such as display: block or opacity: 1.
    visibleClass: "active",
    // The CSS class to add to the container when the screen is hidden. You can use this class to define the styles for the hidden state of the screen, such as display: none or opacity: 0.
    hiddenClass: "not-active",
    // Scope used to resolve UI elements declared in uiElementIds.
    // - "container": resolve inside this.container first (recommended)
    // - "document": resolve globally in the whole document
    scope: "container",
    // Backward-compatible fallback. If an element is not found in container scope,
    // it will be searched globally by id.
    allowGlobalIdFallback: false,
    // If true, try data-ui first and id second when resolving uiElementIds.
    preferDataUi: false,
};

function isElement(value) {
    return value && typeof value === "object" && value.nodeType === Node.ELEMENT_NODE;
}

export class BaseScreen {
    /**
    * Create a new screen instance. The screen will be rendered inside the provided container element. Optionally, you can 
     *  provide an array of UI element IDs to acquire and bind to this screen for easy access.
     * @param {HTMLElement} baseContainer container element for this screen.
     * @param {Array<string>} uiElementIds list of element IDs to acquire and bind to this screen. For example: ["start-btn", "score-display"]
     *          The keys will be used as property names in this._el. For example, if you acquire "start-btn", you can access it later with 
     *          this._el["start-btn"] or this._el.startBtn.
     * @param {Dict<string, string>} uiElementSelectors optional dictionary of element selectors to acquire and bind to this screen. 
     *          For example: { "startBtn": "#start-btn", "modeButtons": ".mode-btn" }
     *          
     *          The keys will be stored as property names in this._els, as Arrays[HTMLElement]. So that you can access them later with 
     *          this._els.startBtn or this._els["startBtn"] or this._els["modeButtons"]. Each of them will be an array of elements matching the selector). This is useful for acquiring multiple elements with the same class or data attribute, such as buttons for different game modes.
     */
    constructor(controller, baseContainer, uiElementIds = [], uiElementSelectors = {}, options = {}) {
        this.controller = controller;
        this.options = { ...defaultOptions, ...options };
        this.container = isElement(baseContainer) ? baseContainer : null;
        if (!this.container) {
            throw new Error("BaseScreen expects an HTMLElement as the container argument");
        }
        this._baseContainer = baseContainer;
        this.acquireElements(uiElementIds);
        this.acquireElementsBySelector(uiElementSelectors);
        this._initialized = false;
    }

    findElementInContainerById(id) {
        const escapedId = escapeCssValue(id);
        return this.container.querySelector(`#${escapedId}`);
    }

    findElementInContainerByDataUi(key) {
        const escapedKey = escapeCssValue(key);
        return this.container.querySelector(`[data-ui="${escapedKey}"]`);
    }

    resolveElement(key) {
        const searchInContainer = this.options.scope !== "document";
        const preferDataUi = this.options.preferDataUi;

        if (searchInContainer) {
            const byDataUi = this.findElementInContainerByDataUi(key);
            const byId = this.findElementInContainerById(key);
            const inContainer = preferDataUi ? (byDataUi || byId) : (byId || byDataUi);
            if (inContainer) {
                return inContainer;
            }
        }

        if (this.options.scope === "document" || this.options.allowGlobalIdFallback) {
            const globalElement = document.getElementById(key);
            if (globalElement) {
                return globalElement;
            }
        }

        return null;
    }

    /**
     * Initialize the screen. This method should be called after creating an instance of the screen to set up event listeners and any other 
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
        this.options.visibleClass.split(" ").forEach(cls => this.container.classList.add(cls));
        this.options.hiddenClass.split(" ").forEach(cls => this.container.classList.remove(cls));
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
        this.options.visibleClass.split(" ").forEach(cls => this.container.classList.remove(cls));
        this.options.hiddenClass.split(" ").forEach(cls => this.container.classList.add(cls));
    }

    /**
     * Bind multiple elements by their IDs. The elements should be inside the container of this screen.
     * 
     * @param {Array<string>} elementIds The IDs of the elements to acquire. For example: ["start-btn", "score-display"]
     * @returns {Dict<string, HTMLElement>} An object with the acquired elements, keyed by their IDs. For example: 
     *      { "start-btn": HTMLElement, "score-display": HTMLElement }
     */
    bindElements(elementIds = []) {
        const elements = {};
        for (const id of elementIds) {
            const el = this.resolveElement(id);
            if (!el) {
                console.warn(`Element "${id}" not found in scope "${this.options.scope}"`);
            }
            elements[id] = el;
        }
        return elements;
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
            const els = this.container.querySelectorAll(selector);
            if (els.length === 0) {
                console.warn(`No elements found for selector "${selector}"`);
            }
            elements[key] = els;
        }
        return elements;
    }

    /**
     * Acquire and bind multiple elements by their IDs. The elements should be inside the container of this screen.
     *   - The acquired elements will be stored in this._el for easy access. For example, if you acquire "start-btn", 
     *     you can access it later with this._el["start-btn"] or this._el.startBtn.
     * @param {Array<string>} elementIds The IDs of the elements to acquire. For example: ["start-btn", "score-display"]
     * @returns {Dict<string, HTMLElement>} An object with the acquired elements, keyed by their IDs. For example: { "start-btn": HTMLElement, "score-display": HTMLElement }
     */
    acquireElements(elementIds = []) {
        const elements = this.bindElements(elementIds);
        for (const [key, el] of Object.entries(elements)) {
            const camelCaseKey = snakeCaseToCamelCase(key);
            if (camelCaseKey !== key) {
                elements[camelCaseKey] = el;
            }
        }
        this._el = elements;
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
     * Initialize event listeners for the screen. This method should be implemented by subclasses to define the specific event 
     *  listeners for the screen's UI elements. For example, you could add click event listeners to buttons or input event listeners 
     *  to form fields.
     */
    initEventListeners() {
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