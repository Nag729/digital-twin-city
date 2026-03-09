import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import AgentDetailPanel from './components/AgentDetailPanel';
import CityCanvas from './components/CityCanvas';
import Header from './components/Header';
import HintBar from './components/HintBar';
import IntroOverlay from './components/IntroOverlay';
import KnowledgeModal from './components/KnowledgeModal';
import OnboardingGuide from './components/OnboardingGuide';
import ProposalModal from './components/ProposalModal';
import StatusPanel from './components/StatusPanel';
import VisionModal from './components/VisionModal';
import {
  getMetricsForPhase,
  INITIAL_AGENTS,
  INITIAL_BUILDINGS,
  MOCK_FEEDBACKS,
  MOCK_PROPOSALS,
  MOCK_SKILLS,
  MOCK_VISION,
  PHASES,
} from './data/mockData';
import type { Agent, AgentSkill, AgentState, Building, Feedback, PhaseNumber, Vision } from './types';
import { initializeAgentPosition, simulateAgent } from './utils/agentSimulation';
import { useModalState } from './utils/hooks';

// ─── State ────────────────────────────────────────────────────────────
interface GameState {
  currentPhase: PhaseNumber;
  maxReachedPhase: PhaseNumber;
  buildings: Building[];
  agents: Agent[];
  feedbacks: Feedback[];
  skills: AgentSkill[];
  vision: Vision | null;
  selectedAgentId: string | null;
  qualityHistory: number[];
}

type GameAction =
  | { type: 'SET_PHASE'; phase: PhaseNumber }
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
        buildings: upgradedBuildings,
        feedbacks:
          action.phase >= 4
            ? MOCK_FEEDBACKS.map((f, i) => ({ ...f, resolved: i < 4 }))
            : action.phase >= 3
              ? MOCK_FEEDBACKS.slice(0, Math.min(6, MOCK_FEEDBACKS.length))
              : [],
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
        qualityHistory:
          action.phase >= 5
            ? [12, 25, 38, 52, 65, 72, getMetricsForPhase(action.phase).qualityScore]
            : action.phase >= 4
              ? [12, 25, 38, 52, 65, 68, getMetricsForPhase(action.phase).qualityScore]
              : [],
      };
    }
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

// ─── Mobile detection ────────────────────────────────────────────────
const mobileQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null;
function subscribeMobile(cb: () => void) {
  mobileQuery?.addEventListener('change', cb);
  return () => mobileQuery?.removeEventListener('change', cb);
}
function getIsMobile() {
  return mobileQuery?.matches ?? false;
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
    selectedAgentId: null,
    qualityHistory: [],
  });

  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, () => false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [phaseTransitioning, setPhaseTransitioning] = useState(false);
  const [visionModalOpen, handleOpenVision, handleCloseVision] = useModalState();
  const [knowledgeModalOpen, handleOpenKnowledge, handleCloseKnowledge] = useModalState();
  const [proposalModalOpen, handleOpenProposal, handleCloseProposal] = useModalState();
  const [proposalDecisions, setProposalDecisions] = useState<Record<string, 'go' | 'nogo'>>({});
  const [showIntro, setShowIntro] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ─── Intro / Onboarding handlers ────────────────────────────────────
  const handleIntroClose = useCallback(() => {
    setShowIntro(false);
    setTimeout(() => setShowOnboarding(true), 400);
  }, []);

  const handleOnboardingClose = useCallback(() => {
    setShowOnboarding(false);
  }, []);

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

      const s = stateRef.current;

      // Only simulate agents when phase >= 2
      if (s.currentPhase >= 2 && s.agents.length > 0) {
        const updatedAgents = s.agents.map((agent) => {
          const initialized = initializeAgentPosition(agent, s.buildings);
          if (initialized !== agent) return initialized;
          return simulateAgent(agent, s.buildings, s.agents, s.currentPhase, dt);
        });

        dispatch({ type: 'UPDATE_AGENTS', agents: updatedAgents });
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

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

  const handleProposalDecide = useCallback((proposalId: string, decision: 'go' | 'nogo') => {
    setProposalDecisions((prev) => ({ ...prev, [proposalId]: decision }));
  }, []);

  const isPhase5 = state.currentPhase >= 5;

  const statusPanelProps = {
    currentPhase: state.currentPhase,
    metrics,
    feedbacks: state.feedbacks,
    agents: state.agents,
    qualityHistory: state.qualityHistory,
  } as const;

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-bg-primary flex flex-col">
      {/* Phase transition flash — soft mint glow */}
      <AnimatePresence>
        {phaseTransitioning && (
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(110,207,176,0.12) 0%, transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Header with Phase Navigation */}
      <Header
        currentPhase={state.currentPhase}
        onPhaseChange={handlePhaseChange}
        maxReachedPhase={state.maxReachedPhase}
      />

      {/* Main content area — fills remaining space */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Map area */}
        <div className="flex-1 relative min-w-0" data-onboarding="canvas">
          {/* Hint Bar — overlaid on map */}
          <HintBar currentPhase={state.currentPhase} hints={currentPhaseConfig.hints} />

          <CityCanvas
            buildings={state.buildings}
            agents={state.agents}
            currentPhase={state.currentPhase}
            vision={state.vision}
            onAgentClick={handleAgentClick}
          />

          {/* Action buttons — bottom-left of map */}
          <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 z-10 flex flex-col gap-2 md:gap-3">
            {/* Knowledge button (Phase 3+) */}
            <AnimatePresence>
              {state.currentPhase >= 3 && (
                <motion.button
                  type="button"
                  onClick={handleOpenKnowledge}
                  className="flex items-center gap-2 md:gap-2.5 px-3.5 md:px-5 py-2.5 md:py-3 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1.5px solid #BAE6FD',
                    boxShadow: '0 2px 16px rgba(135, 206, 235, 0.15)',
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <span className="text-base md:text-lg">📡</span>
                  <span className="text-xs md:text-sm font-medium" style={{ color: '#0EA5E9' }}>
                    外部ナレッジ
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Proposal button (Phase 4+) */}
            <AnimatePresence>
              {state.currentPhase >= 4 && (
                <motion.button
                  type="button"
                  onClick={handleOpenProposal}
                  className="flex items-center gap-2 md:gap-2.5 px-3.5 md:px-5 py-2.5 md:py-3 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1.5px solid #FDE68A',
                    boxShadow: '0 2px 16px rgba(255, 179, 71, 0.15)',
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <span className="text-base md:text-lg">🗳️</span>
                  <span className="text-xs md:text-sm font-medium" style={{ color: '#B45309' }}>
                    改善提案
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Vision button */}
            <motion.button
              type="button"
              onClick={handleOpenVision}
              className="relative flex items-center gap-2 md:gap-2.5 px-3.5 md:px-5 py-2.5 md:py-3 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isPhase5 ? 'rgba(250, 245, 255, 0.95)' : 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(8px)',
                border: isPhase5 ? '2px solid #C4B5FD' : '1.5px solid #E9D5FF',
                boxShadow: isPhase5
                  ? '0 4px 24px rgba(124, 58, 237, 0.25), 0 0 0 3px rgba(196, 181, 253, 0.15)'
                  : '0 2px 16px rgba(196, 181, 253, 0.15)',
              }}
              animate={isPhase5 ? { scale: [1, 1.05, 1] } : {}}
              transition={isPhase5 ? { duration: 2, ease: 'easeInOut', repeat: Infinity } : {}}
            >
              <span className="text-base md:text-lg">🧭</span>
              <span className="text-xs md:text-sm font-medium" style={{ color: '#7C3AED' }}>
                ビジョン
              </span>
              {isPhase5 && (
                <>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
                    style={{ color: '#7C3AED', background: '#EDE9FE' }}
                  >
                    New
                  </span>
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
                </>
              )}
            </motion.button>
          </div>

          {/* Mobile: StatusPanel toggle button — bottom-right */}
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobilePanelOpen(true)}
              className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-200 active:scale-[0.97]"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                border: '1.5px solid #F5E6D3',
                boxShadow: '0 2px 16px rgba(180, 140, 100, 0.15)',
              }}
            >
              <span className="text-base">📊</span>
              <span className="text-xs font-medium text-text-primary">ステータス</span>
            </button>
          )}
        </div>

        {/* Status Panel — desktop: side panel */}
        {!isMobile && (
          <div className="flex-shrink-0 border-l border-border-warm bg-bg-primary/90 backdrop-blur-sm z-20">
            <StatusPanel {...statusPanelProps} />
          </div>
        )}
      </div>

      {/* Status Panel — mobile: bottom sheet */}
      <AnimatePresence>
        {isMobile && mobilePanelOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss pattern */}
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(93, 78, 55, 0.3)', backdropFilter: 'blur(2px)' }}
              onClick={() => setMobilePanelOpen(false)}
              onKeyDown={() => {}}
              role="presentation"
            />
            {/* Sheet */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 max-h-[75vh] rounded-t-3xl bg-bg-primary shadow-[0_-4px_30px_rgba(180,140,100,0.2)] overflow-hidden flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-border-warm" />
              </div>
              <div className="flex-1 overflow-y-auto">
                <StatusPanel {...statusPanelProps} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro Overlay */}
      <AnimatePresence>{showIntro && <IntroOverlay onClose={handleIntroClose} />}</AnimatePresence>
      <AnimatePresence>{showOnboarding && <OnboardingGuide onClose={handleOnboardingClose} />}</AnimatePresence>

      {/* Agent Detail Panel */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentDetailPanel agent={selectedAgent} onClose={handleCloseDetail} feedbacks={state.feedbacks} />
        )}
      </AnimatePresence>

      {/* Vision Modal */}
      <AnimatePresence>
        {visionModalOpen && (
          <VisionModal onClose={handleCloseVision} vision={MOCK_VISION} currentPhase={state.currentPhase} />
        )}
      </AnimatePresence>

      {/* Knowledge Modal */}
      <AnimatePresence>
        {knowledgeModalOpen && <KnowledgeModal onClose={handleCloseKnowledge} skills={state.skills} />}
      </AnimatePresence>

      {/* Proposal Modal */}
      <AnimatePresence>
        {proposalModalOpen && (
          <ProposalModal
            onClose={handleCloseProposal}
            proposals={MOCK_PROPOSALS}
            decisions={proposalDecisions}
            onDecide={handleProposalDecide}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
