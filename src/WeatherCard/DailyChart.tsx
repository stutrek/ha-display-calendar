// ============================================================================
// Daily Weather Chart
// A visual representation of daily weather forecast with rich visual elements
// ============================================================================

import type { JSX } from 'preact';
import type { WeatherForecast, SunTimes } from './WeatherContext';
import {
  getTemperatureColor,
  getPrecipitationAmount,
  getPrecipitationProbability,
  getPrecipitationType,
  getPrecipitationSize,
  getPrecipitationOpacity,
} from './weatherUtils';
import { Raindrop, Snowflake } from './WeatherSvgElements';

// ============================================================================
// Types
// ============================================================================

interface DailyChartProps {
  forecast: WeatherForecast[];
  sunTimes: SunTimes;
  latitude: number | undefined;
  maxItems?: number;
}

// ============================================================================
// Constants
// ============================================================================

// Condition icons
const CONDITION_ICONS: Record<string, string> = {
  sunny: '☀️',
  'clear-night': '🌙',
  cloudy: '☁️',
  partlycloudy: '⛅',
  rainy: '🌧️',
  pouring: '🌧️',
  snowy: '❄️',
  'snowy-rainy': '🌨️',
  fog: '🌫️',
  lightning: '⚡',
  'lightning-rainy': '⛈️',
  windy: '💨',
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatDay(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tmrw';
  }
  
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
}

function getConditionIcon(condition: string | undefined): string {
  if (!condition) return '☁️';
  return CONDITION_ICONS[condition] ?? '☁️';
}

// ============================================================================
// Precipitation Component
// ============================================================================

interface DailyPrecipitationProps {
  item: WeatherForecast;
  x: number;
  y: number;
  width: number;
  height: number;
}

function DailyPrecipitation({ item, x, y, width, height }: DailyPrecipitationProps) {
  const precipType = getPrecipitationType(item.condition);
  const precipAmount = getPrecipitationAmount(item.precipitation);
  const precipProb = getPrecipitationProbability(item.precipitation_probability);
  
  if (!precipType || precipAmount === 0) return null;
  
  const size = Math.min(getPrecipitationSize(precipAmount) * 0.7, 5);
  const opacity = getPrecipitationOpacity(precipProb);
  const numDrops = Math.min(Math.ceil(precipAmount * 2), 5);
  
  const elements: JSX.Element[] = [];
  
  for (let i = 0; i < numDrops; i++) {
    const dropX = x + width * (0.2 + (i * 0.6) / numDrops);
    const dropY = y + height * (0.3 + (i % 3) * 0.2);
    
    if (precipType === 'snow') {
      elements.push(
        <Snowflake key={`snow-${i}`} x={dropX} y={dropY} size={size} opacity={opacity} />
      );
    } else if (precipType === 'rain') {
      elements.push(
        <Raindrop key={`rain-${i}`} x={dropX} y={dropY} size={size} opacity={opacity} />
      );
    } else {
      // Mixed
      if (i % 2 === 0) {
        elements.push(
          <Raindrop key={`rain-${i}`} x={dropX} y={dropY} size={size} opacity={opacity} />
        );
      } else {
        elements.push(
          <Snowflake key={`snow-${i}`} x={dropX} y={dropY} size={size} opacity={opacity} />
        );
      }
    }
  }
  
  return <g>{elements}</g>;
}

// ============================================================================
// Day Column Component
// ============================================================================

interface DayColumnProps {
  item: WeatherForecast;
  x: number;
  width: number;
  minTemp: number;
  maxTemp: number;
  viewHeight: number;
}

function DayColumn({
  item,
  x,
  width,
  minTemp,
  maxTemp,
  viewHeight,
}: DayColumnProps) {
  const centerX = x + width / 2;
  const high = item.temperature ?? 50;
  const low = item.templow ?? high - 10;
  
  // Get temperature colors
  const highColor = getTemperatureColor(high);
  const lowColor = getTemperatureColor(low);
  
  // Layout zones
  const padding = 3;
  const headerHeight = 30;      // Day label + condition icon
  const precipLayerHeight = 18; // Precipitation elements above bar
  const tempLabelHeight = 20;   // Space for labels
  
  // Calculate positions
  const contentTop = headerHeight;
  const contentHeight = viewHeight - headerHeight - tempLabelHeight - padding * 2;
  
  // Temperature bar area (below precip layer)
  const tempBarTop = contentTop + precipLayerHeight;
  const tempBarHeight = contentHeight - precipLayerHeight - 5;
  const tempRange = maxTemp - minTemp || 1;
  
  // Calculate bar positions (inverted because SVG y increases downward)
  const highY = tempBarTop + ((maxTemp - high) / tempRange) * tempBarHeight;
  const lowY = tempBarTop + ((maxTemp - low) / tempRange) * tempBarHeight;
  const barHeight = lowY - highY;
  
  // ClipPath ID for temperature bar
  const clipId = `temp-clip-${x}`;
  
  // CSS gradient for temperature (vertical: high at top, low at bottom)
  const tempGradientStyle = {
    background: `linear-gradient(to bottom, ${highColor}, ${lowColor})`,
    width: `${width - padding * 2}px`,
    height: `${Math.max(barHeight, 4)}px`,
    borderRadius: '4px',
  };
  
  return (
    <g>
      {/* Day label */}
      <text
        x={centerX}
        y={14}
        textAnchor="middle"
        fill="var(--secondary-text-color, #aaa)"
        fontSize="0.4em"
        fontFamily="system-ui, sans-serif"
      >
        {formatDay(item.datetime)}
      </text>
      
      {/* Condition icon */}
      <text
        x={centerX}
        y={27}
        textAnchor="middle"
        fontSize="0.65em"
      >
        {getConditionIcon(item.condition)}
      </text>
      
      {/* Precipitation - above the temperature bar */}
      <DailyPrecipitation
        item={item}
        x={x + padding}
        y={contentTop}
        width={width - padding * 2}
        height={precipLayerHeight}
      />
      
      {/* Temperature bar clip path */}
      <defs>
        <clipPath id={clipId}>
          <rect
            x={x + padding}
            y={highY}
            width={width - padding * 2}
            height={Math.max(barHeight, 4)}
            rx={4}
          />
        </clipPath>
      </defs>
      
      {/* Temperature bar - CSS gradient with clipPath */}
      <g clip-path={`url(#${clipId})`}>
        <foreignObject
          x={x + padding}
          y={highY}
          width={width - padding * 2}
          height={Math.max(barHeight, 4)}
        >
          <div style={tempGradientStyle} />
        </foreignObject>
      </g>
      
      {/* High temp label - at the top of the bar */}
      <text
        x={centerX}
        y={highY - 4}
        textAnchor="middle"
        fill="var(--primary-text-color, #fff)"
        fontSize="0.4em"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        {Math.round(high)}°
      </text>
      
      {/* Low temp label - at the bottom of the bar */}
      <text
        x={centerX}
        y={lowY + 12}
        textAnchor="middle"
        fill="var(--secondary-text-color, #aaa)"
        fontSize="0.35em"
        fontFamily="system-ui, sans-serif"
      >
        {Math.round(low)}°
      </text>
    </g>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DailyChart({ forecast, sunTimes: _sunTimes, latitude: _latitude, maxItems = 7 }: DailyChartProps) {
  const items = forecast.slice(0, maxItems);
  
  if (items.length === 0) {
    return null;
  }
  
  // Chart dimensions
  const viewWidth = 400;
  const viewHeight = 160;
  const padding = { left: 5, right: 5 };
  
  const contentWidth = viewWidth - padding.left - padding.right;
  
  // Calculate column width
  const columnWidth = contentWidth / items.length;
  
  // Calculate min/max temps across all days for consistent bar scaling
  const allTemps: number[] = [];
  items.forEach(item => {
    if (item.temperature !== undefined) allTemps.push(item.temperature);
    if (item.templow !== undefined) allTemps.push(item.templow);
  });
  
  const minTemp = Math.min(...allTemps) - 5;
  const maxTemp = Math.max(...allTemps) + 5;
  
  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      class="daily-chart"
      style={{ width: '100%', height: 'auto', minHeight: '120px' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Base background - neutral card color */}
      <rect
        x={0}
        y={0}
        width={viewWidth}
        height={viewHeight}
        fill="var(--ha-card-background, var(--card-background-color, #1c1c1c))"
        rx={8}
      />
      
      {/* Day columns */}
      <g transform={`translate(${padding.left}, 0)`}>
        {items.map((item, i) => (
          <DayColumn
            key={i}
            item={item}
            x={i * columnWidth}
            width={columnWidth}
            minTemp={minTemp}
            maxTemp={maxTemp}
            viewHeight={viewHeight}
          />
        ))}
      </g>
    </svg>
  );
}
