/**
 * Create a new HTML element with the given tag, classes, and attributes.
 * @param {string} tag The tag name for the new element.
 * @param {Array<string>} classNames The CSS classes to add to the element.
 * @param {Object} attributes The attributes to set on the element.
 * @returns {HTMLElement} The created element.
 */
export function createElement(tag, classNames = [], attributes = {}) {
    const el = document.createElement(tag);
    if (classNames.length > 0) {
        el.classList.add(...classNames);
    }
    for (const [attr, value] of Object.entries(attributes)) {
        el.setAttribute(attr, value);
    }
    return el;
}

export function snakeCaseToCamelCase(str) {
    const result = str.replace(/([-_][a-z])/g, (group) =>
        group.toUpperCase()
            .replace('-', '')
            .replace('_', '')
    );
    return result;
}

export const s2c = snakeCaseToCamelCase;

export function delayExecution(ms, callback) {
    setTimeout(callback, ms);
}

export function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Adds a CSS class to an element for a specified duration.
 * @param {HTMLElement} element The element to add the class to.
 * @param {string} classNames The CSS classes to add.
 * @param {number} duration The duration in milliseconds.
 * @returns {Promise<void>} A promise that resolves when the class is removed.
 */
export async function addClassForAWhile(element, classNames, duration = 500) {
    if (!element) return;
    classNames.split(" ").forEach(
        className => {
            element.classList.add(className);
        }
    );
    return new Promise(resolve => setTimeout(() => {
        classNames.split(" ").forEach(className => element.classList.remove(className));
        resolve();
    }, duration));
}

/**
 * Generates a random value based on a base value and a variance. The actual value will be a random value between (value - variance) and (value + variance).
 * @param {float} base, the base value in milliseconds
 * @param {float} variance, the maximum variance to apply to the value in milliseconds; the actual value will be a random value between (base - variance) and (base + variance)
 * @returns {float} the value with the random variance applied
 */
export function getValueWithVariance(base, variance = 0) {
    const randomVariance = Math.random() * variance * 2 - variance;
    return base + randomVariance;
}

/**
 * Escapes a string for use in a CSS selector. This is necessary when using special characters in selectors, such as when using data attributes 
 *  with special characters.
 * @param {string} value - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeCssValue(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(value);
    }
    return String(value).replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
}

/**
 * Finds the nearest ancestor of an element that has a data-ui attribute. If the element itself has a data-ui attribute, it will return that element.
 * @param {HTMLElement} element - The element to start the search from.
 * @returns {HTMLElement|null} The nearest ancestor with a data-ui attribute, or null if none is found.
 */
function getNearestDataUiAncestor(element) {
    const parent = element.parentElement;
    return parent ? parent.closest("[data-ui]") : null;
}

/**
 * Finds a UI element by its data-ui attribute within a specified root, ensuring that the element is a descendant of the root and 
 *   respects the hierarchy of data-ui attributes.
 * @param {string} part - The data-ui value to search for.
 * @param {HTMLElement|Document} root - The root node to start the search from.
 * @returns {HTMLElement|null} The found element or null if not found.
 */
function findScopedUIElement(part, root) {
    const escapedPart = escapeCssValue(part);
    const candidates = root.querySelectorAll(`[data-ui="${escapedPart}"]`);

    for (const candidate of candidates) {
        // Enforce hierarchy: the nearest data-ui ancestor must be the current root.
        // - If root has data-ui, candidate must belong to that branch.
        // - If root has no data-ui (e.g. document/body/container), candidate must
        //   be a top-level data-ui node in that scope.
        const nearestDataUiAncestor = getNearestDataUiAncestor(candidate);
        if (nearestDataUiAncestor === root) {
            return candidate;
        }
        if (root === document && nearestDataUiAncestor === null) {
            return candidate;
        }
    }

    return null;
}

/**
 * Finds a UI element by traversing a hierarchy of data-ui segments within a specified root.
 * Each segment is resolved against descendant elements using independent data-ui values, not
 * a single dotted data-ui attribute.
 *
 * Example structure:
 * <section data-ui="menu">
 *   <div data-ui="panel">
 *     <button data-ui="play">Play</button>
 *   </div>
 * </section>
 *
 * Example usage:
 *  findUIElement("menu.panel.play")
 *
 * The hierarchy is strict for data-ui ancestors: if an intermediate ancestor has data-ui, it
 * must appear in the path. Non-semantic wrapper elements without data-ui may be skipped.
 *
 * @param {string} uiId - The UI path in dot notation.
 * @param {HTMLElement|Document} root - The root node to start the search from. Defaults to document.
 * @returns {HTMLElement|null} The found element or null if not found.
 */
export function findUIElement(uiId, root = document) {
    // First we split the uiId into parts based on the dot notation
    const parts = uiId.split(".");
    let currentRoot = root;

    // To keep the structure, we need to make sure that if a child element has a data-ui attribute, it is
    //   always used to reference the element.
    // E.g., if we have a structure like:
    // <div data-ui="menu">
    //   <div data-ui="panel">
    //      <div data-ui="button">Click me</div>
    //   </div>
    // </div>
    // We must use menu.panel.button to find the button, and not just panel.button, because panel is a child of menu.

    for (const part of parts) {
        const foundElement = findScopedUIElement(part, currentRoot);
        if (!foundElement) {
            return null; // If any part is not found, return null
        }
        currentRoot = foundElement; // Move down the hierarchy
    }

    return currentRoot; // Return the final found element
}

export function isElement(value) {
    return value && typeof value === "object" && value.nodeType === Node.ELEMENT_NODE;
}

/**
 * Creates a deep clone of an object. This function uses JSON serialization to create a new object with the same properties and values as the original.
 * Note: This method does not preserve functions, undefined, or special object types (like Date, Map, Set, etc.). It is suitable for plain objects and arrays.
 * @param {Object} obj - The object to clone.
 * @returns {Object} A deep clone of the original object.
 */
export function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}