/**
 * Types for Overpass API responses
 *
 * These types define the structure of data returned by the Overpass API
 * for OpenStreetMap queries, used in track ingestion scripts.
 */

// Overpass API element types
export interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OverpassWay {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
  geometry?: OverpassGeometry[];
}

export interface OverpassRelation {
  type: "relation";
  id: number;
  members: OverpassRelationMember[];
  tags?: Record<string, string>;
}

export interface OverpassRelationMember {
  type: "node" | "way" | "relation";
  ref: number;
  role: string;
}

export interface OverpassGeometry {
  lat: number;
  lon: number;
}

// Union type for all Overpass elements
export type OverpassElement = OverpassNode | OverpassWay | OverpassRelation;

// Overpass API response structure
export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    timestamp_areas_base: string;
    copyright: string;
  };
  elements: OverpassElement[];
}
