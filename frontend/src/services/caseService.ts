import { apiClient } from './apiClient';
import type { CaseAnalysis } from '../types';

export interface UploadCaseResponse {
  id: string;
  filename: string;
  page_count: number;
  char_count: number;
  pages_preview: Array<{ page: number; text: string; char_count: number; is_empty: boolean }>;
  status: string;
}

export const caseService = {
  uploadCase: async (file: File): Promise<UploadCaseResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<UploadCaseResponse>('/cases/upload', formData);
  },

  analyzeCase: async (caseId: string): Promise<CaseAnalysis> => {
    return apiClient.post<CaseAnalysis>(`/cases/${caseId}/analyze`);
  },

  getCase: async (caseId: string) => {
    return apiClient.get<{
      id: string;
      filename: string;
      file_type: string;
      page_count: number;
      extracted_text_by_pages: Array<{ page: number; text: string }>;
      analysis?: CaseAnalysis;
    }>(`/cases/${caseId}`);
  },

  updateAnalysis: async (caseId: string, analysis: CaseAnalysis) => {
    return apiClient.put<{ message: string; analysis: CaseAnalysis }>(`/cases/${caseId}/analysis`, analysis);
  }
};
