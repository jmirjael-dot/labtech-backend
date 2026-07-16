import { SampleStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { SAMPLE_STATUS_FLOW, esTransicionValida } from '../../shared/constants/estados';

/**
 * Aplica una transición de estado sobre una muestra dentro de una transacción,
 * validando que sea el siguiente paso del flujo y dejando registro en
 * `sample_status_history` para trazabilidad (auditoría de laboratorio).
 */
export async function transicionarEstado(params: {
  sampleId: string;
  estadoNuevo: SampleStatus;
  cambiadoPor?: string;
  nota?: string;
  /** Permite forzar (uso solo por ADMIN, ej. corregir un error de captura). */
  forzar?: boolean;
}) {
  const { sampleId, estadoNuevo, cambiadoPor, nota, forzar = false } = params;

  return prisma.$transaction(async (tx) => {
    const sample = await tx.sample.findUnique({ where: { id: sampleId } });
    if (!sample) throw AppError.notFound('Muestra no encontrada');

    if (!forzar && !esTransicionValida(sample.estado, estadoNuevo)) {
      throw AppError.conflict(
        `Transición inválida: no se puede pasar de "${sample.estado}" a "${estadoNuevo}". ` +
          `El flujo esperado es: ${SAMPLE_STATUS_FLOW.join(' → ')}`
      );
    }

    const updated = await tx.sample.update({
      where: { id: sampleId },
      data: { estado: estadoNuevo },
    });

    await tx.sampleStatusHistory.create({
      data: {
        sampleId,
        estadoPrevio: sample.estado,
        estadoNuevo,
        cambiadoPor,
        nota,
      },
    });

    return updated;
  });
}
