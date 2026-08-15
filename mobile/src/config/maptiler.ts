export const MAPTILER_API_KEY = 'bpSZcLTiwDllGaecH4T9';

export const MAPTILER_TILES = {
  streets: `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
  dark: `https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
  hybrid: `https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=${MAPTILER_API_KEY}`,
  outdoor: `https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
  basic: `https://api.maptiler.com/maps/basic-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
  osmFallback: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};
