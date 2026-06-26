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
    return str.replace(/([-_][a-z])/g, (group) =>
        group.toUpperCase()
            .replace('-', '')
            .replace('_', '')
    );
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

