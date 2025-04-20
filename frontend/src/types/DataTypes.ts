export interface RowData {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  company?: string;
  title?: string;
  website?: string;
  notes?: string;
  [key: string]: any;
} 