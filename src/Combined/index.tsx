// ============================================================================
// Combined Build Entry Point
// Registers both Display Calendar and Display Weather cards
// ============================================================================

// Import both cards to register them
import '../CalendarCard/index';
import '../WeatherCard/index';

console.info(
  '%c DISPLAY-COMBINED %c loaded ',
  'background: #8b5cf6; color: white; font-weight: bold',
  ''
);

// Re-export both for potential direct usage
export { DisplayCalendarCard } from '../CalendarCard/index';
export { DisplayWeatherCard } from '../WeatherCard/index';
