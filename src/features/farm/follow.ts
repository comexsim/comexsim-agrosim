import type { Object3D } from "three";

/**
 * El vehículo que la cámara sigue mientras se anima una decisión. Lo marca cada máquina visible
 * con `track`, y la escena se lo pasa al escenario: la cámara lo acompaña de cerca.
 */
export const followTarget: { current: Object3D | null } = { current: null };

/** Marca (o suelta) un vehículo como el que sigue la cámara. */
export function trackVehicle(vehicle: Object3D, active: boolean): void {
  if (active) followTarget.current = vehicle;
  else if (followTarget.current === vehicle) followTarget.current = null;
}
