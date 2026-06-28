export interface Listing {
  id: string;
  title: string;
  property_name: string;
  bedrooms: string;
  price_monthly: number;
  price_yearly: number;
  price_daily: number;
  size_sqft: number;
  furnishing: string;
  url: string;
}

export interface SummaryStats {
  count: number;
  average: number;
  median: number;
  mode: number;
  fairPrice: number;
  avgSize: number;
}

export interface SegmentSummary {
  segment: string;
  count: number;
  average: number;
  median: number;
  mode: number;
  fairPrice: number;
  avgSize: number;
}

export interface CollectionResult {
  area_name: string;
  source_url: string;
  collected_at: string;
  overall_summary: SummaryStats;
  segment_summary: SegmentSummary[];
  listings: Listing[];
}
