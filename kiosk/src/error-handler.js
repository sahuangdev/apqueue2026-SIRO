/**
 * Global error handling
 * Captures uncaught exceptions and unhandled promise rejections
 */
const logger = require('./logger');

class ErrorHandler {
  setup() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      this.showErrorDialog('Application Error', 
        `An unexpected error occurred:\n\n${error.message}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: promise.toString(),
      });
      this.showErrorDialog('Application Error',
        `An unexpected error occurred:\n\n${reason}`);
    });
  }

  /**
   * Show error dialog (safely, with fallback)
   */
  showErrorDialog(title, message) {
    try {
      const { dialog } = require('electron');
      dialog.showErrorBox(title, message);
    } catch (err) {
      logger.error('Failed to show error dialog', err);
      console.error(`${title}: ${message}`);
    }
  }
}

module.exports = new ErrorHandler();
