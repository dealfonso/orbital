export class GameController {
    constructor() {
        this.screens = {};
        this.stack = [];
    }

    addScreen(name, screen) {
        this.screens[name] = screen;
        return screen;
    }

    getScreen(name) {
        return this.screens[name];
    }

    showScreen(screenName, payload = null) {
        // First we hide all screens, then we show the selected one. This way we ensure only one screen is visible at a time.
        for (const [name, screen] of Object.entries(this.screens)) {
            screen.hide(payload);
        }
        // Now clear the stack and push the new screen onto it
        this.stack = [];
        this.pushScreen(screenName, payload);
    }

    pushScreen(screenName, payload = null) {
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
    }

    popScreen(payload = null) {
        if (this.stack.length > 0) {
            const currentScreen = this.stack.pop();
            currentScreen.screen.hide(payload??currentScreen.payload);
            const previousScreen = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
            if (previousScreen) {
                previousScreen.screen.show(payload??previousScreen.payload);
            }
        } else {
            console.warn("No screens to pop.");
        }
    }
}