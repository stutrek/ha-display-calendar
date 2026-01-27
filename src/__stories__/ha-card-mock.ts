/**
 * Mock ha-card component for Storybook
 * Provides basic card styling to match Home Assistant's ha-card appearance
 */
class HaCardMock extends HTMLElement {
  connectedCallback() {
    // Apply HA card styles
    this.style.display = 'block';
    this.style.background = 'var(--ha-card-background, var(--card-background-color, #1c1c1c))';
    this.style.borderRadius = 'var(--ha-card-border-radius, 12px)';
    this.style.overflow = 'hidden';
    this.style.position = 'relative';
  }
}

// Only register if not already defined (avoid errors in HA)
if (typeof customElements !== 'undefined' && !customElements.get('ha-card')) {
  customElements.define('ha-card', HaCardMock);
}

export { HaCardMock };
