export type Step = 'upload' | 'analysis' | 'role_select' | 'courtroom' | 'evaluation' | 'settings';

export type LegalRole =
  | 'juez'
  | 'fiscal'
  | 'demandante'
  | 'abogado_demandante'
  | 'demandado'
  | 'abogado_demandado'
  | 'testigo'
  | 'perito';

export type ProceduralStage =
  | 'introduccion_juez'
  | 'argumento'
  | 'contraargumento'
  | 'replica'
  | 'refutacion'
  | 'veredicto_final'
  | 'concluido';

export type SimulationStatus =
  | 'expediente_cargado'
  | 'analizado'
  | 'escenario_listo'
  | 'en_curso'
  | 'concluido';

export interface SourceReference {
  page_number: number;
  fragment_text?: string;
}

export interface Fact {
  id: string;
  description: string;
  source_references: SourceReference[];
  is_immutable: boolean;
  is_contested: boolean;
}

export interface Evidence {
  id: string;
  name: string;
  description: string;
  evidence_type: 'documental' | 'testimonial' | 'pericial' | 'material';
  source_references: SourceReference[];
  is_admitted: boolean;
}

export interface Participant {
  id: string;
  name: string;
  role: LegalRole;
  description: string;
  is_fictional: boolean;
  model_3d_key: string;
  gender?: 'male' | 'female';
}

export interface CaseAnalysis {
  case_title: string;
  case_number?: string;
  process_type: string;
  jurisdiction?: string;
  summary: string;
  legal_provisions: string[];
  facts: Fact[];
  evidences: Evidence[];
  identified_participants: Participant[];
}

export interface DecisionOption {
  id: string;
  text: string;
  legal_tactic?: string;
  risk_level: 'bajo' | 'medio' | 'alto';
}

export interface TrialProgressInfo {
  estimated_total_minutes: number;
  estimated_remaining_minutes: number;
  total_stages: number;
  current_stage_number: number;
  current_stage_label: string;
  current_turn_number: number;
  total_estimated_turns: number;
  progress_percent: number;
}

export interface Intervention {
  id: string;
  speaker_role: LegalRole;
  speaker_name: string;
  stage: ProceduralStage;
  text: string;
  is_user: boolean;
  model_3d_key: string;
  speaker_gender?: 'male' | 'female';
  options: DecisionOption[];
  created_at?: string;
}

export interface VoiceSettings {
  engine: 'openai' | 'browser';
  maleVoice: string;
  femaleVoice: string;
  browserVoiceURI?: string;
  speed: number;
  pitch: number;
  volume?: number;
  autoModulateRole: boolean;
}

export interface AcademicEvaluation {
  case_id: string;
  simulation_id: string;
  academic_disclaimer: string;
  verdict: string;
  ruling_summary: string;
  score_coherence: number;
  score_fidelity_to_facts: number;
  score_evidence_usage: number;
  final_feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
}

