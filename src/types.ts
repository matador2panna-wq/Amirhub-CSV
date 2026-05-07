export type Marketplace = 'shutterstock';

export interface ImageMetadata {
  id: string;
  filename: string;
  preview: string;
  title: string;
  description: string;
  keywords: string[];
  category1: string;
  category2: string;
  marketplace?: Marketplace;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  startTime?: number;
  error?: string;
  originalFile?: File;
  retries?: number;
}

export interface ShutterstockCSVRow {
  Filename: string;
  Description: string;
  Keywords: string;
  "Category 1": string;
  "Category 2": string;
  Categories: string; // Combined official Shutterstock column
  Editorial: "No" | "Yes";
  "Mature Content": "No" | "Yes";
  Illustration: "No" | "Yes";
}
