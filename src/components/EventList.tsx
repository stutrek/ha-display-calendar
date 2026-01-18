import { useCalendar, formatTimeRange, type EnrichedEvent } from './CalendarContext';

// CSS is imported via shadow DOM styles or storybook
// import './EventList.css';

// Weather condition to emoji mapping (for Storybook / non-HA environments)
const WEATHER_EMOJI: Record<string, string> = {
  sunny: '☀️',
  'clear-night': '🌙',
  cloudy: '☁️',
  partlycloudy: '⛅',
  'partlycloudy-night': '⛅',
  rainy: '🌧️',
  snowy: '❄️',
  'snowy-rainy': '🌨️',
  fog: '🌫️',
  hail: '🌨️',
  lightning: '⚡',
  'lightning-rainy': '⛈️',
  windy: '💨',
  'windy-variant': '💨',
  exceptional: '⚠️',
};

function WeatherDisplay({ condition, temperature }: { condition: string; temperature: number }) {
  const emoji = WEATHER_EMOJI[condition] ?? '🌡️';
  
  return (
    <span class="event-weather">
      <span class="weather-icon">{emoji}</span>
      <span class="weather-temp">{Math.round(temperature)}°</span>
    </span>
  );
}

function EventItem({ event }: { event: EnrichedEvent }) {
  const timeRange = event.isAllDay ? null : formatTimeRange(event.start, event.end);
  
  return (
    <div class="event-item">
      <div class="event-colors">
        {event.colors.map((color, i) => (
          <span
            key={i}
            class="event-color-bar"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div class="event-content">
        {timeRange && <span class="event-time">{timeRange}</span>}
        <span class="event-summary">{event.summary}</span>
      </div>
      {event.weather && (
        <WeatherDisplay
          condition={event.weather.condition}
          temperature={event.weather.temperature}
        />
      )}
    </div>
  );
}

export function EventList() {
  const { eventsForSelectedDay, selectedDay } = useCalendar();
  
  // Separate timed and all-day events (already sorted by context)
  const timedEvents = eventsForSelectedDay.filter(e => !e.isAllDay);
  const allDayEvents = eventsForSelectedDay.filter(e => e.isAllDay);
  
  const hasTimedEvents = timedEvents.length > 0;
  const hasAllDayEvents = allDayEvents.length > 0;
  
  if (eventsForSelectedDay.length === 0) {
    return (
      <div class="event-list">
        <div class="event-list-empty">
          No events on {selectedDay.toLocaleDateString(undefined, { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
    );
  }
  
  return (
    <div class="event-list">
      {/* Timed events */}
      {timedEvents.map((event, i) => (
        <EventItem key={`timed-${i}`} event={event} />
      ))}
      
      {/* Divider between timed and all-day */}
      {hasTimedEvents && hasAllDayEvents && (
        <div class="event-divider" />
      )}
      
      {/* All-day events */}
      {allDayEvents.map((event, i) => (
        <EventItem key={`allday-${i}`} event={event} />
      ))}
    </div>
  );
}
