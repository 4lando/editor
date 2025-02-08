class Debug {
  constructor(enabled = false) {
    this.enabled = enabled;
    this.prefix = '[Landofile Editor]';
  }

  enable() {
    this.enabled = true;
    this.log('Debug mode enabled');
  }

  disable() {
    this.log('Debug mode disabled');
    this.enabled = false;
  }

  log(...args) {
    if (this.enabled) {
      console.log(this.prefix, ...args);
    }
  }

  error(...args) {
    if (this.enabled) {
      console.error(this.prefix, ...args);
    }
  }

  warn(...args) {
    if (this.enabled) {
      console.warn(this.prefix, ...args);
    }
  }

  info(...args) {
    if (this.enabled) {
      console.info(this.prefix, ...args);
    }
  }
}

export const debug = new Debug(localStorage.getItem('debug') === 'true');

// Enable debug mode with: localStorage.setItem('debug', 'true')
// Disable debug mode with: localStorage.setItem('debug', 'false') 