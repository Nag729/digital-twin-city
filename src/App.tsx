import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import AgentDetailPanel from './components/AgentDetailPanel';
import CityCanvas from './components/CityCanvas';
import Header from './components/Header';
import HintBar from './components/HintBar';
import KnowledgeModal from './components/KnowledgeModal';
import StatusPanel from './components/StatusPanel';
import VisionModal from './components/VisionModal';
import {
  getMetricsForPhase,
  INITIAL_AGENTS,
  INITIAL_BUILDINGS,
  MOCK_FEEDBACKS,
  MOCK_SKILLS,
  MOCK_VISION,
  PHASES,
} from './data/mockData';
import type { Agent, AgentSkill, AgentState, Building, Feedback, PhaseNumber, Vision } from './types';
import { initializeAgentPosition, simulateAgent } from './utils/agentSimulation';

// ─── State ────────────────────────────────────────────────────────────
interface GameState {
  currentPhase: PhaseNumber;
  maxReachedPhase: PhaseNumber;
  buildings: Building[];
  agents: Agent[];
  feedbacks: Feedback[];
  skills: AgentSkill[];
  vision: Vision | null;
  phaseElapsed: number;
  selectedAgentId: string | null;
  qualityHistory: number[];
}

type GameAction =
  | { type: 'SET_PHASE'; phase: PhaseNumber }
  | { type: 'TICK'; dt: number }
  | { type: 'SELECT_AGENT'; agentId: string | null }
  | { type: 'UPDATE_AGENTS'; agents: Agent[] }
  | { type: 'ADD_FEEDBACK'; feedback: Feedback }
  | { type: 'INJECT_SKILL'; skill: AgentSkill }
  | { type: 'INJECT_VISION'; vision: Vision }
  | { type: 'UPGRADE_BUILDING'; buildingId: string }
  | { type: 'PUSH_QUALITY'; score: number };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PHASE': {
      const newMax = Math.max(state.maxReachedPhase, action.phase) as PhaseNumber;
      const newBuildings =
        action.phase >= 3
          ? state.buildings.map((b) => ({
              ...b,
              feedbacks: MOCK_FEEDBACKS.filter((f) => f.buildingId === b.id),
            }))
          : action.phase < 3
            ? state.buildings.map((b) => ({ ...b, feedbacks: [] }))
            : state.buildings;

      // Phase 4: upgrade some buildings
      const upgradedBuildings =
        action.phase >= 4
          ? newBuildings.map((b, i) => ({
              ...b,
              level: Math.min(5, b.level + (i % 3 === 0 ? 2 : 1)),
              status: (i % 3 === 0 ? 'upgraded' : 'normal') as Building['status'],
            }))
          : action.phase < 4
            ? newBuildings.map((b) => ({ ...b, level: 1, status: 'normal' as const }))
            : newBuildings;

      return {
        ...state,
        currentPhase: action.phase,
        maxReachedPhase: newMax,
        phaseElapsed: 0,
        buildings: upgradedBuildings,
        feedbacks: action.phase >= 3 ? MOCK_FEEDBACKS.slice(0, Math.min(6, MOCK_FEEDBACKS.length)) : [],
        skills: action.phase >= 3 ? MOCK_SKILLS : [],
        vision: action.phase >= 5 ? { ...MOCK_VISION, alignmentScore: 0.87 } : null,
        agents:
          action.phase >= 2
            ? state.agents.length > 0
              ? state.agents.map((a) => ({ ...a, skills: action.phase >= 3 ? MOCK_SKILLS.map((s) => s.id) : [] }))
              : INITIAL_AGENTS.map((a) => ({
                  ...a,
                  state: 'idle' as AgentState,
                  skills: action.phase >= 3 ? MOCK_SKILLS.map((s) => s.id) : [],
                }))
            : [],
        qualityHistory: action.phase >= 4 ? [12, 25, 38, 52, 65, getMetricsForPhase(action.phase).qualityScore] : [],
      };
    }
    case 'TICK':
      return { ...state, phaseElapsed: state.phaseElapsed + action.dt };
    case 'SELECT_AGENT':
      return { ...state, selectedAgentId: action.agentId };
    case 'UPDATE_AGENTS':
      return { ...state, agents: action.agents };
    case 'ADD_FEEDBACK':
      return {
        ...state,
        feedbacks: [...state.feedbacks, action.feedback],
        buildings: state.buildings.map((b) =>
          b.id === action.feedback.buildingId ? { ...b, feedbacks: [...b.feedbacks, action.feedback] } : b,
        ),
      };
    case 'INJECT_SKILL':
      return { ...state, skills: [...state.skills, action.skill] };
    case 'INJECT_VISION':
      return { ...state, vision: action.vision };
    case 'UPGRADE_BUILDING':
      return {
        ...state,
        buildings: state.buildings.map((b) =>
          b.id === action.buildingId ? { ...b, level: Math.min(5, b.level + 1), status: 'upgraded' as const } : b,
        ),
      };
    case 'PUSH_QUALITY':
      return { ...state, qualityHistory: [...state.qualityHistory, action.score] };
    default:
      return state;
  }
}

// ─── App Component ────────────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(gameReducer, {
    currentPhase: 1 as PhaseNumber,
    maxReachedPhase: 5 as PhaseNumber,
    buildings: INITIAL_BUILDINGS,
    agents: [],
    feedbacks: [],
    skills: [],
    vision: null,
    phaseElapsed: 0,
    selectedAgentId: null,
    qualityHistory: [],
  });

  const [phaseTransitioning, setPhaseTransitioning] = useState(false);
  const [visionModalOpen, setVisionModalOpen] = useState(false);
  const [knowledgeModalOpen, setKnowledgeModalOpen] = useState(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  // ─── Phase change handler ───────────────────────────────────────────
  const handlePhaseChange = useCallback((phase: PhaseNumber) => {
    setPhaseTransitioning(true);
    setTimeout(() => {
      dispatch({ type: 'SET_PHASE', phase });
      setTimeout(() => setPhaseTransitioning(false), 300);
    }, 200);
  }, []);

  // ─── Game loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const gameLoop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      dispatch({ type: 'TICK', dt });

      // Only simulate agents when phase >= 2
      if (state.currentPhase >= 2 && state.agents.length > 0) {
        const updatedAgents = state.agents.map((agent) => {
          const initialized = initializeAgentPosition(agent, state.buildings);
          if (initialized !== agent) return initialized;
          return simulateAgent(agent, state.buildings, state.agents, state.currentPhase, dt);
        });

        dispatch({ type: 'UPDATE_AGENTS', agents: updatedAgents });
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state.currentPhase, state.agents, state.buildings]);

  // ─── Derived data ───────────────────────────────────────────────────
  const currentPhaseConfig = PHASES.find((p) => p.number === state.currentPhase)!;
  const metrics = getMetricsForPhase(state.currentPhase);
  const selectedAgent = state.selectedAgentId ? state.agents.find((a) => a.id === state.selectedAgentId) || null : null;

  // ─── Handlers ───────────────────────────────────────────────────────
  const handleAgentClick = useCallback((agentId: string) => {
    dispatch({ type: 'SELECT_AGENT', agentId });
  }, []);

  const handleCloseDetail = useCallback(() => {
    dispatch({ type: 'SELECT_AGENT', agentId: null });
  }, []);

  const handleOpenVision = useCallback(() => {
    setVisionModalOpen(true);
  }, []);

  const handleCloseVision = useCallback(() => {
    setVisionModalOpen(false);
  }, []);

  const handleOpenKnowledge = useCallback(() => {
    setKnowledgeModalOpen(true);
  }, []);

  const handleCloseKnowledge = useCallback(() => {
    setKnowledgeModalOpen(false);
  }, []);

  const isPhase5 = state.currentPhase >= 5;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg-primary flex flex-col">
      {/* Phase transition flash — soft mint glow */}
      {phaseTransitioning && (
        <div
          className="fixed inset-0 z-[100] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(110,207,176,0.12) 0%, transparent 70%)',
            animation: 'fade-in 0.3s ease-out',
          }}
        />
      )}

      {/* Header with Phase Navigation */}
      <Header
        currentPhase={state.currentPhase}
        onPhaseChange={handlePhaseChange}
        maxReachedPhase={state.maxReachedPhase}
      />

      {/* Main content area — fills remaining space */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Map area */}
        <div className="flex-1 relative min-w-0">
          {/* Hint Bar — overlaid on map */}
          <HintBar currentPhase={state.currentPhase} hints={currentPhaseConfig.hints} />

          <CityCanvas
            buildings={state.buildings}
            agents={state.agents}
            currentPhase={state.currentPhase}
            vision={state.vision}
            elapsedTime={state.phaseElapsed}
            onAgentClick={handleAgentClick}
          />

          {/* Action buttons — bottom-left of map */}
          <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-3">
            {/* Vision button */}
            <button
              type="button"
              onClick={handleOpenVision}
              className="relative flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(8px)',
                border: isPhase5 ? '1.5px solid #C4B5FD' : '1.5px solid #E9D5FF',
                boxShadow: isPhase5
                  ? '0 2px 20px rgba(196, 181, 253, 0.3), 0 0 0 1px rgba(196, 181, 253, 0.1)'
                  : '0 2px 16px rgba(196, 181, 253, 0.15)',
              }}
            >
              <span className="text-lg">🧭</span>
              <span className="text-sm font-medium" style={{ color: '#7C3AED' }}>
                ヒューマンビジョン
              </span>
              {isPhase5 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                    style={{ backgroundColor: '#C4B5FD' }}
                  />
                  <span
                    className="relative inline-flex h-3 w-3 rounded-full"
                    style={{ backgroundColor: '#7C3AED', boxShadow: '0 0 6px rgba(124, 58, 237, 0.4)' }}
                  />
                </span>
              )}
            </button>

            {/* Knowledge button (Phase 3+) */}
            {state.currentPhase >= 3 && (
              <button
                type="button"
                onClick={handleOpenKnowledge}
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] animate-fade-in"
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(8px)',
                  border: '1.5px solid #BAE6FD',
                  boxShadow: '0 2px 16px rgba(135, 206, 235, 0.15)',
                }}
              >
                <span className="text-lg">📡</span>
                <span className="text-sm font-medium" style={{ color: '#0EA5E9' }}>
                  外部ナレッジ
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Status Panel */}
        <div className="flex-shrink-0 border-l border-border-warm bg-bg-primary/90 backdrop-blur-sm z-20">
          <StatusPanel
            currentPhase={state.currentPhase}
            metrics={metrics}
            feedbacks={state.feedbacks}
            agents={state.agents}
            qualityHistory={state.qualityHistory}
          />
        </div>
      </div>

      {/* Agent Detail Panel */}
      <AgentDetailPanel
        agent={selectedAgent}
        onClose={handleCloseDetail}
        feedbacks={state.feedbacks}
        skills={state.skills}
      />

      {/* Vision Modal */}
      <VisionModal
        open={visionModalOpen}
        onClose={handleCloseVision}
        vision={MOCK_VISION}
        currentPhase={state.currentPhase}
      />

      {/* Knowledge Modal */}
      <KnowledgeModal open={knowledgeModalOpen} onClose={handleCloseKnowledge} skills={MOCK_SKILLS} />
    </div>
  );
}
