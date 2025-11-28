export interface ClassificationResult {
  label: string;
  accuracy: number;
  probabilities: { name: string; value: number }[];
  explanation: string;
}

export enum AppStep {
  UPLOAD_MODEL = 0,
  INPUT_AUDIO = 1,
  ANALYZING = 2,
  RESULTS = 3,
}

export interface AudioMetadata {
  name: string;
  duration: number;
  type: string;
}

export interface ModelMetadata {
  name: string;
  size: number;
  content: string; // The raw text content of the ipynb to pass as context
}