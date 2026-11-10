import { apiClient } from './apiClient';
import type {
  LegalRole,
  ProceduralStage,
  SimulationStatus,
  Participant,
  Fact,
  Evidence,
  Intervention,
  AcademicEvaluation,
  TrialProgressInfo
} from '../types';

export interface StartSimulationResponse {
  session_id: string;
  case_title: string;
  process_type: string;
  user_role: LegalRole;
  current_stage: ProceduralStage;
  participants: Participant[];
  initial_intervention: Intervention;
  progress_info?: TrialProgressInfo;
}

export interface SimulationStateResponse {
  session_id: string;
  case_title: string;
  user_role: LegalRole;
  current_stage: ProceduralStage;
  status: SimulationStatus;
  participants: Participant[];
  facts: Fact[];
  evidences: Evidence[];
  interventions: Intervention[];
  current_options: Intervention['options'];
  progress_info?: TrialProgressInfo;
}

export interface DecisionResponse {
  current_stage: ProceduralStage;
  progress_info?: TrialProgressInfo;
  user_intervention: {
    id: string;
    text: string;
    speaker_gender?: 'male' | 'female';
  };
  next_intervention: Intervention;
  interventions_sequence?: Intervention[];
  is_concluded?: boolean;
  evaluation?: AcademicEvaluation;
}

export const simulationService = {
  startSimulation: async (caseId: string, userRole: LegalRole): Promise<StartSimulationResponse> => {
    return apiClient.post<StartSimulationResponse>('/simulations/start', {
      case_id: caseId,
      user_role: userRole
    });
  },

  getSimulationState: async (sessionId: string): Promise<SimulationStateResponse> => {
    return apiClient.get<SimulationStateResponse>(`/simulations/${sessionId}`);
  },

  submitDecision: async (sessionId: string, data: { selected_option_id?: string; free_text_response?: string }): Promise<DecisionResponse> => {
    return apiClient.post<DecisionResponse>(`/simulations/${sessionId}/decision`, data);
  },

  submitObjection: async (sessionId: string, grounds: string, details?: string) => {
    return apiClient.post<{
      user_intervention: { id: string; text: string };
      ruling_intervention: Intervention;
    }>(`/simulations/${sessionId}/objection`, { grounds, details });
  },

  evaluateSimulation: async (sessionId: string): Promise<AcademicEvaluation> => {
    return apiClient.post<AcademicEvaluation>(`/simulations/${sessionId}/evaluate`);
  },

  getSpeechAudioBlobUrl: async (
    text: string,
    options?: { voice?: string; gender?: string; speed?: number }
  ): Promise<string> => {
    const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const baseUrl = (rawBaseUrl && !rawBaseUrl.includes(':8000') ? rawBaseUrl : 'http://localhost:8001').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/simulations/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: options?.voice,
        gender: options?.gender || 'male',
        speed: options?.speed ?? 1.0,
      }),
    });
    if (!res.ok) {
      throw new Error(`Error en síntesis OpenAI (${res.status})`);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
};
