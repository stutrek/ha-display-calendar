import type { HomeAssistant } from './HAContext';

/**
 * Base class for Home Assistant cards with entity subscription management.
 * 
 * Uses the standard HA pattern: Home Assistant calls `set hass()` whenever any
 * entity state changes. We compare old vs new states and notify Preact components
 * that subscribed to specific entities via `_subscribeToEntity`.
 */
export abstract class BaseHACard<TConfig> extends HTMLElement {
  protected _hass?: HomeAssistant;
  protected _config?: TConfig;
  protected _shadowRoot: ShadowRoot;
  private _entityChangeListeners = new Map<string, Set<(entity: any) => void>>();

  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
  }

  // Lifecycle methods
  connectedCallback() {
    console.log(`[${this.getCardName()}] Connected to DOM`);
    if (this._hass && this._config) {
      this._render();
    }
  }

  disconnectedCallback() {
    console.log(`[${this.getCardName()}] Disconnected from DOM`);
    this._entityChangeListeners.clear();
  }

  // Hass setter - called by Home Assistant whenever any entity state changes
  set hass(hass: HomeAssistant) {
    const prevStates = this._hass?.states;
    this._hass = hass;

    // Find which of our entities changed and notify listeners
    const changed: Record<string, any> = {};
    for (const entityId of this._getEntityIds()) {
      const newState = hass.states[entityId];
      const oldState = prevStates?.[entityId];
      if (newState !== oldState) {
        changed[entityId] = newState;
      }
    }
    this._notifyEntityChanges(changed);

    // Initial render when we first get hass + config
    if (!prevStates && this._config) {
      this._render();
    }
  }

  // Called by child classes when config changes - just triggers a re-render
  protected _subscribe() {
    if (this._hass && this._config) {
      this._render();
    }
  }

  private _notifyEntityChanges(entities: Record<string, any>) {
    for (const [entityId, entity] of Object.entries(entities)) {
      const listeners = this._entityChangeListeners.get(entityId);
      if (listeners) {
        console.log(`[${this.getCardName()}] Notifying ${listeners.size} listeners for ${entityId}`);
        listeners.forEach(listener => listener(entity));
      }
    }
  }

  protected _subscribeToEntity = (entityId: string, callback: (entity: any) => void) => {
    console.log(`[${this.getCardName()}] Component subscribing to ${entityId}`);
    
    if (!this._entityChangeListeners.has(entityId)) {
      this._entityChangeListeners.set(entityId, new Set());
    }
    this._entityChangeListeners.get(entityId)!.add(callback);

    return () => {
      console.log(`[${this.getCardName()}] Component unsubscribing from ${entityId}`);
      const listeners = this._entityChangeListeners.get(entityId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this._entityChangeListeners.delete(entityId);
        }
      }
    };
  };

  // Abstract methods that child classes must implement
  protected abstract getCardName(): string;
  protected abstract _getEntityIds(): string[];
  protected abstract _render(): void;
  abstract setConfig(config: TConfig): void;
}
