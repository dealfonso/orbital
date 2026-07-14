export { BaseScreen } from "./js/baseScreen.js";
export { I18n } from "./js/i18n.js";
export { ScreenController } from "./js/screenController.js";
export { StateController } from "./js/stateController.js";
export { ModalDialog } from "./js/modalDialog.js";
export { findUIElement } from "./js/utils.js";

import { BaseScreen } from "./js/baseScreen.js";
import { I18n } from "./js/i18n.js";
import { ScreenController } from "./js/screenController.js";
import { StateController } from "./js/stateController.js";
import { ModalDialog } from "./js/modalDialog.js";
import { findUIElement } from "./js/utils.js";

export const version = "1.1.0";

export const ORB = Object.freeze({
	BaseScreen,
	I18n,
	ScreenController,
	StateController,
	ModalDialog,
    findUIElement,
	version,
});

export default ORB;