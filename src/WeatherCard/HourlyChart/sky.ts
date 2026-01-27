// ============================================================================
// Sky Rendering for Hourly Chart
// Draws sky background with vertical fade, stars (night), and clouds (day)
// ============================================================================

import type { WeatherForecast, SunTimes } from '../WeatherContext';
import type { Bounds } from './voronoiRelaxation';
import { generateRelaxedPoints } from './voronoiRelaxation';

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  dayClear: '#5FB3F6',      // Bright sky blue
  dayCloudy: '#8A97A8',     // Cool grey
  nightClear: '#2D1B4E',    // Deep violet
  nightCloudy: '#1A1F2E',   // Dark charcoal
};

// Vertical fade parameters (percentage from bottom of canvas)
const FADE = {
  transparentEnd: 0.50,   // 0-50% from bottom: transparent
  opaqueStart: 0.85,      // 85-100% from bottom: fully opaque
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine if a given datetime is during daytime based on sunrise/sunset
 * Only compares time-of-day (hours/minutes/seconds), not the full date
 */
function isDaytime(datetime: string, sunTimes: SunTimes): boolean {
  const date = new Date(datetime);
  
  // Default to daytime if sun times not available
  if (!sunTimes.sunrise || !sunTimes.sunset) {
    const hour = date.getHours();
    return hour >= 6 && hour < 18;
  }
  
  // Extract time-of-day components (hours, minutes, seconds, milliseconds)
  const timeOfDay = date.getHours() * 3600000 + date.getMinutes() * 60000 + date.getSeconds() * 1000 + date.getMilliseconds();
  const sunriseTime = sunTimes.sunrise.getHours() * 3600000 + sunTimes.sunrise.getMinutes() * 60000 + sunTimes.sunrise.getSeconds() * 1000 + sunTimes.sunrise.getMilliseconds();
  const sunsetTime = sunTimes.sunset.getHours() * 3600000 + sunTimes.sunset.getMinutes() * 60000 + sunTimes.sunset.getSeconds() * 1000 + sunTimes.sunset.getMilliseconds();
  
  return timeOfDay >= sunriseTime && timeOfDay < sunsetTime;
}

/**
 * Interpolate between two hex colors based on a factor (0 to 1)
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  
  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Get the color for a specific hour based on cloud coverage and day/night
 */
function getHourColor(
  datetime: string,
  cloudCoverage: number | undefined,
  sunTimes: SunTimes
): string {
  const isDay = isDaytime(datetime, sunTimes);
  const coverage = (cloudCoverage ?? 50) / 100; // Convert to 0-1 range
  
  if (isDay) {
    // Interpolate between clear blue and cloudy grey
    return interpolateColor(COLORS.dayClear, COLORS.dayCloudy, coverage);
  } else {
    // Interpolate between clear violet and cloudy dark charcoal
    return interpolateColor(COLORS.nightClear, COLORS.nightCloudy, coverage);
  }
}

/**
 * Draw an emoji at a specific point
 */
function drawEmoji(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  ctx.fillStyle = 'white';
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
  ctx.restore();
}

// ============================================================================
// Main Drawing Functions
// ============================================================================

/**
 * Draw the sky background with horizontal color gradient and vertical transparency mask
 * Preserves sunrise/sunset positioning while fading to transparent at the bottom
 */
export function drawSkyBackground(
  canvas: HTMLCanvasElement,
  forecast: WeatherForecast[],
  sunTimes: SunTimes
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || !forecast || forecast.length === 0) return;
  
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Save context for masking operation
  ctx.save();
  
  // Create horizontal linear gradient (same as before - preserves sunrise/sunset)
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  
  // Get timeframe boundaries
  const firstTime = new Date(forecast[0].datetime).getTime();
  const lastTime = new Date(forecast[forecast.length - 1].datetime).getTime();
  const timeRange = lastTime - firstTime;
  
  // Helper to convert timestamp to gradient position (0-1)
  const getGradientPosition = (timestamp: number): number => {
    if (timeRange === 0) return 0;
    return (timestamp - firstTime) / timeRange;
  };
  
  // Collect all color stops
  interface ColorStop {
    position: number;
    color: string;
    isSunEvent?: boolean;
    isAfterSun?: boolean;
  }
  
  const colorStops: ColorStop[] = [];
  
  // Add color stops for each hour
  forecast.forEach((hour, index) => {
    const position = index / (forecast.length - 1);
    const color = getHourColor(hour.datetime, hour.cloud_coverage, sunTimes);
    colorStops.push({ position, color });
  });
  
  // Add sunrise transition if within range
  if (sunTimes.sunrise) {
    let sunriseTime = sunTimes.sunrise.getTime();
    
    // If sunrise is in the past (before forecast start), add 24 hours to get tomorrow's sunrise
    if (sunriseTime < firstTime) {
      sunriseTime += 24 * 60 * 60 * 1000; // Add 24 hours in milliseconds
    }
    
    if (sunriseTime >= firstTime && sunriseTime <= lastTime) {
      const sunrisePos = getGradientPosition(sunriseTime);
      const offset = 0.001; // Small offset for sharp transition
      
      // Get average cloud coverage around sunrise for smooth cloud transition
      const avgCloudCoverage = forecast.reduce((sum, h) => sum + (h.cloud_coverage ?? 50), 0) / forecast.length;
      
      // Just before sunrise: night color
      const nightColor = interpolateColor(COLORS.nightClear, COLORS.nightCloudy, avgCloudCoverage / 100);
      colorStops.push({ position: Math.max(0, sunrisePos - offset), color: nightColor, isSunEvent: true });
      
      // Just after sunrise: day color
      const dayColor = interpolateColor(COLORS.dayClear, COLORS.dayCloudy, avgCloudCoverage / 100);
      colorStops.push({ position: Math.min(1, sunrisePos + offset), color: dayColor, isSunEvent: true, isAfterSun: true });
    }
  }

  // Add sunset transition if within range
  if (sunTimes.sunset) {
    let sunsetTime = sunTimes.sunset.getTime();
    
    // If sunset is in the past (before forecast start), add 24 hours to get tomorrow's sunset
    if (sunsetTime < firstTime) {
      sunsetTime += 24 * 60 * 60 * 1000; // Add 24 hours in milliseconds
    }
    
    if (sunsetTime >= firstTime && sunsetTime <= lastTime) {
      const sunsetPos = getGradientPosition(sunsetTime);
      const offset = 0.001; // Small offset for sharp transition
      
      // Get average cloud coverage around sunset for smooth cloud transition
      const avgCloudCoverage = forecast.reduce((sum, h) => sum + (h.cloud_coverage ?? 50), 0) / forecast.length;
      
      // Just before sunset: day color
      const dayColor = interpolateColor(COLORS.dayClear, COLORS.dayCloudy, avgCloudCoverage / 100);
      colorStops.push({ position: Math.max(0, sunsetPos - offset), color: dayColor, isSunEvent: true });
      
      // Just after sunset: night color
      const nightColor = interpolateColor(COLORS.nightClear, COLORS.nightCloudy, avgCloudCoverage / 100);
      colorStops.push({ position: Math.min(1, sunsetPos + offset), color: nightColor, isSunEvent: true, isAfterSun: true });
    }
  }
  
  // Sort color stops by position
  colorStops.sort((a, b) => a.position - b.position);
  
  // Add all color stops to gradient
  colorStops.forEach(stop => {
    gradient.addColorStop(stop.position, stop.color);
  });
  
  // Fill the entire canvas with the horizontal gradient
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Apply vertical transparency mask using destination-in composite operation
  // This makes the gradient fade from opaque at top to transparent at bottom
  ctx.globalCompositeOperation = 'destination-in';
  
  // Create vertical gradient for the alpha mask
  // Note: gradient goes from top (y=0) to bottom (y=height)
  // We want: top = opaque, bottom = transparent
  // So we work from top: 0-15% opaque, 15-50% fade, 50-100% transparent
  const alphaMask = ctx.createLinearGradient(0, 0, 0, height);
  
  // Convert FADE values (from bottom) to gradient stops (from top)
  // FADE.opaqueStart = 0.85 from bottom means 0.15 from top (fully opaque starts here)
  // FADE.transparentEnd = 0.50 from bottom means 0.50 from top (fully transparent by here)
  const opaqueFromTop = 1 - FADE.opaqueStart;  // 0.15
  const transparentFromTop = 1 - FADE.transparentEnd;  // 0.50
  
  alphaMask.addColorStop(0, 'rgba(0,0,0,1)');  // Top: fully opaque
  alphaMask.addColorStop(opaqueFromTop, 'rgba(0,0,0,1)');  // 15% from top: still opaque
  alphaMask.addColorStop(transparentFromTop, 'rgba(0,0,0,0)');  // 50% from top: fully transparent
  alphaMask.addColorStop(1, 'rgba(0,0,0,0)');  // Bottom: transparent
  
  ctx.fillStyle = alphaMask;
  ctx.fillRect(0, 0, width, height);
  
  // Restore context to normal composite operation
  ctx.restore();
}

/**
 * Draw stars for nighttime hours
 * Stars are small white dots distributed using voronoi relaxation
 */
export function drawStars(
  canvas: HTMLCanvasElement,
  forecast: WeatherForecast[],
  sunTimes: SunTimes
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || !forecast || forecast.length === 0) return;
  
  const width = canvas.width;
  const height = canvas.height;
  const segmentWidth = width / forecast.length;
  
  // Only draw stars in the top 25% of the canvas
  const visibleHeight = height * 0.25;
  
  // Process each hour independently
  forecast.forEach((hour, index) => {
    // Only draw stars at night
    if (isDaytime(hour.datetime, sunTimes)) return;
    
    // More stars when sky is clearer (less cloud coverage)
    const cloudCoverage = hour.cloud_coverage ?? 50;
    const clearness = 1 - (cloudCoverage / 100);
    
    // Calculate segment bounds (only in visible portion)
    const segmentBounds: Bounds = {
      x: index * segmentWidth,
      y: 0,
      width: segmentWidth,
      height: visibleHeight,
    };
    
    // Base star count scales with clearness and segment size
    const segmentArea = segmentWidth * visibleHeight;
    const baseStarDensity = 0.002; // stars per square pixel
    const starCount = Math.max(1, Math.round(segmentArea * baseStarDensity * clearness));
    
    if (starCount === 0) return;
    
    // Generate evenly-distributed points using voronoi relaxation
    const iterations = Math.min(3, Math.max(1, Math.ceil(starCount / 5)));
    const points = generateRelaxedPoints(starCount, segmentBounds, iterations);
    
    // Draw stars as white dots of varying sizes
    ctx.save();
    ctx.fillStyle = 'white';
    
    points.forEach(point => {
      // Random size between 1-3px radius
      const radius = 0.5 + Math.random() * 1.5;
      
      // Random brightness/opacity
      const opacity = 0.4 + Math.random() * 0.6;
      ctx.globalAlpha = opacity;
      
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
  });
}

/**
 * Draw clouds for daytime hours using cloud emoji
 * Clouds are placed using voronoi relaxation based on cloud coverage
 */
export function drawClouds(
  canvas: HTMLCanvasElement,
  forecast: WeatherForecast[],
  sunTimes: SunTimes
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || !forecast || forecast.length === 0) return;
  
  const width = canvas.width;
  const height = canvas.height;
  const segmentWidth = width / forecast.length;
  
  // Only draw clouds in the top 25% of the canvas
  const visibleHeight = height * 0.25;
  
  // Process each hour independently
  forecast.forEach((hour, index) => {
    // Only draw clouds during daytime
    if (!isDaytime(hour.datetime, sunTimes)) return;
    
    const cloudCoverage = hour.cloud_coverage ?? 0;
    
    // Skip if no cloud coverage
    if (cloudCoverage <= 5) return;
    
    // Calculate segment bounds (only in visible portion)
    const segmentBounds: Bounds = {
      x: index * segmentWidth,
      y: 0,
      width: segmentWidth,
      height: visibleHeight,
    };
    
    // Cloud count scales with coverage (0% = 0 clouds, 100% = many clouds)
    const segmentArea = segmentWidth * visibleHeight;
    const cloudDensity = 0.008; // clouds per square pixel at 100% coverage
    const cloudCount = Math.max(0, Math.round(segmentArea * cloudDensity * (cloudCoverage / 100)));
	console.log({hour, cloudCount, cloudCoverage});
    
    if (cloudCount === 0) return;
    
    // Generate evenly-distributed points using voronoi relaxation
    const iterations = Math.min(3, Math.max(1, Math.ceil(cloudCount / 3)));
    const points = generateRelaxedPoints(cloudCount, segmentBounds, iterations);
    
    // Draw cloud emoji at each point
    points.forEach(point => {
      // Vary cloud size slightly
      const size = 10 + Math.random() * 4;
      drawEmoji(ctx, '☁️', point.x, point.y, size);
    });
  });
}
