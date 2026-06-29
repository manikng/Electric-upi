export const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

// Uber jaisa clean dark map
export const mapStyle = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${maptilerKey}`;

// InteractiveMap: clean light theme for the EVMapClient
export const mapStyleLight = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${maptilerKey}`;

// Tere existing types ko yahan se export kar rahe hain taaki map components ko easily mil jaye
export type { ChargerResult, ChargingSiteResult } from "./types";