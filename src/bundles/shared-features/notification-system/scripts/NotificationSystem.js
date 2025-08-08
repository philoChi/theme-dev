/**
 * Global Notification System
 * Provides a reusable notification component for all sections
 * Version: 1.0
 */

class NotificationSystem {
  constructor() {
    this.container = null;
    this.notifications = new Set();
    this.maxNotifications = 3;
    this.init();
  }

  init() {
    // Create or find the notification container
    this.container = document.querySelector('.notification-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'notification-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a notification message
   * @param {string} message - The message to display
   * @param {string} type - The notification type ('error', 'success', 'info', 'warning')
   * @param {number} duration - How long to show the notification in milliseconds
   * @param {Object} options - Additional options
   * @returns {HTMLElement} The notification element
   */
  show(message, type = 'info', duration = 3000, options = {}) {
    // Check if we need to remove oldest notification
    if (this.notifications.size >= this.maxNotifications) {
      const oldestNotification = this.notifications.values().next().value;
      if (oldestNotification) {
        // Remove from tracking immediately
        this.notifications.delete(oldestNotification);
        // Animate out
        oldestNotification.classList.add('notification--hiding');
        setTimeout(() => {
          oldestNotification.remove();
        }, 300);
      }
    }

    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;

    // Add custom class if provided
    if (options.customClass) {
      notification.classList.add(options.customClass);
    }

    // Build notification HTML
    notification.innerHTML = `
      <div class="notification__content">
        ${this.getIcon(type)}
        <span class="notification__message">${this.escapeHtml(message)}</span>
        <button class="notification__close" aria-label="Close notification">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;

    // Add close functionality
    const closeBtn = notification.querySelector('.notification__close');
    const closeNotification = () => {
      notification.classList.add('notification--hiding');
      setTimeout(() => {
        notification.remove();
        this.notifications.delete(notification);
      }, 300);
    };

    closeBtn.addEventListener('click', closeNotification);

    // Add to container and track
    this.container.appendChild(notification);
    this.notifications.add(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add('notification--visible');
    });

    // Auto-remove after duration if not persistent
    if (!options.persistent) {
      setTimeout(() => {
        if (notification.parentNode) {
          closeNotification();
        }
      }, duration);
    }

    // Return notification element for additional control
    return notification;
  }

  /**
   * Get icon SVG based on notification type
   * @param {string} type - The notification type
   * @returns {string} Icon HTML
   */
  getIcon(type) {
    const icons = {
      success: `<svg class="notification__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="currentColor"/>
      </svg>`,
      error: `<svg class="notification__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z" fill="currentColor"/>
      </svg>`,
      warning: `<svg class="notification__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 17.5L10 2.5L19 17.5H1ZM11 15.5V13.5H9V15.5H11ZM11 11.5V7.5H9V11.5H11Z" fill="currentColor"/>
      </svg>`,
      info: `<svg class="notification__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V9H11V15ZM11 7H9V5H11V7Z" fill="currentColor"/>
      </svg>`
    };

    return icons[type] || icons.info;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications.forEach(notification => {
      notification.remove();
    });
    this.notifications.clear();
  }

  /**
   * Convenience methods for different notification types
   */
  success(message, duration, options) {
    return this.show(message, 'success', duration, options);
  }

  error(message, duration, options) {
    return this.show(message, 'error', duration, options);
  }

  warning(message, duration, options) {
    return this.show(message, 'warning', duration, options);
  }

  info(message, duration, options) {
    return this.show(message, 'info', duration, options);
  }
}

export default NotificationSystem;