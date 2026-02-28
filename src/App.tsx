import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import type {
  PhaseNumber,
  Agent,
  Building,
  Feedback,
  AgentSkill,
  Vision,
  AgentState,
  BuildingType,
} from './types';
import {
  PHASES,
  INITIAL_BUILDINGS,
  INITIAL_AGENTS,
  MOCK_FEEDBACKS,
  MOCK_SKILLS,
  MOCK_VISION,
  getMetricsForPhase,
} from './data/mockData';

import CityCanvas from './components/CityCanvas';
import StatusPanel from './components/StatusPanel';
import Header from './components/Header';
import PhaseNav from './components/PhaseNav';
import HintBar from './components/HintBar';
import Footer from './components/Footer';
import AgentDetailPanel from './components/AgentDetailPanel';

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
      const newBuildings = action.phase >= 3
        ? state.buildings.map((b) => ({
            ...b,
            feedbacks: MOCK_FEEDBACKS.filter((f) => f.buildingId === b.id),
          }))
        : action.phase < 3
          ? state.buildings.map((b) => ({ ...b, feedbacks: [] }))
          : state.buildings;

      // Phase 4: upgrade some buildings
      const upgradedBuildings = action.phase >= 4
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
        agents: action.phase >= 2
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
          b.id === action.feedback.buildingId
            ? { ...b, feedbacks: [...b.feedbacks, action.feedback] }
            : b,
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
          b.id === action.buildingId
            ? { ...b, level: Math.min(5, b.level + 1), status: 'upgraded' as const }
            : b,
        ),
      };
    case 'PUSH_QUALITY':
      return { ...state, qualityHistory: [...state.qualityHistory, action.score] };
    default:
      return state;
  }
}

// ─── Building type preferences per role ───────────────────────────────
const ROLE_BUILDING_PREFS: Record<string, BuildingType[]> = {
  warehouse_worker: ['warehouse'],
  sort_operator: ['sort_center'],
  delivery_driver: ['delivery_hub', 'receive_station', 'warehouse', 'sort_center'],
  recipient: ['receive_station'],
};

// ─── Vision-aligned building types ───────────────────────────────────
const VISION_PRIORITY_TYPES: BuildingType[] = ['delivery_hub', 'receive_station'];

// ─── Agent behavior simulation ────────────────────────────────────────
function simulateAgent(
  agent: Agent,
  buildings: Building[],
  allAgents: Agent[],
  phase: PhaseNumber,
  dt: number,
): Agent {
  const updated = { ...agent };
  const preferredTypes = ROLE_BUILDING_PREFS[agent.role] || ['delivery_hub'];

  switch (agent.state) {
    case 'idle': {
      // Pick a target building
      const candidates = buildings.filter((b) => preferredTypes.includes(b.type));
      let target: Building | undefined;

      if (phase >= 5) {
        // Phase 5: prefer vision-aligned buildings
        const visionBuildings = candidates.filter((b) => VISION_PRIORITY_TYPES.includes(b.type));
        target = visionBuildings.length > 0
          ? visionBuildings[Math.floor(Math.random() * visionBuildings.length)]
          : candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        target = candidates[Math.floor(Math.random() * candidates.length)];
      }

      if (target) {
        updated.targetBuildingId = target.id;
        updated.state = 'moving';
        updated.progress = 0;
      }
      break;
    }
    case 'moving': {
      const target = buildings.find((b) => b.id === updated.targetBuildingId);
      if (!target) {
        updated.state = 'idle';
        break;
      }

      // Move towards target
      const speed = agent.speed * 60 * dt;
      const dx = target.position.x - updated.position.x;
      const dy = target.position.y - updated.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < speed + 5) {
        // Arrived
        updated.position = { ...target.position };
        updated.state = 'working';
        updated.progress = 0;
        updated.previousBuildingId = updated.targetBuildingId;
      } else {
        updated.position = {
          x: updated.position.x + (dx / dist) * speed,
          y: updated.position.y + (dy / dist) * speed,
        };
      }
      break;
    }
    case 'working': {
      // Working duration depends on building complexity
      const building = buildings.find((b) => b.id === updated.targetBuildingId);
      const baseDuration = agent.role === 'delivery_driver' ? 1.5 : 2.5;
      const complexityBonus = building?.feedbacks.length ? building.feedbacks.length * 0.5 : 0;
      const duration = baseDuration + complexityBonus;

      updated.progress += dt;

      if (updated.progress >= duration) {
        // Decide: report feedback, communicate, or move on
        const shouldReport = phase >= 3 && Math.random() < 0.15;
        const shouldCommunicate = phase >= 3 && Math.random() < 0.1;

        if (shouldReport) {
          updated.state = 'reporting';
          updated.progress = 0;
        } else if (shouldCommunicate) {
          // Find another agent to communicate with
          const others = allAgents.filter((a) => a.id !== agent.id && a.state !== 'idle');
          if (others.length > 0) {
            const peer = others[Math.floor(Math.random() * others.length)];
            updated.state = 'communicating';
            updated.communicatingWithAgentId = peer.id;
            updated.progress = 0;
          } else {
            updated.state = 'idle';
            updated.targetBuildingId = null;
          }
        } else {
          updated.state = 'idle';
          updated.targetBuildingId = null;
        }
      }
      break;
    }
    case 'reporting': {
      updated.progress += dt;
      if (updated.progress >= 1.2) {
        updated.state = 'idle';
        updated.targetBuildingId = null;
      }
      break;
    }
    case 'communicating': {
      updated.progress += dt;
      if (updated.progress >= 1.0) {
        updated.state = 'idle';
        updated.communicatingWithAgentId = null;
        updated.targetBuildingId = null;
      }
      break;
    }
  }

  return updated;
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
          // Initialize agent position if not set
          if (agent.position.x === 0 && agent.position.y === 0) {
            const target = state.buildings.find((b) => b.id === agent.targetBuildingId);
            if (target) {
              return {
                ...agent,
                position: {
                  x: target.position.x + (Math.random() - 0.5) * 30,
                  y: target.position.y + (Math.random() - 0.5) * 20,
                },
                state: 'idle' as AgentState,
              };
            }
          }
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
  const selectedAgent = state.selectedAgentId
    ? state.agents.find((a) => a.id === state.selectedAgentId) || null
    : null;

  // ─── Handlers ───────────────────────────────────────────────────────
  const handleAgentClick = useCallback((agentId: string) => {
    dispatch({ type: 'SELECT_AGENT', agentId });
  }, []);

  const handleCloseDetail = useCallback(() => {
    dispatch({ type: 'SELECT_AGENT', agentId: null });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg-primary">
      {/* Phase transition flash */}
      {phaseTransitioning && (
        <div
          className="fixed inset-0 z-[100] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.15) 0%, transparent 70%)',
            animation: 'fade-in 0.3s ease-out',
          }}
        />
      )}

      {/* Header */}
      <Header currentPhase={state.currentPhase} />

      {/* Hint Bar */}
      <HintBar currentPhase={state.currentPhase} hints={currentPhaseConfig.hints} />

      {/* Main content area */}
      <div className="flex h-full pt-12">
        {/* Map area */}
        <div className="flex-1 relative">
          <CityCanvas
            buildings={state.buildings}
            agents={state.agents}
            currentPhase={state.currentPhase}
            vision={state.vision}
            elapsedTime={state.phaseElapsed}
            onAgentClick={handleAgentClick}
          />
        </div>

        {/* Status Panel */}
        <div className="flex-shrink-0 border-l border-border-glow/30 bg-bg-primary/80 backdrop-blur-sm">
          <StatusPanel
            currentPhase={state.currentPhase}
            metrics={metrics}
            vision={state.vision}
            skills={state.skills}
            feedbacks={state.feedbacks}
            agents={state.agents}
            qualityHistory={state.qualityHistory}
          />
        </div>
      </div>

      {/* Phase Navigation */}
      <PhaseNav
        currentPhase={state.currentPhase}
        onPhaseChange={handlePhaseChange}
        maxReachedPhase={state.maxReachedPhase}
      />

      {/* Footer */}
      <Footer description={currentPhaseConfig.description} />

      {/* Agent Detail Panel */}
      <AgentDetailPanel
        agent={selectedAgent}
        onClose={handleCloseDetail}
        feedbacks={state.feedbacks}
        skills={state.skills}
      />
    </div>
  );
}
