export interface ProcessedData {
  dataTable: string;
  notifications: string[];
}

export interface JobData {
  time: string;
  address: string;
  productCode: string;
  productType: string;
  productBrand: string;
  fault: string;
  errorCode: string;
  productionYear: string;
  serialNumber: string;
}

export interface WorksheetData {
  id: string;
  date: string;
  dateLabel: string;
  timeSlots: { start: string; end: string }[];
  jobs: JobData[];
  comments: { [key: number]: string };
  createdAt?: string;
}

export interface SavedMessages {
  id: string;
  date: string;
  dateLabel: string;
  messages: string[];
  createdAt: string;
}

export interface SavedWorksheet {
  id: string;
  date: string;
  dateLabel: string;
  jobCount: number;
  createdAt: string;
}
