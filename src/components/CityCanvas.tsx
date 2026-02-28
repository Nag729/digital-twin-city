import React, { useRef, useEffect } from 'react';
import type { Building, Agent, PhaseNumber, Vision } from '../types';
import { MAP_COLS, MAP_ROWS, ROADS, gridToIso } from '../data/mockData';

export interface CityCanvasProps {
  buildings: Building[];
  agents: Agent[];
  currentPhase: PhaseNumber;
  vision: Vision | null;
  elapsedTime: number;
  onBuildingClick?: (buildingId: string) => void;
  onAgentClick?: (agentId: string) => void;
}

// ─── Color palette ───────────────────────────────────────────────────
const COLORS = {
  bgTop: '#0a0e1a',
  bgBottom: '#0f172a',
  grid: '#1e293b',
  roadBase: '#334155',
  roadGlow: '#22d3ee',
  buildingBase: '#1e293b',
  buildingOutline: '#475569',
  buildingBlue: '#3b82f6',
  buildingGreen: '#10b981',
  feedbackRed: '#ef4444',
  feedbackBlue: '#3b82f6',
  visionPurple: '#a78bfa',
  skillCyan: '#22d3ee',
};

const BUILDING_DIMS: Record<string, { w: number; h: number; d: number }> = {
  warehouse: { w: 60, h: 30, d: 50 },
  delivery_hub: { w: 44, h: 55, d: 44 },
  sort_center: { w: 50, h: 40, d: 46 },
  receive_station: { w: 34, h: 22, d: 30 },
};

interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; }
interface SkillBand { x: number; y: number; targetX: number; targetY: number; progress: number; speed: number; width: number; }
interface AgentTrail { x: number; y: number; alpha: number; }

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return `rgb(${r},${g},${b})`;
}

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  return `rgba(${num >> 16},${(num >> 8) & 0xff},${num & 0xff},${alpha})`;
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'warehouse_worker': return '#f59e0b';
    case 'sort_operator': return '#a78bfa';
    case 'delivery_driver': return '#22d3ee';
    case 'recipient': return '#34d399';
    default: return '#94a3b8';
  }
}

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

  // Store latest props in refs so the render loop always reads current values
  const propsRef = useRef({ buildings, agents, currentPhase, vision, elapsedTime });
  propsRef.current = { buildings, agents, currentPhase, vision, elapsedTime };

  // Persistent mutable state
  const particles = useRef<Particle[]>([]);
  const skillBands = useRef<SkillBand[]>([]);
  const agentTrails = useRef<Map<string, AgentTrail[]>>(new Map());
  const frameCount = useRef(0);
  const visionRipple = useRef(0);
  const prevPhase = useRef(currentPhase);

  // Reset vision ripple on phase 5 entry
  useEffect(() => {
    if (currentPhase === 5 && prevPhase.current !== 5) {
      visionRipple.current = 0;
    }
    prevPhase.current = currentPhase;
  }, [currentPhase]);

  // Click handler
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    // DPR correction
    const dpr = window.devicePixelRatio || 1;
    const lx = mx / dpr;
    const ly = my / dpr;

    const { agents: currentAgents, buildings: currentBuildings } = propsRef.current;
    for (const agent of currentAgents) {
      const dist = Math.sqrt((lx - agent.position.x) ** 2 + (ly - agent.position.y) ** 2);
      if (dist < 18) { onAgentClick?.(agent.id); return; }
    }
    for (const b of currentBuildings) {
      const dims = BUILDING_DIMS[b.type] || BUILDING_DIMS.receive_station;
      const hw = dims.w / 2 + 10;
      const hh = dims.h + dims.d / 2 + 10;
      if (lx > b.position.x - hw && lx < b.position.x + hw && ly > b.position.y - hh && ly < b.position.y + dims.d / 2 + 10) {
        onBuildingClick?.(b.id); return;
      }
    }
  };

  // Single render loop — starts once, reads props from ref
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Init particles
    for (let i = 0; i < 60; i++) {
      particles.current.push({
        x: Math.random() * 1280, y: Math.random() * 800,
        vx: (Math.random() - 0.5) * 0.3, vy: -(0.1 + Math.random() * 0.3),
        life: Math.random() * 300, maxLife: 200 + Math.random() * 200,
        size: 1 + Math.random() * 2,
        color: Math.random() > 0.5 ? 'rgba(59,130,246,0.15)' : 'rgba(34,211,238,0.5)',
      });
    }

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

    const render = () => {
      const frame = frameCount.current++;
      const { width: cw, height: ch } = container.getBoundingClientRect();
      const { buildings: blds, agents: agts, currentPhase: phase, vision: vis } = propsRef.current;

      // 1. Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
      bgGrad.addColorStop(0, COLORS.bgTop);
      bgGrad.addColorStop(1, COLORS.bgBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cw, ch);

      // 2. Grid
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.35;
      for (let col = 0; col <= MAP_COLS; col++) {
        const s = gridToIso(col, 0), e = gridToIso(col, MAP_ROWS);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      }
      for (let row = 0; row <= MAP_ROWS; row++) {
        const s = gridToIso(0, row), e = gridToIso(MAP_COLS, row);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 3. Roads
      const roadPulse = Math.sin(frame * 0.02) * 0.15 + 0.5;
      for (const road of ROADS) {
        if (road.length < 2) continue;
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

      // 4. Particles
      const pts = particles.current;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy; p.life++;
        if (p.life > p.maxLife || p.y < -10) {
          pts[i] = { x: Math.random() * cw, y: ch + 5, vx: (Math.random() - 0.5) * 0.3, vy: -(0.2 + Math.random() * 0.4), life: 0, maxLife: 200 + Math.random() * 200, size: 1 + Math.random() * 2, color: pts[i].color };
        }
        const lifeRatio = 1 - p.life / p.maxLife;
        ctx.globalAlpha = lifeRatio * 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 5. Skill bands (Phase 3+)
      if (phase >= 3) {
        const bands = skillBands.current;
        if (frame % 40 === 0 && bands.length < 8) {
          const edge = Math.floor(Math.random() * 4);
          let sx = 0, sy = 0;
          if (edge === 0) { sx = Math.random() * cw; sy = -10; }
          else if (edge === 1) { sx = cw + 10; sy = Math.random() * ch; }
          else if (edge === 2) { sx = Math.random() * cw; sy = ch + 10; }
          else { sx = -10; sy = Math.random() * ch; }
          bands.push({ x: sx, y: sy, targetX: cw / 2 + (Math.random() - 0.5) * 300, targetY: ch / 2 + (Math.random() - 0.5) * 200, progress: 0, speed: 0.005 + Math.random() * 0.008, width: 2 + Math.random() * 3 });
        }
        for (let i = bands.length - 1; i >= 0; i--) {
          const band = bands[i];
          band.progress += band.speed;
          if (band.progress >= 1) { bands.splice(i, 1); continue; }
          const cx = band.x + (band.targetX - band.x) * band.progress;
          const cy = band.y + (band.targetY - band.y) * band.progress;
          const alpha = band.progress < 0.2 ? band.progress * 5 : band.progress > 0.8 ? (1 - band.progress) * 5 : 1;
          ctx.globalAlpha = alpha * 0.6;
          ctx.shadowColor = COLORS.skillCyan; ctx.shadowBlur = 12;
          ctx.strokeStyle = COLORS.skillCyan; ctx.lineWidth = band.width;
          const tailP = Math.max(0, band.progress - 0.15);
          ctx.beginPath();
          ctx.moveTo(band.x + (band.targetX - band.x) * tailP, band.y + (band.targetY - band.y) * tailP);
          ctx.lineTo(cx, cy); ctx.stroke();
          ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        }
        ctx.globalAlpha = 1;
      }

      // 6. Buildings (sort back-to-front)
      const sortedBlds = [...blds].sort((a, b) => (a.position.y) - (b.position.y));
      for (const b of sortedBlds) {
        const dims = BUILDING_DIMS[b.type] || BUILDING_DIMS.receive_station;
        const bx = b.position.x;
        const by = b.position.y;

        let baseColor = COLORS.buildingBase;
        let glowColor = COLORS.buildingOutline;
        let glowIntensity = 0;
        let scale = 1;

        if (phase === 1) { glowIntensity = 3; glowColor = 'rgba(100,116,139,0.4)'; }
        else if (phase === 2) { glowIntensity = 6; glowColor = hexToRgba(COLORS.buildingBlue, 0.4); }
        else if (phase >= 3) { glowIntensity = 10 + Math.sin(frame * 0.03 + bx * 0.01) * 3; glowColor = COLORS.buildingBlue; }

        // Feedback markers
        if (phase >= 3 && b.feedbacks.length > 0) {
          const hasBug = b.feedbacks.some(f => f.type === 'bug');
          if (hasBug) { glowColor = COLORS.feedbackRed; glowIntensity = 12 + Math.sin(frame * 0.08) * 6; }
          else { glowColor = COLORS.feedbackBlue; glowIntensity = 10 + Math.sin(frame * 0.06) * 4; }
        }

        // Phase 4: upgrade
        if (phase >= 4) {
          if (b.status === 'upgrading') { scale = 1 + Math.sin(frame * 0.05) * 0.08; glowColor = COLORS.buildingGreen; glowIntensity = 18; }
          else if (b.status === 'upgraded') { baseColor = '#1a3a4a'; glowColor = COLORS.buildingGreen; glowIntensity = 14; }
        }

        // Phase 5: vision ripple restores individuality
        if (phase === 5 && vis) {
          const dist = Math.sqrt((bx - cw / 2) ** 2 + (by - ch / 2) ** 2);
          if (dist < visionRipple.current) { baseColor = '#1a2a3a'; glowColor = COLORS.visionPurple; glowIntensity = 16; }
        }

        const sw = dims.w * scale, sh = dims.h * scale, sd = dims.d * scale;
        const hw = sw / 2, hd = sd / 2;

        // Shadow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.moveTo(bx, by - hd * 0.8); ctx.lineTo(bx + hw * 0.9, by); ctx.lineTo(bx, by + hd * 0.8); ctx.lineTo(bx - hw * 0.9, by);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;

        if (glowIntensity > 0) { ctx.shadowColor = glowColor; ctx.shadowBlur = glowIntensity; }

        // Left face
        ctx.beginPath();
        ctx.moveTo(bx - hw, by); ctx.lineTo(bx, by + hd); ctx.lineTo(bx, by + hd - sh); ctx.lineTo(bx - hw, by - sh);
        ctx.closePath();
        ctx.fillStyle = shadeColor(baseColor, -20); ctx.fill();
        ctx.strokeStyle = glowIntensity > 0 ? glowColor : 'rgba(255,255,255,0.08)'; ctx.lineWidth = glowIntensity > 0 ? 1.5 : 0.5; ctx.stroke();

        // Right face
        ctx.beginPath();
        ctx.moveTo(bx + hw, by); ctx.lineTo(bx, by + hd); ctx.lineTo(bx, by + hd - sh); ctx.lineTo(bx + hw, by - sh);
        ctx.closePath();
        ctx.fillStyle = shadeColor(baseColor, -5); ctx.fill();
        ctx.strokeStyle = glowIntensity > 0 ? glowColor : 'rgba(255,255,255,0.08)'; ctx.lineWidth = glowIntensity > 0 ? 1.5 : 0.5; ctx.stroke();

        // Top face
        ctx.beginPath();
        ctx.moveTo(bx, by + hd - sh); ctx.lineTo(bx + hw, by - sh); ctx.lineTo(bx, by - hd - sh); ctx.lineTo(bx - hw, by - sh);
        ctx.closePath();
        ctx.fillStyle = shadeColor(baseColor, 15); ctx.fill();
        ctx.strokeStyle = glowIntensity > 0 ? glowColor : 'rgba(255,255,255,0.12)'; ctx.lineWidth = glowIntensity > 0 ? 1.5 : 0.5; ctx.stroke();

        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

        // Feedback pulse ring (Phase 3+)
        if (phase >= 3 && b.feedbacks.length > 0) {
          const pulseSize = 20 + Math.sin(frame * 0.06) * 8;
          const hasBug = b.feedbacks.some(f => f.type === 'bug');
          ctx.globalAlpha = 0.3 + Math.sin(frame * 0.06) * 0.2;
          ctx.strokeStyle = hasBug ? COLORS.feedbackRed : COLORS.feedbackBlue;
          ctx.lineWidth = 2; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.ellipse(bx, by - sh * 0.5, pulseSize, pulseSize * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
        }

        // Building name
        ctx.fillStyle = '#64748b'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(b.name, bx, by + hd + 12);
      }

      // 7. Agents
      if (phase >= 2) {
        for (const agent of agts) {
          const ax = agent.position.x, ay = agent.position.y;
          if (ax === 0 && ay === 0) continue;

          // Trails
          if (!agentTrails.current.has(agent.id)) agentTrails.current.set(agent.id, []);
          const trails = agentTrails.current.get(agent.id)!;
          if (agent.state === 'moving' && frame % 3 === 0) {
            trails.push({ x: ax, y: ay, alpha: 0.8 });
            if (trails.length > 12) trails.shift();
          }
          for (let t = trails.length - 1; t >= 0; t--) {
            trails[t].alpha -= 0.03;
            if (trails[t].alpha <= 0) { trails.splice(t, 1); continue; }
            ctx.globalAlpha = trails[t].alpha * 0.4;
            ctx.fillStyle = getRoleColor(agent.role);
            ctx.beginPath(); ctx.arc(trails[t].x, trails[t].y, 3, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;

          // Agent glow
          ctx.shadowColor = getRoleColor(agent.role);
          ctx.shadowBlur = agent.state === 'working' ? 12 : 6;

          if (agent.role === 'delivery_driver') {
            ctx.save(); ctx.translate(ax, ay);
            ctx.fillStyle = getRoleColor(agent.role);
            ctx.fillRect(-6, -4, 12, 8);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
            ctx.strokeRect(-6, -4, 12, 8);
            ctx.fillStyle = shadeColor(getRoleColor(agent.role), 30);
            ctx.fillRect(-10, -3, 4, 6);
            ctx.restore();
          } else {
            const radius = agent.role === 'recipient' ? 5 : 6;
            ctx.fillStyle = getRoleColor(agent.role);
            ctx.beginPath(); ctx.arc(ax, ay, radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath(); ctx.arc(ax - 1, ay - 1, radius * 0.4, 0, Math.PI * 2); ctx.fill();
          }
          ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

          // State indicators
          if (agent.state === 'working') {
            ctx.strokeStyle = 'rgba(34,211,238,0.5)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(ax, ay, 10 + Math.sin(frame * 0.1) * 2, 0, Math.PI * 2); ctx.stroke();
          } else if (agent.state === 'reporting') {
            ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(ax + 10, ay - 16, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center';
            ctx.shadowBlur = 0; ctx.fillText('!', ax + 10, ay - 14);
            ctx.shadowColor = 'transparent';
          } else if (agent.state === 'communicating' && agent.communicatingWithAgentId) {
            const target = agts.find(a => a.id === agent.communicatingWithAgentId);
            if (target && target.position.x !== 0) {
              const progress = (Math.sin(frame * 0.06) + 1) / 2;
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(ax, ay); ctx.lineTo(target.position.x, target.position.y);
              ctx.strokeStyle = 'rgba(167,139,250,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 6]); ctx.stroke();
              ctx.setLineDash([]);
              const dotX = ax + (target.position.x - ax) * progress;
              const dotY = ay + (target.position.y - ay) * progress;
              ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
              ctx.fillStyle = '#a78bfa'; ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 8; ctx.fill();
              ctx.restore();
              ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
            }
          }
        }
      }

      // 8. Vision ripple (Phase 5)
      if (phase === 5 && vis) {
        visionRipple.current += 1.2;
        const maxR = Math.sqrt(cw * cw + ch * ch);
        const r = visionRipple.current;
        if (r < maxR) {
          const a = Math.max(0, 1 - r / maxR) * 0.5;
          ctx.globalAlpha = a; ctx.strokeStyle = COLORS.visionPurple; ctx.lineWidth = 3;
          ctx.shadowColor = COLORS.visionPurple; ctx.shadowBlur = 20;
          ctx.beginPath(); ctx.ellipse(cw / 2, ch / 2, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
          if (r > 40) {
            ctx.globalAlpha = a * 0.5; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(cw / 2, ch / 2, r - 40, (r - 40) * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
        }
        // Vision text
        if (r > 100) {
          ctx.globalAlpha = Math.min(1, (r - 100) / 200) * 0.8;
          ctx.fillStyle = COLORS.visionPurple; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
          ctx.shadowColor = COLORS.visionPurple; ctx.shadowBlur = 20;
          ctx.fillText(`"${vis.statement}"`, cw / 2, 60);
          ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
        }
      }

      // 9. Scanlines
      ctx.globalAlpha = 0.03;
      for (let y = 0; y < ch; y += 3) { ctx.fillStyle = '#000'; ctx.fillRect(0, y, cw, 1); }
      ctx.globalAlpha = 1;

      // 10. Vignette
      const vig = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.3, cw / 2, ch / 2, cw * 0.8);
      vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, cw, ch);

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONCE — props are read from ref

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas ref={canvasRef} onClick={handleClick} className="absolute inset-0 w-full h-full cursor-pointer" />
    </div>
  );
};

export default CityCanvas;
