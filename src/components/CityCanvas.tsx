import React, { useRef, useEffect, useCallback } from 'react';
import { Building, Agent, PhaseNumber, Vision } from '../types';
import { TILE_WIDTH, TILE_HEIGHT, MAP_COLS, MAP_ROWS, ROADS, gridToIso, isoToGrid } from '../data/mockData';

// ─── Props ───────────────────────────────────────────────────────────────────
export interface CityCanvasProps {
  buildings: Building[];
  agents: Agent[];
  currentPhase: PhaseNumber;
  vision: Vision | null;
  elapsedTime: number;
  onBuildingClick?: (buildingId: string) => void;
  onAgentClick?: (agentId: string) => void;
}

// ─── Color palette ───────────────────────────────────────────────────────────
const COLORS = {
  bgTop: '#0a0e1a',
  bgBottom: '#0f172a',
  grid: '#1e293b',
  roadBase: '#334155',
  roadGlow: '#22d3ee',
  roadAmber: '#f59e0b',
  buildingBase: '#1e293b',
  buildingOutline: '#475569',
  buildingBlue: '#3b82f6',
  buildingGreen: '#10b981',
  feedbackRed: '#ef4444',
  feedbackBlue: '#3b82f6',
  visionPurple: '#a78bfa',
  skillCyan: '#22d3ee',
  particleDim: 'rgba(59,130,246,0.15)',
  particleBright: 'rgba(34,211,238,0.5)',
};

// ─── Building dimensions by type ─────────────────────────────────────────────
const BUILDING_DIMS: Record<string, { w: number; h: number; d: number }> = {
  warehouse:       { w: 60, h: 30, d: 50 },
  delivery_hub:    { w: 44, h: 55, d: 44 },
  sort_center:     { w: 50, h: 40, d: 46 },
  receive_station: { w: 34, h: 22, d: 30 },
};

// ─── Particle state ──────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface SkillBand {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  width: number;
}

interface AgentTrail {
  x: number;
  y: number;
  alpha: number;
}

// ─── Component ───────────────────────────────────────────────────────────────
const CityCanvas: React.FC<CityCanvasProps> = ({
  buildings,
  agents,
  currentPhase,
  vision,
  elapsedTime,
  onBuildingClick,
  onAgentClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  // Persistent mutable state across frames
  const particlesRef = useRef<Particle[]>([]);
  const skillBandsRef = useRef<SkillBand[]>([]);
  const agentTrailsRef = useRef<Map<string, AgentTrail[]>>(new Map());
  const frameRef = useRef(0);
  const visionRippleRef = useRef(0);
  const prevPhaseRef = useRef(currentPhase);

  // ─── Isometric helpers ─────────────────────────────────────────────────────
  const drawIsoRect = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    d: number,
    color: string,
    outlineColor: string,
  ) => {
    const hw = w / 2;
    const hd = d / 2;
    // Isometric diamond (floor)
    ctx.beginPath();
    ctx.moveTo(cx, cy - hd);       // top
    ctx.lineTo(cx + hw, cy);       // right
    ctx.lineTo(cx, cy + hd);       // bottom
    ctx.lineTo(cx - hw, cy);       // left
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const drawIsoBuilding = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    d: number,
    baseColor: string,
    glowColor: string,
    glowIntensity: number,
    scale: number,
  ) => {
    const sw = w * scale;
    const sh = h * scale;
    const sd = d * scale;
    const hw = sw / 2;
    const hd = sd / 2;

    // Apply glow
    if (glowIntensity > 0) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glowIntensity;
    }

    // ── Left face ──
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);             // top-left
    ctx.lineTo(cx, cy + hd);             // top-right (bottom of diamond)
    ctx.lineTo(cx, cy + hd - sh);        // bottom-right lifted
    ctx.lineTo(cx - hw, cy - sh);        // bottom-left lifted
    ctx.closePath();
    const leftGrad = ctx.createLinearGradient(cx - hw, cy, cx, cy + hd);
    leftGrad.addColorStop(0, shadeColor(baseColor, -30));
    leftGrad.addColorStop(1, shadeColor(baseColor, -15));
    ctx.fillStyle = leftGrad;
    ctx.fill();
    ctx.strokeStyle = glowIntensity > 0 ? glowColor : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = glowIntensity > 0 ? 1.5 : 0.5;
    ctx.stroke();

    // ── Right face ──
    ctx.beginPath();
    ctx.moveTo(cx + hw, cy);             // top-right
    ctx.lineTo(cx, cy + hd);             // top-left (bottom of diamond)
    ctx.lineTo(cx, cy + hd - sh);        // bottom-left lifted
    ctx.lineTo(cx + hw, cy - sh);        // bottom-right lifted
    ctx.closePath();
    const rightGrad = ctx.createLinearGradient(cx, cy + hd, cx + hw, cy);
    rightGrad.addColorStop(0, shadeColor(baseColor, -10));
    rightGrad.addColorStop(1, shadeColor(baseColor, 5));
    ctx.fillStyle = rightGrad;
    ctx.fill();
    ctx.strokeStyle = glowIntensity > 0 ? glowColor : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = glowIntensity > 0 ? 1.5 : 0.5;
    ctx.stroke();

    // ── Top face ──
    ctx.beginPath();
    ctx.moveTo(cx, cy + hd - sh);        // front
    ctx.lineTo(cx + hw, cy - sh);        // right
    ctx.lineTo(cx, cy - hd - sh);        // back
    ctx.lineTo(cx - hw, cy - sh);        // left
    ctx.closePath();
    const topGrad = ctx.createLinearGradient(cx, cy - hd - sh, cx, cy + hd - sh);
    topGrad.addColorStop(0, shadeColor(baseColor, 20));
    topGrad.addColorStop(1, shadeColor(baseColor, 10));
    ctx.fillStyle = topGrad;
    ctx.fill();
    ctx.strokeStyle = glowIntensity > 0 ? glowColor : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = glowIntensity > 0 ? 1.5 : 0.5;
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };

  // ─── Color utility ─────────────────────────────────────────────────────────
  function shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
    return `rgb(${r},${g},${b})`;
  }

  function hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = num >> 16;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ─── Initialize / manage particles ─────────────────────────────────────────
  const ensureParticles = useCallback((canvasW: number, canvasH: number) => {
    const particles = particlesRef.current;
    const targetCount = 60;
    while (particles.length < targetCount) {
      particles.push({
        x: Math.random() * canvasW,
        y: Math.random() * canvasH,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.1,
        life: Math.random() * 300,
        maxLife: 200 + Math.random() * 200,
        size: 1 + Math.random() * 2,
        color: Math.random() > 0.5 ? COLORS.particleDim : COLORS.particleBright,
      });
    }
  }, []);

  const updateParticles = useCallback((canvasW: number, canvasH: number) => {
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life > p.maxLife || p.x < -10 || p.x > canvasW + 10 || p.y < -10 || p.y > canvasH + 10) {
        particles[i] = {
          x: Math.random() * canvasW,
          y: canvasH + 5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(0.2 + Math.random() * 0.4),
          life: 0,
          maxLife: 200 + Math.random() * 200,
          size: 1 + Math.random() * 2,
          color: Math.random() > 0.5 ? COLORS.particleDim : COLORS.particleBright,
        };
      }
    }
  }, []);

  // ─── Skill bands (Phase 3) ─────────────────────────────────────────────────
  const spawnSkillBand = useCallback((canvasW: number, canvasH: number) => {
    const bands = skillBandsRef.current;
    if (bands.length >= 8) return;
    const edge = Math.floor(Math.random() * 4);
    let sx = 0, sy = 0;
    const centerX = canvasW / 2;
    const centerY = canvasH / 2;
    switch (edge) {
      case 0: sx = Math.random() * canvasW; sy = -10; break;
      case 1: sx = canvasW + 10; sy = Math.random() * canvasH; break;
      case 2: sx = Math.random() * canvasW; sy = canvasH + 10; break;
      case 3: sx = -10; sy = Math.random() * canvasH; break;
    }
    bands.push({
      x: sx, y: sy,
      targetX: centerX + (Math.random() - 0.5) * 300,
      targetY: centerY + (Math.random() - 0.5) * 200,
      progress: 0,
      speed: 0.005 + Math.random() * 0.008,
      width: 2 + Math.random() * 3,
    });
  }, []);

  // ─── Click handling ────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Check agents first (smaller targets, higher priority)
    for (const agent of agents) {
      const ax = agent.position.x;
      const ay = agent.position.y;
      const dist = Math.sqrt((mx - ax) ** 2 + (my - ay) ** 2);
      if (dist < 18) {
        onAgentClick?.(agent.id);
        return;
      }
    }

    // Check buildings
    for (const b of buildings) {
      const bx = b.position.x;
      const by = b.position.y;
      const dims = BUILDING_DIMS[b.type] || BUILDING_DIMS.receive_station;
      const hw = dims.w / 2 + 10;
      const hh = dims.h + dims.d / 2 + 10;
      if (mx > bx - hw && mx < bx + hw && my > by - hh && my < by + dims.d / 2 + 10) {
        onBuildingClick?.(b.id);
        return;
      }
    }
  }, [buildings, agents, onBuildingClick, onAgentClick]);

  // ─── Main render loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Phase change detection for effects
    if (currentPhase !== prevPhaseRef.current) {
      if (currentPhase === 5) visionRippleRef.current = 0;
      prevPhaseRef.current = currentPhase;
    }

    // ── Animation loop ──
    const render = () => {
      const frame = frameRef.current++;
      const { width: cw, height: ch } = container.getBoundingClientRect();

      // ── 1. Background gradient ──
      const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
      bgGrad.addColorStop(0, COLORS.bgTop);
      bgGrad.addColorStop(1, COLORS.bgBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cw, ch);

      // ── 2. Background grid ──
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      for (let col = 0; col <= MAP_COLS; col++) {
        const start = gridToIso(col, 0);
        const end = gridToIso(col, MAP_ROWS);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      for (let row = 0; row <= MAP_ROWS; row++) {
        const start = gridToIso(0, row);
        const end = gridToIso(MAP_COLS, row);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ── 3. Roads ──
      const roadPulse = Math.sin(frame * 0.02) * 0.15 + 0.5;
      for (const road of ROADS) {
        if (road.length < 2) continue;
        // Road base
        ctx.beginPath();
        const first = gridToIso(road[0][0], road[0][1]);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < road.length; i++) {
          const p = gridToIso(road[i][0], road[i][1]);
          ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = COLORS.roadBase;
        ctx.lineWidth = 6;
        ctx.stroke();

        // Road glow
        ctx.shadowColor = COLORS.roadGlow;
        ctx.shadowBlur = 4 + roadPulse * 4;
        ctx.strokeStyle = hexToRgba(COLORS.roadGlow, 0.15 + roadPulse * 0.1);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < road.length; i++) {
          const p = gridToIso(road[i][0], road[i][1]);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // ── 4. Floating particles ──
      ensureParticles(cw, ch);
      updateParticles(cw, ch);
      for (const p of particlesRef.current) {
        const lifeRatio = 1 - p.life / p.maxLife;
        const alpha = lifeRatio * (lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1) * 0.6;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── 5. Skill bands (Phase 3) ──
      if (currentPhase >= 3) {
        if (frame % 40 === 0) spawnSkillBand(cw, ch);
        const bands = skillBandsRef.current;
        for (let i = bands.length - 1; i >= 0; i--) {
          const band = bands[i];
          band.progress += band.speed;
          if (band.progress >= 1) {
            bands.splice(i, 1);
            continue;
          }
          const cx = band.x + (band.targetX - band.x) * band.progress;
          const cy = band.y + (band.targetY - band.y) * band.progress;
          const alpha = band.progress < 0.2
            ? band.progress * 5
            : band.progress > 0.8
              ? (1 - band.progress) * 5
              : 1;
          ctx.globalAlpha = alpha * 0.6;
          ctx.shadowColor = COLORS.skillCyan;
          ctx.shadowBlur = 12;
          ctx.strokeStyle = COLORS.skillCyan;
          ctx.lineWidth = band.width;
          ctx.beginPath();
          const tailProgress = Math.max(0, band.progress - 0.15);
          const tailX = band.x + (band.targetX - band.x) * tailProgress;
          const tailY = band.y + (band.targetY - band.y) * tailProgress;
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(cx, cy);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        }
        ctx.globalAlpha = 1;
      }

      // ── 6. Buildings ──
      // Sort buildings by position for proper iso overlap (back to front)
      const sortedBuildings = [...buildings].sort((a, b) => {
        const aGrid = isoToGrid(a.position.x, a.position.y);
        const bGrid = isoToGrid(b.position.x, b.position.y);
        return (aGrid.col + aGrid.row) - (bGrid.col + bGrid.row);
      });

      for (const b of sortedBuildings) {
        const dims = BUILDING_DIMS[b.type] || BUILDING_DIMS.receive_station;
        const bx = b.position.x;
        const by = b.position.y;

        // Determine glow and color by phase & status
        let baseColor = COLORS.buildingBase;
        let glowColor = COLORS.buildingOutline;
        let glowIntensity = 0;
        let scale = 1;

        if (currentPhase === 1) {
          // Dim, minimal glow
          glowIntensity = 2;
          glowColor = 'rgba(100,116,139,0.3)';
        } else if (currentPhase === 2) {
          // Slightly more glow as agents are active
          glowIntensity = 4;
          glowColor = hexToRgba(COLORS.buildingBlue, 0.3);
        } else if (currentPhase >= 3) {
          glowIntensity = 8 + Math.sin(frame * 0.03 + b.position.x * 0.01) * 3;
          glowColor = COLORS.buildingBlue;
        }

        // Phase 3: Feedback markers
        if (currentPhase >= 3 && b.feedbacks.length > 0) {
          const hasBug = b.feedbacks.some(f => f.type === 'bug');
          const hasImprovement = b.feedbacks.some(f => f.type === 'ux_improvement' || f.type === 'performance');
          if (hasBug) {
            glowColor = COLORS.feedbackRed;
            glowIntensity = 10 + Math.sin(frame * 0.08) * 6;
          } else if (hasImprovement) {
            glowColor = COLORS.feedbackBlue;
            glowIntensity = 8 + Math.sin(frame * 0.06) * 4;
          }
        }

        // Phase 4: Upgrade effects
        if (currentPhase >= 4) {
          if (b.status === 'upgrading') {
            scale = 1 + Math.sin(frame * 0.05) * 0.08;
            glowColor = COLORS.buildingGreen;
            glowIntensity = 18 + Math.sin(frame * 0.1) * 8;
          } else if (b.status === 'upgraded') {
            baseColor = '#1a3a4a';
            glowColor = COLORS.buildingGreen;
            glowIntensity = 12;
          } else {
            // Homogenization effect: all buildings become similar gray
            const homo = Math.min(1, (elapsedTime - 60) / 30);
            if (homo > 0) {
              const gray = Math.round(40 + homo * 20);
              baseColor = `rgb(${gray},${gray + 5},${gray + 15})`;
              glowIntensity = Math.max(2, glowIntensity * (1 - homo * 0.6));
            }
          }
        }

        // Phase 5: Vision ripple restores individuality
        if (currentPhase === 5 && vision) {
          const dist = Math.sqrt((bx - cw / 2) ** 2 + (by - ch / 2) ** 2);
          const rippleRadius = visionRippleRef.current;
          if (dist < rippleRadius) {
            baseColor = '#1a2a3a';
            glowColor = COLORS.visionPurple;
            glowIntensity = 14 + Math.sin(frame * 0.04 + dist * 0.01) * 4;
            scale = 1 + Math.sin(frame * 0.03) * 0.03;
          }
        }

        // Drop shadow
        ctx.globalAlpha = 0.25;
        drawIsoRect(ctx, bx + 3, by + 4, dims.w * scale * 0.9, dims.d * scale * 0.9, 'rgba(0,0,0,0.5)', 'transparent');
        ctx.globalAlpha = 1;

        // Draw isometric building
        drawIsoBuilding(ctx, bx, by, dims.w, dims.h, dims.d, baseColor, glowColor, glowIntensity, scale);

        // Feedback pulsing ring (Phase 3+)
        if (currentPhase >= 3 && b.feedbacks.length > 0) {
          const pulseSize = 20 + Math.sin(frame * 0.06) * 8;
          const pulseAlpha = 0.3 + Math.sin(frame * 0.06) * 0.2;
          const hasBug = b.feedbacks.some(f => f.type === 'bug');
          ctx.globalAlpha = pulseAlpha;
          ctx.strokeStyle = hasBug ? COLORS.feedbackRed : COLORS.feedbackBlue;
          ctx.lineWidth = 2;
          ctx.shadowColor = hasBug ? COLORS.feedbackRed : COLORS.feedbackBlue;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.ellipse(bx, by - dims.h * scale * 0.5, pulseSize, pulseSize * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.globalAlpha = 1;
        }

        // Phase 4: Upgrade sparkles
        if (currentPhase >= 4 && (b.status === 'upgrading' || b.status === 'upgraded')) {
          for (let s = 0; s < 3; s++) {
            const angle = (frame * 0.03 + s * Math.PI * 2 / 3) % (Math.PI * 2);
            const sr = 20 + Math.sin(frame * 0.05 + s) * 5;
            const sx = bx + Math.cos(angle) * sr;
            const sy = by - dims.h * scale - 10 + Math.sin(angle) * sr * 0.4;
            ctx.globalAlpha = 0.6 + Math.sin(frame * 0.1 + s) * 0.3;
            ctx.fillStyle = COLORS.buildingGreen;
            ctx.shadowColor = COLORS.buildingGreen;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(sx, sy, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.globalAlpha = 1;
        }
      }

      // ── 7. Agents ──
      if (currentPhase >= 2) {
        for (const agent of agents) {
          const ax = agent.position.x;
          const ay = agent.position.y;
          if (ax === 0 && ay === 0) continue; // Not positioned yet

          // Trail management
          if (!agentTrailsRef.current.has(agent.id)) {
            agentTrailsRef.current.set(agent.id, []);
          }
          const trails = agentTrailsRef.current.get(agent.id)!;

          // Add trail point if agent is moving
          if (agent.state === 'moving' && frame % 3 === 0) {
            trails.push({ x: ax, y: ay, alpha: 0.8 });
            if (trails.length > 12) trails.shift();
          }

          // Draw trails
          for (let t = trails.length - 1; t >= 0; t--) {
            trails[t].alpha -= 0.03;
            if (trails[t].alpha <= 0) {
              trails.splice(t, 1);
              continue;
            }
            const tr = trails[t];
            ctx.globalAlpha = tr.alpha * 0.4;
            ctx.fillStyle = getRoleColor(agent.role);
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;

          // Agent glow
          ctx.shadowColor = getRoleColor(agent.role);
          ctx.shadowBlur = agent.state === 'working' ? 12 : 6;

          if (agent.role === 'delivery_driver') {
            // Draw as small truck rectangle
            const tw = 12;
            const th = 8;
            ctx.save();
            ctx.translate(ax, ay);

            // Truck body
            ctx.fillStyle = getRoleColor(agent.role);
            ctx.fillRect(-tw / 2, -th / 2, tw, th);

            // Truck outline
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-tw / 2, -th / 2, tw, th);

            // Cab
            ctx.fillStyle = shadeColor(getRoleColor(agent.role), 30);
            ctx.fillRect(-tw / 2 - 4, -th / 2 + 1, 4, th - 2);

            ctx.restore();
          } else {
            // Draw as circle (person)
            const radius = agent.role === 'recipient' ? 5 : 6;
            ctx.fillStyle = getRoleColor(agent.role);
            ctx.beginPath();
            ctx.arc(ax, ay, radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner highlight
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(ax - 1, ay - 1, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';

          // State indicator ring
          if (agent.state === 'working') {
            ctx.strokeStyle = 'rgba(34,211,238,0.5)';
            ctx.lineWidth = 1.5;
            const workRing = 10 + Math.sin(frame * 0.1) * 2;
            ctx.beginPath();
            ctx.arc(ax, ay, workRing, 0, Math.PI * 2);
            ctx.stroke();
          } else if (agent.state === 'communicating') {
            // Communication link dots
            ctx.fillStyle = 'rgba(167,139,250,0.6)';
            for (let d = 0; d < 3; d++) {
              const dotAngle = frame * 0.08 + d * (Math.PI * 2 / 3);
              const dotR = 12;
              ctx.beginPath();
              ctx.arc(ax + Math.cos(dotAngle) * dotR, ay + Math.sin(dotAngle) * dotR * 0.5, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // ── 8. Vision ripple (Phase 5) ──
      if (currentPhase === 5 && vision) {
        visionRippleRef.current += 1.2;
        const maxRadius = Math.sqrt(cw * cw + ch * ch);
        const ripple = visionRippleRef.current;

        if (ripple < maxRadius) {
          const rippleAlpha = Math.max(0, 1 - ripple / maxRadius) * 0.5;
          ctx.globalAlpha = rippleAlpha;
          ctx.strokeStyle = COLORS.visionPurple;
          ctx.lineWidth = 3;
          ctx.shadowColor = COLORS.visionPurple;
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.ellipse(cw / 2, ch / 2, ripple, ripple * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Secondary inner ripple
          if (ripple > 40) {
            ctx.globalAlpha = rippleAlpha * 0.5;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(cw / 2, ch / 2, ripple - 40, (ripple - 40) * 0.55, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.globalAlpha = 1;
        }
      }

      // ── 9. Ambient scanline overlay ──
      ctx.globalAlpha = 0.03;
      for (let y = 0; y < ch; y += 3) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, y, cw, 1);
      }
      ctx.globalAlpha = 1;

      // ── 10. Vignette ──
      const vigGrad = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.3, cw / 2, ch / 2, cw * 0.8);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, cw, ch);

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [buildings, agents, currentPhase, vision, elapsedTime, ensureParticles, updateParticles, spawnSkillBand]);

  function getRoleColor(role: string): string {
    switch (role) {
      case 'warehouse_worker': return '#f59e0b';  // amber
      case 'sort_operator':    return '#a78bfa';  // purple
      case 'delivery_driver':  return '#22d3ee';  // cyan
      case 'recipient':        return '#34d399';  // green
      default:                 return '#94a3b8';  // gray
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="absolute inset-0 w-full h-full cursor-pointer"
      />
    </div>
  );
};

export default CityCanvas;
