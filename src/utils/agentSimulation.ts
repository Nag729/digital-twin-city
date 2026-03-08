import type { Agent, AgentState, Building, BuildingType, PhaseNumber } from '../types';

// ─── Building type preferences per role ───────────────────────────────
export const ROLE_BUILDING_PREFS: Record<string, BuildingType[]> = {
  warehouse_worker: ['warehouse'],
  sort_operator: ['sort_center'],
  delivery_driver: ['delivery_hub', 'receive_station', 'warehouse', 'sort_center'],
  recipient: ['receive_station'],
};

// ─── Vision-aligned building types ───────────────────────────────────
export const VISION_PRIORITY_TYPES: BuildingType[] = ['delivery_hub'];

// ─── Agent behavior simulation ────────────────────────────────────────
export function simulateAgent(
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
        target =
          visionBuildings.length > 0
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

// ─── Initialize agent position if not yet set ─────────────────────────
export function initializeAgentPosition(agent: Agent, buildings: Building[]): Agent {
  if (agent.position.x !== 0 || agent.position.y !== 0) return agent;

  const target = buildings.find((b) => b.id === agent.targetBuildingId);
  if (!target) return agent;

  return {
    ...agent,
    position: {
      x: target.position.x + (Math.random() - 0.5) * 30,
      y: target.position.y + (Math.random() - 0.5) * 20,
    },
    state: 'idle' as AgentState,
  };
}
