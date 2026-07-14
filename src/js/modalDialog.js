
const defaultOptions = {
    selectorCloseButton: "[data-close]",
    visibleClass: "active",
    hiddenClass: "not-active",
    selectorModalButton: "[data-modal-action]",
    onClose: null, // Callback function to be called when the modal is closed

    // When we define a "data-modal-action='custom-action'" attribute, we are defining that a button inside the modal will trigger a specific action.
    //  The value will be treated as a key to look up in the buttonActions object, which is defined below. The buttonActions object maps the "custom-action" 
    //  value to a function that will be executed when the button is clicked.
    buttonActions: {
    }
};

export class ModalDialog {
    constructor(el, options = {}) {
        this._el = el;
        this._handlers = {};
        this.options = { ...defaultOptions, ...options };
        this._el.getAttribute("data-show") === "true" ? this.show() : this.hide();
    }

    show() {
        // We are getting the structure so that the modal dialogs can be created or modified dynamically and the structure can be defined in the HTML. 

        // Find the close button
        this._closeButton = this._el.querySelector(this.options.selectorCloseButton);

        // Get the data attributes:
        //  - data-backdrop: if present, clicking on the backdrop will close the modal
        //  - data-escape: if present, pressing the Escape key will close the modal
        this._backdrop = this._el.getAttribute("data-backdrop") !== null;
        this._esc = this._el.getAttribute("data-escape") !== null;

        if (!this._closeButton) {
            console.warn(`Close button not found in modal dialog. Expected selector: ${this.options.selectorCloseButton}`);
        } else {
            // If the close button is found, we can add a click event listener to it to hide the modal when clicked
            this._handlers.closeButtonClick = (event) => {
                event.preventDefault();
                this.close();
            };
            this._closeButton.addEventListener("click", this._handlers.closeButtonClick);
        }

        // If the backdrop is enabled, add a click event listener to the modal itself to hide it when clicked
        if (this._backdrop) {
            this._handlers.backdropClick = (event) => {
                if (event.target === this._el) {
                    this.close();
                }
            };
            this._el.addEventListener("click", this._handlers.backdropClick);
        }

        // If the Escape key is enabled, add a keydown event listener to the document to hide the modal when Escape is pressed
        if (this._esc) {
            this._handlers.escKeydown = (event) => {
                if (event.key === "Escape") {
                    this.close();
                }
            };
            document.addEventListener("keydown", this._handlers.escKeydown);
        }

        // Find the action buttons inside the modal
        this._actionButtons = this._el.querySelectorAll(this.options.selectorModalButton);
        if (this._actionButtons.length === 0) {
            console.warn(`No action buttons found in modal dialog. Expected selector: ${this.options.selectorModalButton}`);
        } else {
        }

        // Each action button will have a handler that will be executed when the button is clicked. The handler will be determined by the value of the "data-modal-button" attribute.
        this._actionButtons.forEach(button => {
            const actionKey = button.getAttribute("data-modal-action");
            if (!actionKey) {
                console.warn(`Action button does not have a "data-modal-action" attribute. Button:`, button);
                return;
            }

            // Determine the action to take when the button is clicked
            let actionHandler = null;
            if (this.options.buttonActions[actionKey]) {
                // If the actionKey is defined in buttonActions, use the corresponding function
                actionHandler = function() {
                    this.options.buttonActions[actionKey]();
                    this._dispatchEvent(`action-${actionKey}`);
                }
            } else {
                actionHandler = function() {
                    this._dispatchEvent(`action-${actionKey}`);
                };
            }

            // Attach the click event listener to the button
            if (actionHandler) {
                button._jwg = {
                    handler: (event) => {
                        event.preventDefault();
                        actionHandler.call(this);
                    }
                };
                button.addEventListener("click", button._jwg.handler);
            }
        });

        this._el.classList.add(this.options.visibleClass);
        this._el.classList.remove(this.options.hiddenClass);

        // Dispatch a custom event to notify that the modal has been shown
        this._dispatchEvent("shown");
    }

    /**
     * Dispatch a custom event from the modal dialog element. This can be used to notify other parts of the application about certain actions or 
     *  state changes within the modal.
     */
    _dispatchEvent(eventName) {
        // We'll add a reference to the modal dialog instance in the event detail, so that event listeners can access it if needed.
        const event = new CustomEvent(`jwg-modal-${eventName}`, {
            bubbles: true,
            cancelable: true,
            detail: { modal: this }
        });
        this._el.dispatchEvent(event);
    }

    /**
     * Closes the modal dialog. This method will hide the modal and call the onClose callback if it was provided in the options. Moreover,
     *   it will dispatch a custom "modalClosed" event from the modal element to notify other parts of the application that the modal has been closed.
     */
    close() {
        this.hide();
        if (typeof this.options.onClose === "function") {
            this.options.onClose();
        }
        this._dispatchEvent("closed");
    }

    /**
     * Hide the modal dialog. This method will remove the visible class and add the hidden class to the modal element, effectively hiding it from view.
     *  It will also remove any event listeners that were added when the modal was shown to prevent memory leaks.
     *  If an onClose callback function was provided in the options, it will be called after the modal is hidden.
     *  Additionally, it will dispatch a custom "modalClosed" event from the modal element.
     */
    hide() {
        this._el.classList.remove(this.options.visibleClass);
        this._el.classList.add(this.options.hiddenClass);

        // Remove event listeners to avoid memory leaks
        if (this._closeButton && this._handlers.closeButtonClick) {
            this._closeButton.removeEventListener("click", this._handlers.closeButtonClick);
        }
        if (this._backdrop && this._handlers.backdropClick) {
            this._el.removeEventListener("click", this._handlers.backdropClick);
        }
        if (this._esc && this._handlers.escKeydown) {
            document.removeEventListener("keydown", this._handlers.escKeydown);
        }
        if (this._actionButtons) {
            this._actionButtons.forEach(button => {
                if (button._jwg && button._jwg.handler) {
                    button.removeEventListener("click", button._jwg.handler);
                }
            });
        }
        // Dispatch a custom event to notify that the modal has been closed
        this._dispatchEvent("hidden");
    }

    /**
     * Initializes all modal dialogs on the page with the specified selector and options.
     * @param {string} selector 
     * @param {Object} options 
     */
    static initModals(selector = ".jwg-modal", options = {}) {
        const modalElements = document.querySelectorAll(selector);
        modalElements.forEach(modalElement => {
            new ModalDialog(modalElement, options);
        });
    }
}