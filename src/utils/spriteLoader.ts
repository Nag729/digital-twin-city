// Sprite loader — static imports for Vite bundling

import buildingDeliveryHub from '../assets/sprites/building-delivery-hub.png';
import buildingReceiveStation from '../assets/sprites/building-receive-station.png';
import buildingSortCenter from '../assets/sprites/building-sort-center.png';
import buildingWarehouse from '../assets/sprites/building-warehouse.png';
import recipientReceiving from '../assets/sprites/recipient-receiving.png';
import recipientWaiting from '../assets/sprites/recipient-waiting.png';
import sorterWalking from '../assets/sprites/sorter-walking.png';
import sorterWorking from '../assets/sprites/sorter-working.png';
import truckMoving from '../assets/sprites/truck-moving.png';
import truckStopped from '../assets/sprites/truck-stopped.png';
import workerWalking from '../assets/sprites/worker-walking.png';
import workerWorking from '../assets/sprites/worker-working.png';

export type SpriteKey =
  | 'truck-moving'
  | 'truck-stopped'
  | 'worker-walking'
  | 'worker-working'
  | 'sorter-walking'
  | 'sorter-working'
  | 'recipient-waiting'
  | 'recipient-receiving'
  | 'building-warehouse'
  | 'building-sort-center'
  | 'building-delivery-hub'
  | 'building-receive-station';

const SPRITE_URLS: Record<SpriteKey, string> = {
  'truck-moving': truckMoving,
  'truck-stopped': truckStopped,
  'worker-walking': workerWalking,
  'worker-working': workerWorking,
  'sorter-walking': sorterWalking,
  'sorter-working': sorterWorking,
  'recipient-waiting': recipientWaiting,
  'recipient-receiving': recipientReceiving,
  'building-warehouse': buildingWarehouse,
  'building-sort-center': buildingSortCenter,
  'building-delivery-hub': buildingDeliveryHub,
  'building-receive-station': buildingReceiveStation,
};

export async function loadSprites(): Promise<Map<SpriteKey, HTMLImageElement>> {
  const map = new Map<SpriteKey, HTMLImageElement>();
  const entries = Object.entries(SPRITE_URLS) as [SpriteKey, string][];

  await Promise.all(
    entries.map(
      ([key, url]) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            map.set(key, img);
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to load sprite: ${key}`);
            resolve();
          };
          img.src = url;
        }),
    ),
  );

  return map;
}

// Helper: get the sprite key for an agent based on role + state
export function getAgentSpriteKey(role: string, state: string): SpriteKey {
  switch (role) {
    case 'delivery_driver':
      return state === 'moving' ? 'truck-moving' : 'truck-stopped';
    case 'warehouse_worker':
      return state === 'working' || state === 'reporting' ? 'worker-working' : 'worker-walking';
    case 'sort_operator':
      return state === 'working' || state === 'reporting' ? 'sorter-working' : 'sorter-walking';
    case 'recipient':
      return state === 'working' ? 'recipient-receiving' : 'recipient-waiting';
    default:
      return 'worker-walking';
  }
}

// Helper: get the sprite key for a building type
export function getBuildingSpriteKey(buildingType: string): SpriteKey {
  switch (buildingType) {
    case 'warehouse':
      return 'building-warehouse';
    case 'sort_center':
      return 'building-sort-center';
    case 'delivery_hub':
      return 'building-delivery-hub';
    case 'receive_station':
      return 'building-receive-station';
    default:
      return 'building-warehouse';
  }
}
