import React, { useRef, useEffect } from 'react';
import type { Building, Agent, PhaseNumber, Vision } from '../types';
import { MAP_COLS, MAP_ROWS, ROADS, gridToIso } from '../data/mockData';
import { loadSprites, getAgentSpriteKey, getBuildingSpriteKey } from '../utils/spriteLoader';
import type { SpriteKey } from '../utils/spriteLoader';

export interface CityCanvasProps {
  buildings: Building[];
  agents: Agent[];
  currentPhase: PhaseNumber;
  vision: Vision | null;
  elapsedTime: number;
  onBuildingClick?: (buildingId: string) => void;
  onAgentClick?: (agentId: string) => void;
}

// ─── Paper craft color palette ──────────────────────────────────
const COLORS = {
  bgTop: '#FFF8F0',
  bgBottom: '#F0F7FF',
  grid: 'rgba(180, 160, 140, 0.15)',
  roadBase: '#E8DBC8',
  roadLine: '#D4C4A8',
  labelBg: 'rgba(255, 255, 255, 0.9)',
  labelText: '#5D4E37',
  visionLavender: '#C4B5FD',
  confettiColors: ['#FF8FAB', '#6ECFB0', '#FFD93D', '#87CEEB', '#C4B5FD', '#FFCBA4'],
  skillBandColors: ['#6ECFB0', '#FF8FAB', '#C4B5FD'],
};

const BUILDING_SPRITE_SIZE: Record<string, { w: number; h: number }> = {
  warehouse: { w: 100, h: 80 },
  delivery_hub: { w: 80, h: 90 },
  sort_center: { w: 90, h: 80 },
  receive_station: { w: 64, h: 60 },
};

const AGENT_SPRITE_SIZE: Record<string, number> = {
  delivery_driver: 44,
  warehouse_worker: 34,
  sort_operator: 34,
  recipient: 30,
};

function getRoleColor(role: string): string {
  switch (role) {
    case 'warehouse_worker': return '#FFB347';
    case 'sort_operator': return '#FF8FAB';
    case 'delivery_driver': return '#6ECFB0';
    case 'recipient': return '#87CEEB';
    default: return '#8B7355';
  }
}

interface Confetti { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; rotation: number; rotSpeed: number; }
interface SkillBand { x: number; y: number; targetX: number; targetY: number; progress: number; speed: number; width: number; colorIndex: number; }
interface AgentTrail { x: number; y: number; alpha: number; }

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
  const spritesRef = useRef<Map<SpriteKey, HTMLImageElement>>(new Map());

  const propsRef = useRef({ buildings, agents, currentPhase, vision, elapsedTime });
  propsRef.current = { buildings, agents, currentPhase, vision, elapsedTime };

  const confetti = useRef<Confetti[]>([]);
  const skillBands = useRef<SkillBand[]>([]);
  const agentTrails = useRef<Map<string, AgentTrail[]>>(new Map());
  const frameCount = useRef(0);
  const visionRipple = useRef(0);
  const prevPhase = useRef(currentPhase);

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
    const dpr = window.devicePixelRatio || 1;
    const lx = mx / dpr;
    const ly = my / dpr;

    const { agents: currentAgents, buildings: currentBuildings } = propsRef.current;
    for (const agent of currentAgents) {
      const dist = Math.sqrt((lx - agent.position.x) ** 2 + (ly - agent.position.y) ** 2);
      if (dist < 22) { onAgentClick?.(agent.id); return; }
    }
    for (const b of currentBuildings) {
      const dims = BUILDING_SPRITE_SIZE[b.type] || BUILDING_SPRITE_SIZE.receive_station;
      const hw = dims.w / 2 + 10;
      const hh = dims.h + 10;
      if (lx > b.position.x - hw && lx < b.position.x + hw && ly > b.position.y - hh && ly < b.position.y + 10) {
        onBuildingClick?.(b.id); return;
      }
    }
  };

  // Single render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load sprites
    loadSprites().then((sprites) => {
      spritesRef.current = sprites;
    });

    // Init confetti particles
    for (let i = 0; i < 40; i++) {
      confetti.current.push({
        x: Math.random() * 1280, y: Math.random() * 800,
        vx: (Math.random() - 0.5) * 0.4, vy: 0.15 + Math.random() * 0.25,
        life: Math.random() * 300, maxLife: 300 + Math.random() * 200,
        size: 2 + Math.random() * 3,
        color: COLORS.confettiColors[Math.floor(Math.random() * COLORS.confettiColors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
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
      const sprites = spritesRef.current;

      // 1. Background — warm cream gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
      bgGrad.addColorStop(0, COLORS.bgTop);
      bgGrad.addColorStop(1, COLORS.bgBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cw, ch);

      // Paper texture noise overlay
      if (frame % 4 === 0) {
        ctx.globalAlpha = 0.015;
        for (let i = 0; i < 200; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#D4C4A8' : '#B8A590';
          ctx.fillRect(Math.random() * cw, Math.random() * ch, 1, 1);
        }
        ctx.globalAlpha = 1;
      }

      // 2. Grid — pencil-like dotted lines
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 6]);
      for (let col = 0; col <= MAP_COLS; col++) {
        const s = gridToIso(col, 0), e = gridToIso(col, MAP_ROWS);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      }
      for (let row = 0; row <= MAP_ROWS; row++) {
        const s = gridToIso(0, row), e = gridToIso(MAP_COLS, row);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      }
      ctx.setLineDash([]);

      // 3. Roads — craft paper beige
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
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Road center dashes
        ctx.strokeStyle = COLORS.roadLine;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < road.length; i++) {
          const p = gridToIso(road[i][0], road[i][1]);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Confetti particles (paper bits floating)
      const pts = confetti.current;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.x += p.vx + Math.sin(frame * 0.01 + i) * 0.15;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life++;
        if (p.life > p.maxLife || p.y > ch + 10) {
          pts[i] = {
            x: Math.random() * cw, y: -5,
            vx: (Math.random() - 0.5) * 0.4, vy: 0.15 + Math.random() * 0.25,
            life: 0, maxLife: 300 + Math.random() * 200,
            size: 2 + Math.random() * 3,
            color: COLORS.confettiColors[Math.floor(Math.random() * COLORS.confettiColors.length)],
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
          };
        }
        const lifeRatio = 1 - p.life / p.maxLife;
        const fadeAlpha = lifeRatio < 0.2 ? lifeRatio * 5 : lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1;
        ctx.globalAlpha = fadeAlpha * 0.35;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        // Draw a small rounded rectangle (paper bit)
        const hs = p.size / 2;
        ctx.beginPath();
        ctx.roundRect(-hs, -hs * 0.6, p.size, p.size * 0.6, 1);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // 5. Skill bands (Phase 3+) — pastel rainbow streaks
      if (phase >= 3) {
        const bands = skillBands.current;
        if (frame % 50 === 0 && bands.length < 6) {
          const edge = Math.floor(Math.random() * 4);
          let sx = 0, sy = 0;
          if (edge === 0) { sx = Math.random() * cw; sy = -10; }
          else if (edge === 1) { sx = cw + 10; sy = Math.random() * ch; }
          else if (edge === 2) { sx = Math.random() * cw; sy = ch + 10; }
          else { sx = -10; sy = Math.random() * ch; }
          bands.push({
            x: sx, y: sy,
            targetX: cw / 2 + (Math.random() - 0.5) * 300,
            targetY: ch / 2 + (Math.random() - 0.5) * 200,
            progress: 0,
            speed: 0.004 + Math.random() * 0.006,
            width: 2 + Math.random() * 2,
            colorIndex: Math.floor(Math.random() * COLORS.skillBandColors.length),
          });
        }
        for (let i = bands.length - 1; i >= 0; i--) {
          const band = bands[i];
          band.progress += band.speed;
          if (band.progress >= 1) { bands.splice(i, 1); continue; }
          const cx = band.x + (band.targetX - band.x) * band.progress;
          const cy = band.y + (band.targetY - band.y) * band.progress;
          const alpha = band.progress < 0.2 ? band.progress * 5 : band.progress > 0.8 ? (1 - band.progress) * 5 : 1;
          const bandColor = COLORS.skillBandColors[band.colorIndex];
          ctx.globalAlpha = alpha * 0.35;
          ctx.strokeStyle = bandColor;
          ctx.lineWidth = band.width;
          ctx.lineCap = 'round';
          const tailP = Math.max(0, band.progress - 0.12);
          ctx.beginPath();
          ctx.moveTo(band.x + (band.targetX - band.x) * tailP, band.y + (band.targetY - band.y) * tailP);
          ctx.lineTo(cx, cy);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // 6. Buildings (sort back-to-front)
      const sortedBlds = [...blds].sort((a, b) => a.position.y - b.position.y);
      for (const b of sortedBlds) {
        const bx = b.position.x;
        const by = b.position.y;
        const spriteKey = getBuildingSpriteKey(b.type);
        const sprite = sprites.get(spriteKey);
        const dims = BUILDING_SPRITE_SIZE[b.type] || BUILDING_SPRITE_SIZE.receive_station;

        // Soft ground shadow
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#8B7355';
        ctx.beginPath();
        ctx.ellipse(bx, by + 8, dims.w * 0.4, dims.h * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (sprite) {
          // Draw sprite
          ctx.drawImage(sprite, bx - dims.w / 2, by - dims.h + 10, dims.w, dims.h);
        } else {
          // Fallback: cute pastel building shape
          const hw = dims.w * 0.4;
          const hh = dims.h * 0.6;
          const typeColors: Record<string, string> = {
            warehouse: '#FFCBA4',
            sort_center: '#D8C4F5',
            delivery_hub: '#A8E6CF',
            receive_station: '#FFB3C6',
          };
          const bodyColor = typeColors[b.type] || '#E8DBC8';
          ctx.fillStyle = bodyColor;
          ctx.beginPath();
          ctx.roundRect(bx - hw, by - hh, hw * 2, hh, 6);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF80';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Roof
          ctx.fillStyle = '#FF8FAB80';
          ctx.beginPath();
          ctx.moveTo(bx - hw - 4, by - hh);
          ctx.lineTo(bx, by - hh - 14);
          ctx.lineTo(bx + hw + 4, by - hh);
          ctx.closePath();
          ctx.fill();
        }

        // Feedback indicator (Phase 3+)
        if (phase >= 3 && b.feedbacks.length > 0) {
          const hasBug = b.feedbacks.some(f => f.type === 'bug');
          const indicatorColor = hasBug ? '#FF6B6B' : '#87CEEB';
          const indicatorBg = hasBug ? '#FFF0F0' : '#F0F8FF';
          const pulseScale = 1 + Math.sin(frame * 0.06) * 0.1;
          ctx.save();
          ctx.translate(bx + dims.w * 0.3, by - dims.h + 5);
          ctx.scale(pulseScale, pulseScale);
          // Badge circle
          ctx.fillStyle = indicatorBg;
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = indicatorColor;
          ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 7px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(hasBug ? '!' : String(b.feedbacks.length), 0, 0);
          ctx.restore();
        }

        // Phase 4: upgrade indicator
        if (phase >= 4 && b.status === 'upgraded') {
          ctx.fillStyle = '#6ECFB0';
          ctx.font = '12px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('\u2B06', bx, by - dims.h - 2);
        }

        // Building name label (balloon style)
        ctx.save();
        const labelText = b.name;
        ctx.font = '9px system-ui';
        const labelW = ctx.measureText(labelText).width + 10;
        const labelX = bx - labelW / 2;
        const labelY = by + 14;
        ctx.fillStyle = COLORS.labelBg;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelW, 16, 8);
        ctx.fill();
        ctx.strokeStyle = '#F5E6D3';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.fillStyle = COLORS.labelText;
        ctx.textAlign = 'center';
        ctx.fillText(labelText, bx, labelY + 11);
        ctx.restore();
      }

      // 7. Agents
      if (phase >= 2) {
        for (const agent of agts) {
          const ax = agent.position.x, ay = agent.position.y;
          if (ax === 0 && ay === 0) continue;

          // Trails
          if (!agentTrails.current.has(agent.id)) agentTrails.current.set(agent.id, []);
          const trails = agentTrails.current.get(agent.id)!;
          if (agent.state === 'moving' && frame % 4 === 0) {
            trails.push({ x: ax, y: ay, alpha: 0.6 });
            if (trails.length > 8) trails.shift();
          }
          for (let t = trails.length - 1; t >= 0; t--) {
            trails[t].alpha -= 0.025;
            if (trails[t].alpha <= 0) { trails.splice(t, 1); continue; }
            ctx.globalAlpha = trails[t].alpha * 0.3;
            ctx.fillStyle = getRoleColor(agent.role);
            ctx.beginPath();
            ctx.arc(trails[t].x, trails[t].y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;

          // Ground shadow
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = '#5D4E37';
          ctx.beginPath();
          ctx.ellipse(ax, ay + 4, 10, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          // Draw agent sprite
          const spriteKey = getAgentSpriteKey(agent.role, agent.state);
          const sprite = sprites.get(spriteKey);
          const size = AGENT_SPRITE_SIZE[agent.role] || 32;

          if (sprite) {
            ctx.drawImage(sprite, ax - size / 2, ay - size + 4, size, size);
          } else {
            // Fallback: cute pastel circle character
            const roleColor = getRoleColor(agent.role);
            const radius = agent.role === 'delivery_driver' ? 8 : 6;
            // Body
            ctx.fillStyle = roleColor;
            ctx.beginPath(); ctx.arc(ax, ay - 4, radius, 0, Math.PI * 2); ctx.fill();
            // White outline
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Eye highlight
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.arc(ax - 1.5, ay - 5.5, radius * 0.25, 0, Math.PI * 2); ctx.fill();
          }

          // State indicators
          if (agent.state === 'working') {
            ctx.strokeStyle = `${getRoleColor(agent.role)}50`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(ax, ay - 4, 14 + Math.sin(frame * 0.08) * 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (agent.state === 'reporting') {
            // Cute speech bubble
            ctx.fillStyle = '#FFF0F0';
            ctx.beginPath();
            ctx.roundRect(ax + 8, ay - 28, 18, 14, 7);
            ctx.fill();
            ctx.strokeStyle = '#FF6B6B80';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#FF6B6B';
            ctx.font = 'bold 8px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('!', ax + 17, ay - 18);
          } else if (agent.state === 'communicating' && agent.communicatingWithAgentId) {
            const target = agts.find(a => a.id === agent.communicatingWithAgentId);
            if (target && target.position.x !== 0) {
              const progress = (Math.sin(frame * 0.06) + 1) / 2;
              ctx.save();
              // Dashed pink line
              ctx.beginPath();
              ctx.moveTo(ax, ay); ctx.lineTo(target.position.x, target.position.y);
              ctx.strokeStyle = '#FF8FAB40';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 6]);
              ctx.stroke();
              ctx.setLineDash([]);
              // Traveling dot
              const dotX = ax + (target.position.x - ax) * progress;
              const dotY = ay + (target.position.y - ay) * progress;
              ctx.beginPath();
              ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
              ctx.fillStyle = '#FF8FAB';
              ctx.fill();
              ctx.restore();
            }
          }
        }
      }

      // 8. Vision ripple (Phase 5) — soft lavender
      if (phase === 5 && vis) {
        visionRipple.current += 1.0;
        const maxR = Math.sqrt(cw * cw + ch * ch);
        const r = visionRipple.current;
        if (r < maxR) {
          const a = Math.max(0, 1 - r / maxR) * 0.25;
          ctx.globalAlpha = a;
          ctx.strokeStyle = COLORS.visionLavender;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(cw / 2, ch / 2, r, r * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();
          if (r > 40) {
            ctx.globalAlpha = a * 0.5;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(cw / 2, ch / 2, r - 40, (r - 40) * 0.55, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        // Vision text
        if (r > 100) {
          ctx.globalAlpha = Math.min(1, (r - 100) / 200) * 0.7;
          ctx.fillStyle = '#7C3AED';
          ctx.font = 'bold 15px system-ui';
          ctx.textAlign = 'center';
          // Text with white background
          const vText = `"${vis.statement}"`;
          const tw = ctx.measureText(vText).width + 24;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.roundRect(cw / 2 - tw / 2, 48, tw, 28, 14);
          ctx.fill();
          ctx.fillStyle = '#7C3AED';
          ctx.fillText(vText, cw / 2, 67);
          ctx.globalAlpha = 1;
        }
      }

      // NO scanlines, NO vignette — clean paper craft look

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas ref={canvasRef} onClick={handleClick} className="absolute inset-0 w-full h-full cursor-pointer" />
    </div>
  );
};

export default CityCanvas;
