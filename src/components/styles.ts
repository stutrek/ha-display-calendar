// CSS tagged template literal for syntax highlighting
// This is a no-op function that just returns the string
export const css = (strings: TemplateStringsArray, ...values: unknown[]): string => {
  return strings.reduce((result, str, i) => result + str + (values[i] ?? ''), '');
};

// CSS styles as strings for Shadow DOM injection

export const monthGridStyles = css`
.month-grid {
  font-family: system-ui, -apple-system, sans-serif;
  width: 100%;
}

/* Header with month/year and navigation */
.month-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.month-title-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.month-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-text-color, #fff);
}

.today-btn {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  background: none;
  border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.3));
  border-radius: 4px;
  color: var(--secondary-text-color, #aaa);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.today-btn:hover {
  background-color: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
  color: var(--primary-text-color, #fff);
}

.today-btn:focus {
  outline: 2px solid var(--primary-color, #03a9f4);
  outline-offset: 2px;
}

.month-nav {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.75rem;
  color: var(--primary-text-color, #fff);
  border-radius: 4px;
  transition: background-color 0.15s;
}

.month-nav:hover {
  background-color: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
}

.month-nav:focus {
  outline: 2px solid var(--primary-color, #03a9f4);
  outline-offset: 2px;
}

/* Weekday header row */
.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 0.25rem;
}

.weekday {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--secondary-text-color, #aaa);
  padding: 0.25rem;
}

/* Days grid */
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  color: var(--primary-text-color, #fff);
  transition: background-color 0.15s;
  position: relative;
}

.day-cell:hover {
  background-color: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
}

.day-cell:focus {
  outline: 2px solid var(--primary-color, #03a9f4);
  outline-offset: -2px;
}

.day-cell.other-month {
  color: var(--disabled-text-color, #666);
}

.day-cell.today .day-number {
  background-color: var(--primary-color, #03a9f4);
  color: var(--text-primary-color, #fff);
  border-radius: 50%;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-cell.selected {
  background-color: var(--primary-color, #03a9f4);
  color: var(--text-primary-color, #fff);
}

.day-cell.selected.today .day-number {
  background-color: transparent;
}

.day-number {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
}

/* Event dots */
.event-dots {
  display: flex;
  gap: 2px;
  margin-top: 2px;
  position: absolute;
  bottom: 4px;
}

.event-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
`;

export const eventListStyles = css`
.event-list {
  font-family: system-ui, -apple-system, sans-serif;
  padding: 0.5rem;
}

.event-list-empty {
  color: var(--secondary-text-color, #888);
  text-align: center;
  padding: 1rem;
  font-size: 0.875rem;
}

.event-item {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  padding: 0.5rem 0;
  min-height: 2.5rem;
}

.event-item + .event-item {
  border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
}

/* Color bars on left edge - full height of event */
.event-colors {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 4px;
  border-radius: 2px;
  overflow: hidden;
}

.event-color-bar {
  flex: 1;
  width: 100%;
  min-height: 0;
}

/* Event content */
.event-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.125rem;
}

.event-time {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--secondary-text-color, #aaa);
  font-variant-numeric: tabular-nums;
}

.event-summary {
  font-size: 0.875rem;
  color: var(--primary-text-color, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Weather display */
.event-weather {
  display: flex;
  align-items: center;
  align-self: center;
  gap: 0.25rem;
  flex-shrink: 0;
  color: var(--secondary-text-color, #aaa);
}

.weather-icon {
  font-size: 1rem;
}

.weather-temp {
  font-size: 0.75rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* Divider between timed and all-day events */
.event-divider {
  height: 1px;
  background-color: var(--divider-color, rgba(255, 255, 255, 0.2));
  margin: 0.5rem 0;
}
`;

export const cardStyles = css`
:host {
  display: block;
}

.calendar-card {
  background: var(--ha-card-background, var(--card-background-color, #1c1c1c));
  border-radius: var(--ha-card-border-radius, 12px);
  padding: 1rem;
  color: var(--primary-text-color, #fff);
}

.calendar-divider {
  border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}

.calendar-loading {
  text-align: center;
  padding: 2rem;
  color: var(--secondary-text-color, #888);
}
`;

export const allStyles = cardStyles + monthGridStyles + eventListStyles;
