export class KeepAwake {
  constructor() {
    this._sentinel = null;
    this._shouldBeActive = false;
    this._isListening = false;

    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    this._handlePageHide = this._handlePageHide.bind(this);
    this._handleSentinelRelease = this._handleSentinelRelease.bind(this);
  }

  /**
   * Returns true if the browser supports Wake Lock.
   */
  get isSupported() {
    return typeof navigator !== "undefined" && "wakeLock" in navigator;
  }

  /**
   * Returns true when a wake lock is currently active.
   */
  get isActive() {
    return !!this._sentinel;
  }

  /**
   * Enables screen wake lock and starts internal event handling.
   */
  async activate() {
    this._shouldBeActive = true;
    this._addEventListeners();
    return this._requestWakeLock();
  }

  /**
   * Releases wake lock and removes all internal event handlers.
   */
  async release() {
    this._shouldBeActive = false;
    this._removeEventListeners();
    await this._releaseWakeLock();
  }

  async _requestWakeLock() {
    if (!this.isSupported) {
      return false;
    }

    if (document.visibilityState !== "visible") {
      return false;
    }

    if (this._sentinel) {
      return true;
    }

    try {
      const sentinel = await navigator.wakeLock.request("screen");
      sentinel.addEventListener("release", this._handleSentinelRelease);
      this._sentinel = sentinel;
      return true;
    } catch (error) {
      console.warn("Wake Lock request failed", error);
      return false;
    }
  }

  async _releaseWakeLock() {
    if (!this._sentinel) {
      return;
    }

    const sentinel = this._sentinel;
    this._sentinel = null;
    sentinel.removeEventListener("release", this._handleSentinelRelease);

    try {
      await sentinel.release();
    } catch (error) {
      // Ignore failures here because release can race with browser-driven release.
    }
  }

  async _handleVisibilityChange() {
    if (!this._shouldBeActive) {
      return;
    }

    if (document.visibilityState === "visible") {
      await this._requestWakeLock();
    }
  }

  _handlePageHide() {
    // Cleanup local state when the page is being unloaded.
    if (this._sentinel) {
      this._sentinel.removeEventListener("release", this._handleSentinelRelease);
      this._sentinel = null;
    }
  }

  async _handleSentinelRelease() {
    this._sentinel = null;

    if (!this._shouldBeActive) {
      return;
    }

    if (document.visibilityState === "visible") {
      await this._requestWakeLock();
    }
  }

  _addEventListeners() {
    if (this._isListening) {
      return;
    }

    document.addEventListener("visibilitychange", this._handleVisibilityChange);
    window.addEventListener("pagehide", this._handlePageHide);
    this._isListening = true;
  }

  _removeEventListeners() {
    if (!this._isListening) {
      return;
    }

    document.removeEventListener("visibilitychange", this._handleVisibilityChange);
    window.removeEventListener("pagehide", this._handlePageHide);
    this._isListening = false;
  }
}
