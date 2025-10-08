/**
 * Simple Event Delegation Utility
 * 
 * A lightweight solution that can be added to existing BasePage
 * without breaking current functionality.
 */

export class SimpleEventDelegation {
    constructor(element) {
        this.element = element;
        this.handlers = new Map();
        this.setupDelegation();
    }

    /**
     * Add a delegated event handler
     */
    on(selector, event, handler) {
        const key = `${selector}-${event}`;
        this.handlers.set(key, { selector, event, handler });
    }

    /**
     * Remove a delegated event handler
     */
    off(selector, event) {
        const key = `${selector}-${event}`;
        this.handlers.delete(key);
    }

    /**
     * Set up event delegation for common events
     */
    setupDelegation() {
        // Set up delegation for click events
        this.element.addEventListener('click', (e) => {
            this.handleEvent(e, 'click');
        });

        // Set up delegation for change events
        this.element.addEventListener('change', (e) => {
            this.handleEvent(e, 'change');
        });

        // Add other events as needed
    }

    /**
     * Handle delegated events
     */
    handleEvent(e, eventType) {
        for (const [key, handlerDef] of this.handlers) {
            if (handlerDef.event === eventType) {
                const target = e.target.closest(handlerDef.selector);
                if (target) {
                    try {
                        // Create a new event object with the correct currentTarget
                        const delegatedEvent = {
                            ...e,
                            currentTarget: target,
                            target: e.target,
                            type: e.type,
                            preventDefault: e.preventDefault.bind(e),
                            stopPropagation: e.stopPropagation.bind(e)
                        };
                        handlerDef.handler(delegatedEvent);
                    } catch (error) {
                        console.error(`Error in delegated event handler for ${handlerDef.selector}:`, error);
                    }
                }
            }
        }
    }
}
