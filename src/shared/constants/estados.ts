import { SampleStatus, MineralType } from '@prisma/client';

/** Orden secuencial oficial del flujo de una muestra. */
export const SAMPLE_STATUS_FLOW: SampleStatus[] = [
  SampleStatus.PENDIENTE_PAGO,
  SampleStatus.PAGADO,
  SampleStatus.EN_COLA,
  SampleStatus.EN_LABORATORIO,
  SampleStatus.EN_ANALISIS,
  SampleStatus.CONTROL_CALIDAD,
  SampleStatus.TERMINADO,
  SampleStatus.ENTREGADO,
];

export const PRECIO_BASE_MUESTRA = 60; // S/
export const RECARGO_SULFURO = 15; // S/ adicional por análisis más complejo

export function calcularPrecioMuestra(tipoMineral: MineralType): number {
  return PRECIO_BASE_MUESTRA + (tipoMineral === MineralType.SULFURO ? RECARGO_SULFURO : 0);
}

/** Valida si una transición de estado es válida (solo se permite avanzar un paso, o quedarse). */
export function esTransicionValida(actual: SampleStatus, siguiente: SampleStatus): boolean {
  const idxActual = SAMPLE_STATUS_FLOW.indexOf(actual);
  const idxSiguiente = SAMPLE_STATUS_FLOW.indexOf(siguiente);
  return idxSiguiente === idxActual + 1;
}

export const IGV_PERCENT = 18;
