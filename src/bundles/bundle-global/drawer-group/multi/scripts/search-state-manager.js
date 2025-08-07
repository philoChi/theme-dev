/**
 * Search State Manager
 * 
 * Manages state transitions and dispatches events for the search functionality.
 * Ensures predictable state changes and provides a single source of truth.
 */

import SearchConfig from './search-config.js';

class StateManager {
  constructor() {
    this.currentState = SearchConfig.states.IDLE;
    this.previousState = null;
    this.stateData = {};
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Get previous state
   * @returns {string|null} Previous state
   */
  getPreviousState() {
    return this.previousState;
  }

  /**
   * Get state data
   * @returns {Object} Current state data
   */
  getStateData() {
    return this.stateData;
  }

  /**
   * Transition to a new state
   * @param {string} newState - The new state to transition to
   * @param {Object} data - Optional data associated with the state
   */
  setState(newState, data = {}) {
    // Validate state
    const validStates = Object.values(SearchConfig.states);
    if (!validStates.includes(newState)) {
      console.error(`[StateManager] Invalid state: ${newState}`);
      return;
    }

    // Store previous state
    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateData = data;

    console.log(`[StateManager] State transition: ${this.previousState} → ${newState}`, data);

    // Dispatch state change event
    this._dispatchStateChangeEvent(newState, data);
  }

  /**
   * Check if current state matches
   * @param {string} state - State to check
   * @returns {boolean} True if current state matches
   */
  isState(state) {
    return this.currentState === state;
  }

  /**
   * Check if state is in a loading/busy state
   * @returns {boolean} True if in busy state
   */
  isBusy() {
    const busyStates = [
      SearchConfig.states.SEARCHING,
      SearchConfig.states.TYPING
    ];
    return busyStates.includes(this.currentState);
  }

  /**
   * Reset to idle state
   */
  reset() {
    this.setState(SearchConfig.states.IDLE);
  }

  /**
   * Dispatch custom event for state changes
   * @private
   */
  _dispatchStateChangeEvent(newState, data) {
    const event = new CustomEvent('search:stateChange', {
      detail: {
        previousState: this.previousState,
        currentState: newState,
        data: data
      }
    });
    document.dispatchEvent(event);

    // Dispatch specific state events
    const stateEvents = {
      [SearchConfig.states.SEARCHING]: 'search:started',
      [SearchConfig.states.RESULTS]: 'search:completed',
      [SearchConfig.states.EMPTY]: 'search:empty',
      [SearchConfig.states.ERROR]: 'search:error'
    };

    if (stateEvents[newState]) {
      document.dispatchEvent(new CustomEvent(stateEvents[newState], {
        detail: data
      }));
    }
  }
}

export default StateManager;