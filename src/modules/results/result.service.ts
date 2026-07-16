import { SampleStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { emitToDashboard, emitToCliente } from '../../config/socket';
import { transicionarEstado } from '../samples/sample.state-machine';
import { ReportService } from '../reports/report.service';
import { EmailService } from '../notifications/email.service';
import type { CreateResultInput } from './result.schema';

export const ResultService = {
  async create(sampleId: string, input: CreateResultInput) {
    const sample = await prisma.sample.findUnique({ where: { id: sampleId }, include: { cliente: true } });
    if (!sample) throw AppError.notFound('Muestra no encontrada');
    if (sample.estado !== SampleStatus.CONTROL_CALIDAD) {
      throw AppError.conflict(
        'Solo se puede registrar el resultado cuando la muestra está en Control de Calidad'
      );
    }

    const existing = await prisma.result.findUnique({ where: { sampleId } });
    if (existing) throw AppError.conflict('Esta muestra ya tiene un resultado registrado');

    const reportePdfUrl = await ReportService.generarReporte({
      muestraCodigo: sample.codigo,
      clienteNombre: sample.cliente.nombre,
      clienteDocumento: sample.cliente.documento,
      tipoMineral: sample.tipoMineral,
      mineral: sample.mineral,
      descripcion: sample.descripcion,
      ley: input.ley,
      metodo: input.metodo,
      laboratorista: input.laboratorista,
      observaciones: input.observaciones,
      emitidoAt: new Date(),
    });

    const result = await prisma.result.create({
      data: { sampleId, ...input, reportePdfUrl },
    });

    const updatedSample = await transicionarEstado({
      sampleId,
      estadoNuevo: SampleStatus.TERMINADO,
      nota: 'Resultado registrado por el laboratorista',
    });

    emitToDashboard('result:created', result);
    emitToDashboard('sample:status-updated', updatedSample);
    emitToCliente(sample.clienteId, 'result:ready', result);
    emitToCliente(sample.clienteId, 'sample:status-updated', updatedSample);

    return result;
  },

  async getBySample(sampleId: string, requesterId?: string, requesterIsStaff = false) {
    const result = await prisma.result.findUnique({
      where: { sampleId },
      include: { sample: true },
    });
    if (!result) throw AppError.notFound('Resultado no disponible aún para esta muestra');

    if (!requesterIsStaff && requesterId && result.sample.clienteId !== requesterId) {
      throw AppError.forbidden('No tienes acceso a este resultado');
    }
    return result;
  },

  /** Marca la muestra como ENTREGADO una vez el cliente confirma recepción o el staff cierra el ciclo. */
  async marcarEntregado(sampleId: string, staffId: string) {
    const updated = await transicionarEstado({
      sampleId,
      estadoNuevo: SampleStatus.ENTREGADO,
      cambiadoPor: staffId,
      nota: 'Resultados entregados al cliente',
    });

    emitToDashboard('sample:status-updated', updated);
    emitToCliente(updated.clienteId, 'sample:status-updated', updated);
    return updated;
  },

  /** Envía el PDF del informe al correo del cliente (solo staff). */
  async enviarPorEmail(sampleId: string) {
    const result = await prisma.result.findUnique({
      where: { sampleId },
      include: { sample: { include: { cliente: true } } },
    });
    if (!result) throw AppError.notFound('Resultado no disponible aún para esta muestra');
    if (!result.reportePdfUrl) throw AppError.conflict('Esta muestra todavía no tiene un PDF generado');

    await EmailService.enviarReporte({
      to: result.sample.cliente.email,
      clienteNombre: result.sample.cliente.nombre,
      muestraCodigo: result.sample.codigo,
      mineral: result.sample.mineral,
      ley: result.ley,
      reportePdfUrl: result.reportePdfUrl,
    });

    return { enviadoA: result.sample.cliente.email };
  },
};
