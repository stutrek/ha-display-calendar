import { css } from './styleRegistry';

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
