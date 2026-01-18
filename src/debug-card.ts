/**
 * Debug Card for Home Assistant
 * 
 * Displays raw JSON data for calendar events and weather forecasts.
 * Use this to inspect the actual data shapes from your HA instance.
 * 
 * Config:
 * ```yaml
 * type: custom:display-calendar-debug
 * calendars:
 *   - calendar.family
 *   - calendar.work
 * weather: weather.forecast_home
 * ```
 */

interface HomeAssistant {
  states: Record<string, unknown>;
  callWS: <T>(message: Record<string, unknown>) => Promise<T>;
}

interface CardConfig {
  calendars?: string[];
  weather?: string;
}

interface CalendarEventsResponse {
  events: Record<string, unknown>[];
}

interface WeatherForecastResponse {
  forecast: Record<string, unknown>[];
}

// Helper to stringify errors properly
function errorToString(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'object' && err !== null) {
    return JSON.stringify(err, null, 2);
  }
  return String(err);
}

class DisplayCalendarDebug extends HTMLElement {
  private _hass?: HomeAssistant;
  private _config?: CardConfig;
  private _calendarData: Record<string, unknown> = {};
  private _weatherState: unknown = null;
  private _weatherForecastDaily: unknown = null;
  private _weatherForecastHourly: unknown = null;
  private _error: string | null = null;
  private _loading = false;

  set hass(hass: HomeAssistant) {
    const firstLoad = !this._hass;
    this._hass = hass;
    
    if (firstLoad) {
      this._fetchData();
    }
    
    // Update weather state from entity
    if (this._config?.weather && hass.states[this._config.weather]) {
      this._weatherState = hass.states[this._config.weather];
      this._render();
    }
  }

  setConfig(config: CardConfig) {
    this._config = config;
    this._render();
  }

  private async _fetchData() {
    if (!this._hass || !this._config) return;
    
    this._loading = true;
    this._error = null;
    this._render();

    try {
      // Fetch calendar events
      if (this._config.calendars?.length) {
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 14);

        for (const calendarId of this._config.calendars) {
          try {
            const result = await this._hass.callWS<{ response: Record<string, CalendarEventsResponse> }>({
              type: 'call_service',
              domain: 'calendar',
              service: 'get_events',
              service_data: {
                start_date_time: start.toISOString(),
                end_date_time: end.toISOString(),
              },
              target: { entity_id: calendarId },
              return_response: true,
            });
            this._calendarData[calendarId] = result.response?.[calendarId]?.events ?? [];
          } catch (err) {
            this._calendarData[calendarId] = { error: errorToString(err) };
          }
        }
      }

      // Fetch weather forecasts (daily and hourly)
      if (this._config.weather) {
        // Daily forecast
        try {
          const result = await this._hass.callWS<{ response: Record<string, WeatherForecastResponse> }>({
            type: 'call_service',
            domain: 'weather',
            service: 'get_forecasts',
            service_data: { type: 'daily' },
            target: { entity_id: this._config.weather },
            return_response: true,
          });
          this._weatherForecastDaily = result.response?.[this._config.weather]?.forecast ?? [];
        } catch (err) {
          this._weatherForecastDaily = { error: errorToString(err) };
        }

        // Hourly forecast
        try {
          const result = await this._hass.callWS<{ response: Record<string, WeatherForecastResponse> }>({
            type: 'call_service',
            domain: 'weather',
            service: 'get_forecasts',
            service_data: { type: 'hourly' },
            target: { entity_id: this._config.weather },
            return_response: true,
          });
          console.log('weather forecast hourly', result);
          this._weatherForecastHourly = result.response?.[this._config.weather]?.forecast ?? [];
        } catch (err) {
          this._weatherForecastHourly = { error: errorToString(err) };
        }
      }
    } catch (err) {
      this._error = errorToString(err);
    }

    this._loading = false;
    this._render();
  }

  private _render() {
    if (!this._config) {
      this.innerHTML = '<ha-card><div class="card-content">No config</div></ha-card>';
      return;
    }

    const styles = `
      <style>
        .debug-card {
          padding: 16px;
          font-family: monospace;
          font-size: 12px;
        }
        .debug-section {
          margin-bottom: 16px;
        }
        .debug-section h3 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: var(--primary-text-color);
        }
        .debug-json {
          background: var(--card-background-color, #1c1c1c);
          border: 1px solid var(--divider-color, #333);
          border-radius: 4px;
          padding: 8px;
          overflow: auto;
          max-height: 300px;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .debug-error {
          color: var(--error-color, #ff5555);
        }
        .debug-loading {
          color: var(--secondary-text-color);
        }
        .refresh-btn {
          margin-bottom: 16px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .section-header h3 {
          margin: 0;
        }
        .copy-btn {
          font-size: 11px;
          padding: 2px 8px;
          cursor: pointer;
          background: var(--primary-color, #03a9f4);
          color: white;
          border: none;
          border-radius: 4px;
        }
        .copy-btn:hover {
          opacity: 0.8;
        }
        .copy-btn.copied {
          background: var(--success-color, #4caf50);
        }
      </style>
    `;

    let content = '';

    if (this._loading) {
      content = '<div class="debug-loading">Loading...</div>';
    } else if (this._error) {
      content = `<div class="debug-error">Error: ${this._error}</div>`;
    } else {
      // Refresh button
      content += '<button class="refresh-btn" id="refresh">Refresh Data</button>';

      // Helper to create section with copy button
      let sectionId = 0;
      const makeSection = (title: string, data: unknown) => {
        const id = `section-${sectionId++}`;
        const json = JSON.stringify(data, null, 2);
        return `
          <div class="debug-section">
            <div class="section-header">
              <h3>${title}</h3>
              <button class="copy-btn" data-target="${id}">Copy</button>
            </div>
            <div class="debug-json" id="${id}">${json}</div>
          </div>
        `;
      };

      // Weather state
      if (this._config.weather) {
        content += makeSection(`Weather Entity State (${this._config.weather})`, this._weatherState);
      }

      // Weather forecast - daily
      if (this._weatherForecastDaily) {
        content += makeSection('Weather Forecast (daily)', this._weatherForecastDaily);
      }

      // Weather forecast - hourly
      if (this._weatherForecastHourly) {
        content += makeSection('Weather Forecast (hourly)', this._weatherForecastHourly);
      } else {
        content += `
          <div class="debug-section">
            <div class="section-header">
              <h3>Weather Forecast (hourly)</h3>
            </div>
            <div class="debug-json">No hourly forecast available</div>
          </div>
        `;
      }

      // Calendar events
      if (this._config.calendars?.length) {
        for (const calendarId of this._config.calendars) {
          const events = this._calendarData[calendarId];
          content += makeSection(`Calendar Events (${calendarId})`, events);
        }
      }
    }

    this.innerHTML = `
      ${styles}
      <ha-card>
        <div class="card-content debug-card">
          <h2>Display Calendar Debug</h2>
          ${content}
        </div>
      </ha-card>
    `;

    // Add refresh button handler
    const refreshBtn = this.querySelector('#refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this._fetchData());
    }

    // Add copy button handlers
    this.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const button = e.target as HTMLButtonElement;
        const targetId = button.dataset.target;
        if (!targetId) return;
        
        const targetEl = this.querySelector(`#${targetId}`);
        if (!targetEl) return;
        
        try {
          await navigator.clipboard.writeText(targetEl.textContent || '');
          button.textContent = 'Copied!';
          button.classList.add('copied');
          setTimeout(() => {
            button.textContent = 'Copy';
            button.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
          button.textContent = 'Failed';
          setTimeout(() => {
            button.textContent = 'Copy';
          }, 2000);
        }
      });
    });
  }

  // Required for card picker
  static getStubConfig() {
    return {
      calendars: ['calendar.family'],
      weather: 'weather.forecast_home',
    };
  }
}

// Register the custom element
customElements.define('display-calendar', DisplayCalendarDebug);

// Register with HA's custom card registry
declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'display-calendar',
  name: 'Display Calendar',
  description: 'Debug card that shows raw calendar and weather data',
});

console.info('%c DISPLAY-CALENDAR-DEBUG %c loaded', 'background: #3b82f6; color: white; font-weight: bold', '');
