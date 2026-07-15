export class ScreenController {
    constructor() {
        this.screens = {};
        this.stack = [];
    }

    /**
     * Add a new screen to the controller.
     * @param {string} name - The name of the screen.
     * @param {object} screen - The screen object to add.
     * @returns {object} The screen object that was added.
     */
    add(name, screen) {
        this.screens[name] = screen;
        return screen;
    }

    /**
     * Retrieve a screen by its name.
     * @param {string} name - The name of the screen to retrieve.
     * @returns {object} The screen object associated with the given name, or undefined if not found.
     */
    get(name) {
        return this.screens[name];
    }

    /**
     * Reset the stack and show a specific screen. This will hide the previous active screen and clear the stack, so you will not be able to 
     * go back to it.
     * @param {string} screenName - The name of the screen to show.
     * @param {any} payload - Optional data to pass to the screen being shown.
     * @returns {object} The screen object that was shown.
     */
    show(screenName, payload = null) {
        // If there is a current screen, hide it first
        const currentScreen = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
        if (currentScreen) {
            currentScreen.screen.hide(payload??currentScreen.payload);
        }

        // Now clear the stack and push the new screen onto it
        this.stack = [];
        return this.push(screenName, payload);
    }

    /**
     * Push a new screen onto the stack and show it. This will hide the previous active screen, but you will be able to go back to it later.
     * @param {string} screenName - The name of the screen to show.
     * @param {any} payload - Optional data to pass to the screen being shown.
     * @returns {object} The screen object that was pushed onto the stack.
     */
    push(screenName, payload = null) {
        const currentScreen = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
        if (currentScreen) {
            currentScreen.screen.hide(payload);
        }
        const newScreen = this.screens[screenName];
        if (newScreen) {
            this.stack.push({
                screen: newScreen,
                payload: payload
            });
            newScreen.show(payload);
        } else {
            console.error(`Screen "${screenName}" not found.`);
        }
        return newScreen;
    }

    /**
     * Pop the current screen off the stack and return to the previous one. If a `payload` is provided, it will override the original `payload` 
     * used when the screen was pushed.
     * @param {any} payload - Optional data to pass to the screen being shown.
     * @returns {object} The screen object that was popped off the stack (or null if there are no screens to pop or the stack is empty).
     */
    pop(payload = null) {
        if (this.stack.length > 0) {
            const currentScreen = this.stack.pop();
            currentScreen.screen.hide(payload??currentScreen.payload);
            const previousScreen = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
            if (previousScreen) {
                previousScreen.screen.show(payload??previousScreen.payload);
                return previousScreen.screen;
            }
        } else {
            console.warn("No screens to pop.");
        }
        return null;
    }
}