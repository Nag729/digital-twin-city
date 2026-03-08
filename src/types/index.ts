export type AgentRole = 'warehouse_worker' | 'delivery_driver' | 'recipient' | 'sort_operator';
export type AgentState = 'idle' | 'moving' | 'working' | 'reporting' | 'communicating';
export type FeedbackType = 'bug' | 'ux_improvement' | 'performance';
export type BuildingType = 'warehouse' | 'sort_center' | 'delivery_hub' | 'receive_station';
export type BuildingStatus = 'normal' | 'has_bug' | 'upgrading' | 'upgraded';
export type PhaseNumber = 1 | 2 | 3 | 4 | 5;

export interface Position {
  x: number;
  y: number;
}

export interface Building {
  id: string;
  name: string;
  type: BuildingType;
  position: Position;
  level: number;
  status: BuildingStatus;
  feedbacks: Feedback[];
  hasRoof?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  position: Position;
  state: AgentState;
  targetBuildingId: string | null;
  previousBuildingId: string | null;
  communicatingWithAgentId: string | null;
  skills: string[];
  feedbacksFound: string[];
  progress: number;
  speed: number;
}

export interface Feedback {
  id: string;
  agentId: string;
  agentName: string;
  buildingId: string;
  type: FeedbackType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  resolved: boolean;
}

export interface AgentSkill {
  id: string;
  name: string;
  source: 'user_feedback' | 'usage_analytics' | 'domain_expert';
  description: string;
  confidence: number;
  injectedAtPhase: number;
}

export interface Vision {
  statement: string;
  priorities: string[];
  alignmentScore: number;
}

export interface PhaseMetrics {
  phase: PhaseNumber;
  qualityScore: number;
  deliverySuccessRate: number;
  totalFeedbacks: number;
  resolvedIssues: number;
  agentCount: number;
  skills: AgentSkill[];
}

export interface PhaseConfig {
  number: PhaseNumber;
  name: string;
  label: string;
  hints: string[];
}
