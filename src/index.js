export { BaseScreen } from "./js/baseScreen.js";
export { I18n } from "./js/i18n.js";
export { GameController } from "./js/gameController.js";
export { StateController } from "./js/stateController.js";
export { ModalDialog } from "./js/modalDialog.js";
export { findUIElement } from "./js/utils.js";

import { BaseScreen } from "./js/baseScreen.js";
import { I18n } from "./js/i18n.js";
import { GameController } from "./js/gameController.js";
import { StateController } from "./js/stateController.js";
import { ModalDialog } from "./js/modalDialog.js";
import { findUIElement } from "./js/utils.js";

export const version = "1.1.0";

export const JWG = Object.freeze({
	BaseScreen,
	I18n,
	GameController,
	StateController,
	ModalDialog,
    findUIElement,
	version,
});

export default JWG;