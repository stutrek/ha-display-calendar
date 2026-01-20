import { useRef, useEffect } from 'preact/hooks';
import { useCallbackStable } from '../useCallbackStable';
import { useHass } from '../HAContext';
import { useGeocode } from './useGeocode';
import { useCalendar, formatTimeRange, type EnrichedEvent } from './CalendarContext';
import './EventModal.styles'; // registers styles

// ============================================================================
// Types
// ============================================================================

interface EventModalProps {
  event: EnrichedEvent;
  onClose: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format a date for display in the modal
 */
function formatEventDate(event: EnrichedEvent): string {
  const start = new Date(event.start);
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  };
  
  if (event.isAllDay) {
    return start.toLocaleDateString(undefined, dateOptions);
  }
  
  const timeRange = formatTimeRange(event.start, event.end);
  return `${start.toLocaleDateString(undefined, dateOptions)} · ${timeRange}`;
}

/**
 * Build OSM embed URL with markers for event location and home
 */
function buildMapUrl(
  eventLat: number,
  eventLng: number,
  homeLat?: number,
  homeLng?: number
): string {
  // Calculate bounding box to show both markers (or just event if no home)
  let minLat = eventLat;
  let maxLat = eventLat;
  let minLng = eventLng;
  let maxLng = eventLng;
  
  if (homeLat !== undefined && homeLng !== undefined) {
    minLat = Math.min(eventLat, homeLat);
    maxLat = Math.max(eventLat, homeLat);
    minLng = Math.min(eventLng, homeLng);
    maxLng = Math.max(eventLng, homeLng);
  }
  
  // Add padding to bounding box (about 20%)
  const latPadding = Math.max((maxLat - minLat) * 0.3, 0.005);
  const lngPadding = Math.max((maxLng - minLng) * 0.3, 0.005);
  
  const bbox = [
    minLng - lngPadding,
    minLat - latPadding,
    maxLng + lngPadding,
    maxLat + latPadding,
  ].join(',');
  
  // OSM embed URL with event marker
  // Note: OSM embed only supports one marker, so we show the event location
  // Using 'hot' layer for simpler, cleaner design
  const url = new URL('https://www.openstreetmap.org/export/embed.html');
  url.searchParams.set('bbox', bbox);
  url.searchParams.set('layer', 'hot');
  url.searchParams.set('marker', `${eventLat},${eventLng}`);
  
  return url.toString();
}

// ============================================================================
// Component
// ============================================================================

export function EventModal({ event, onClose }: EventModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { getHass } = useHass();
  const { config } = useCalendar();
  
  // Get home location from HA config
  const hass = getHass();
  const homeLat = hass?.config?.latitude;
  const homeLng = hass?.config?.longitude;
  
  // Geocode the event location
  const { lat, lng, loading, notFound, refetch } = useGeocode(event.location);
  
  // Get calendar names for this event
  const calendarNames = event.calendarIds.map(id => {
    const cal = config.calendars.find(c => c.entityId === id);
    // Use configured name, or extract from entity ID (e.g., "calendar.family" -> "Family")
    return cal?.name ?? id.replace('calendar.', '').replace(/_/g, ' ');
  });
  
  // Open dialog on mount
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);
  
  // Handle backdrop click to close
  const handleClick = useCallbackStable((e: MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  });
  
  // Handle dialog close event (from Escape key)
  const handleClose = useCallbackStable(() => {
    onClose();
  });
  
  // Handle close button click
  const handleCloseClick = useCallbackStable(() => {
    dialogRef.current?.close();
  });
  
  // Handle re-geocode click
  const handleReGeocode = useCallbackStable(() => {
    refetch();
  });
  
  const hasLocation = Boolean(event.location);
  const hasCoords = lat !== null && lng !== null;
  const mapUrl = hasCoords ? buildMapUrl(lat, lng, homeLat, homeLng) : null;
  
  return (
    <dialog
      ref={dialogRef}
      class="event-modal"
      onClick={handleClick}
      onClose={handleClose}
    >
      <div class="event-modal-content">
        {/* Header */}
        <div class="event-modal-header">
          <h2 class="event-modal-title">{event.summary}</h2>
          <button
            class="event-modal-close"
            onClick={handleCloseClick}
            aria-label="Close"
          >
            <ha-icon icon="mdi:close" />
          </button>
        </div>
        
        {/* Body - two column layout */}
        <div class="event-modal-body">
          {/* Left column: event details */}
          <div class="event-modal-details">
            {/* Calendar names */}
            {calendarNames.length > 0 && (
              <div class="event-modal-calendars">
                <ha-icon icon="mdi:calendar" />
                <span>{calendarNames.join(', ')}</span>
              </div>
            )}
            
            {/* Date/Time */}
            <div class="event-modal-time">
              <ha-icon icon="mdi:clock-outline" />
              <span>{formatEventDate(event)}</span>
            </div>
            
            {/* Location text */}
            {hasLocation && (
              <div class="event-modal-location-text">
                <ha-icon icon="mdi:map-marker" />
                <span class="event-modal-location-address">
                  {event.location}
                </span>
              </div>
            )}
            
            {/* Description */}
            {event.description && (
              <div class="event-modal-description">
                {event.description}
              </div>
            )}
          </div>
          
          {/* Right column: map */}
          {hasLocation && (
            <div class="event-modal-map-column">
              {/* Re-geocode button */}
              <button
                class="event-modal-regeocode"
                onClick={handleReGeocode}
                aria-label="Refresh location"
                title="Refresh location"
              >
                <ha-icon icon="mdi:refresh" />
              </button>
              
              {/* Map states */}
              {loading && (
                <div class="event-modal-map-container">
                  <div class="event-modal-map-loading">
                    Finding location...
                  </div>
                </div>
              )}
              
              {!loading && notFound && (
                <div class="event-modal-map-not-found">
                  Could not find on map
                </div>
              )}
              
              {!loading && hasCoords && mapUrl && (
                <>
                  <div class="event-modal-map-container">
                    <iframe
                      class="event-modal-map"
                      src={mapUrl}
                      title="Event location map"
                    />
                  </div>
                  <div class="event-modal-attribution">
                    © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
