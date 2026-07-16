import { SampleStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { calcularPrecioMuestra } from '../../shared/constants/estados';
import { emitToDashboard, emitToCliente } from '../../config/socket';
import { transicionarEstado } from './sample.state-machine';
import type { CreateSampleInput, ListSamplesQuery } from './sample.schema';

async function generarCodigo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.sample.count({
    where: { createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) } },
  });
  const correlativo = String(count + 1).padStart(6, '0');
  return `LTM-${year}-${correlativo}`;
}

export const SampleService = {
  async create(clienteId: string, input: CreateSampleInput) {
    const precio = calcularPrecioMuestra(input.tipoMineral);
    const codigo = await generarCodigo();

    const sample = await prisma.sample.create({
      data: {
        codigo,
        clienteId,
        tipoMineral: input.tipoMineral,
        mineral: input.mineral,
        descripcion: input.descripcion,
        observaciones: input.observaciones,
        precio,
        estado: SampleStatus.PENDIENTE_PAGO,
        statusHistory: {
          create: { estadoNuevo: SampleStatus.PENDIENTE_PAGO, nota: 'Muestra registrada por el cliente' },
        },
      },
    });

    emitToDashboard('sample:created', sample);
    return sample;
  },

  async listForClient(clienteId: string, query: ListSamplesQuery) {
    return this.list({ ...query, clienteId });
  },

  async list(query: ListSamplesQuery) {
    const { page, pageSize, estado, clienteId, search } = query;

    const where = {
      ...(estado ? { estado } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(search
        ? {
            OR: [
              { codigo: { contains: search, mode: 'insensitive' as const } },
              { descripcion: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.sample.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          cliente: { select: { id: true, nombre: true, documento: true, telefono: true } },
          payment: true,
          result: true,
        },
      }),
      prisma.sample.count({ where }),
    ]);

    return {
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async getById(id: string, requesterId?: string, requesterIsStaff = false) {
    const sample = await prisma.sample.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true, documento: true, telefono: true, email: true } },
        payment: true,
        result: true,
        invoice: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!sample) throw AppError.notFound('Muestra no encontrada');

    if (!requesterIsStaff && requesterId && sample.clienteId !== requesterId) {
      throw AppError.forbidden('No tienes acceso a esta muestra');
    }
    return sample;
  },

  async updateStatus(id: string, estado: SampleStatus, staffId: string, nota?: string) {
    const updated = await transicionarEstado({ sampleId: id, estadoNuevo: estado, cambiadoPor: staffId, nota });

    emitToDashboard('sample:status-updated', updated);
    emitToCliente(updated.clienteId, 'sample:status-updated', updated);

    return updated;
  },
};
