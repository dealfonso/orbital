export class I18n {

  /**
   * Returns the singleton instance of the I18n class.
   * @returns {I18n} The singleton instance.
   */
  static getInstance() {
    if (!I18n.instance) {
      I18n.instance = new I18n();
    }
    return I18n.instance;
  }

  /**
   * Translates a key to the current language, replacing variables if provided.
   *  (syntactic sugar for I18n.getInstance().t())
   * @param {string} key - The translation key.
   * @param {Object} vars - Variables to replace in the translated string.
   * @returns {string} The translated string or the key if not found.
   */
  static t(key, vars = {}) {
    return I18n.getInstance().t(key, vars);
  }

  constructor() {
    this.collectStrings = false;
    this.translations = {};
    this.collectedStrings = {};
    this.currentLanguage = null;
  }

  /**
   * Enables or disables string collection, when using t() method. When enabled, all translation keys used will be collected in an object for later use.
   * @param {boolean} enable - Whether to enable string collection.
   */
  setCollectStrings(enable = true) {
    this.collectStrings = enable;
    if (enable) {
      this.collectedStrings = {};
    }
  }

  /**
   * Returns the collected strings.
   * @returns {Object} The collected strings.
   */
  getCollectedStrings() {
    return structuredClone(this.collectedStrings);
  }

  // The translations object is structured as follows:
  // {
  //   "en": {
  //     "key1": "Translation in English",
  //     "key2": "Another translation in English"
  //   },
  //   "es": {
  //     "key1": "Traducción en español",
  //     "key2": "Otra traducción en español"
  //   }
  // }
  translations = {}

  // The current active language code, e.g., "en" or "es"
  currentLanguage = null;

  /**
   * Sets the translations for the application. This method can be called multiple times to add or update translations.
   * @param {Object} newTranslations 
   */
  setTranslations(newTranslations) {
    for (const [lang, dict] of Object.entries(newTranslations)) {
      if (!this.translations[lang]) {
        this.translations[lang] = {};
      }
      Object.assign(this.translations[lang], dict);
    }

    // If the current language is not set, set it to the first available language
    if (!this.currentLanguage || !this.translations[this.currentLanguage]) {
      this.currentLanguage = Object.keys(this.translations)[0];
    }
  }

  /**
   * Returns an array of all supported language codes.
   * @returns {Array<string>} An array of supported language codes.
   */
  getSupportedLanguages() {
    return Object.keys(this.translations);
  }

  /**
   * Returns the current active language code.
   * @returns {string} The current active language code.
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Applies translations to the HTML elements.
   * @param {string} lang - The language code to apply.
   * @param {Object} vars - Variables to replace in the translated strings.
   * @param {Array<HTMLElement>} nodes - The HTML elements to apply translations to.
   */
  applyTranslations(lang, vars = {}, nodes = null) {
    document.documentElement.lang = lang;
    if (!nodes) {
      nodes = document.querySelectorAll("[data-i18n]");
    }
    nodes.forEach((node) => {
      const key = node.getAttribute("data-i18n");
      const text = this.t(key, vars, lang);
      if (text === null) {
          console.warn(`No translation for key "${key}" in language "${lang}"`);
      } else {
          node.textContent = text;
      }
    });
  }

  /**
   * Sets the active language for the application.
   * @param {string} lang - The language code to set as active. If "auto", it will use the browser's language setting.
   *   if it is not supported, it will fall back to the default language.
   */
  setActiveLanguage(lang) {
    if (lang === "auto") {
      lang = this.getInitialLanguage();
    }
    
    if (!this.getSupportedLanguages().includes(lang)) {
      console.warn(`Language "${lang}" is not supported. Falling back to default language.`);
      lang = this.getSupportedLanguages()[0];
    }
    this.currentLanguage = lang;
    this.applyTranslations(lang);
  }

  /**
   * Extracts all strings from the HTML that have a data-i18n attribute and returns them as an object.
   *   This can be used to generate a base translation file.
   * @returns {Object} An object where keys are the values of data-i18n attributes and values are the text content of the elements.
   */
  extractStringsFromHTML(nodes = null) {
    if (!nodes) {
      nodes = document.querySelectorAll("[data-i18n]");
    }
    const extracted = {};
    nodes.forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (!extracted[key]) {
        extracted[key] = node.textContent.trim();
      }
    });
    return extracted;
  }

  /**
   * Gets the initial language based on the browser's language setting.
   * @returns {string} The initial language code.
   */
  getInitialLanguage() {
    const browser = (navigator.language || "es").slice(0, 2).toLowerCase();
    if (this.getSupportedLanguages().includes(browser)) {
      return browser;
    }
    return "es";
  }

  /**
   * Translates a key to the current language, replacing variables if provided.
   * @param {string} key - The translation key.
   * @param {Object} vars - Variables to replace in the translated string.
   * @param {string} lang - The language to translate to (optional, defaults to current language).
   * @returns {string} The translated string.
   */
  t(key, vars = {}, lang = null) {
    if (!lang) {
      lang = this.currentLanguage;
    }

    let dict = {};
    let effectiveLang = null;
    if (this.translations[lang]) {
      dict = this.translations[lang];
      effectiveLang = lang;
    } else if (this.translations[this.getSupportedLanguages()[0]]) {
      dict = this.translations[this.getSupportedLanguages()[0]];
      effectiveLang = this.getSupportedLanguages()[0];
    }

    // const dict = this.translations[lang] || this.translations[this.getSupportedLanguages()[0]] || {};
    // let value = dict[key] ?? this.translations[this.getSupportedLanguages()[0]][key] ?? key;
    let value = dict[key] ?? key;

    if (this.collectStrings) {
      if (!this.collectedStrings[effectiveLang]) {
        this.collectedStrings[effectiveLang] = {};
      }
      this.collectedStrings[effectiveLang][key] = value;
    }

    for (const [varName, varValue] of Object.entries(vars)) {
      value = value.replaceAll(`{${varName}}`, String(varValue));
    }
    return value;
  }
}