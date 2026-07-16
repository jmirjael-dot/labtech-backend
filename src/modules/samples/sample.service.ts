import { SampleStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { calcularPrecioMuestra } from '../../shared/constants/estados';
import { emitToDashboard, emitToCliente } from '../../config/socket';
import { transicionarEstado } from './sample.state-machine';
import type { CreateSampleInput, ListSamplesQuery } from './sample.schema';

async function generarCodigo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LTM-${year}-`;

  // Antes esto contaba cuántas muestras existían y le sumaba 1 — al borrar
  // una muestra del medio, el conteo bajaba y el siguiente código podía
  // chocar con uno que ya existía (violación de la restricción "único").
  // Ahora se basa en el número correlativo MÁS ALTO ya usado este año, así
  // que nunca retrocede aunque se hayan borrado muestras intermedias.
  const ultima = await prisma.sample.findFirst({
    where: { codigo: { startsWith: prefix } },
    orderBy: { codigo: 'desc' },
    select: { codigo: true },
  });

  const ultimoNumero = ultima ? parseInt(ultima.codigo.slice(prefix.length), 10) || 0 : 0;
  const correlativo = String(ultimoNumero + 1).padStart(6, '0');
  return `${prefix}${correlativo}`;
}

// 🎬 MODO DEMO: flujo completo de estados, en orden, usado solo por
// autoProgresarDemo() para saber cuál es "el siguiente paso" de cada muestra.
const FLUJO_DEMO: SampleStatus[] = [
  SampleStatus.PAGADO,
  SampleStatus.EN_COLA,
  SampleStatus.EN_LABORATORIO,
  SampleStatus.EN_ANALISIS,
  SampleStatus.CONTROL_CALIDAD,
  SampleStatus.TERMINADO,
  SampleStatus.ENTREGADO,
];

const LEY_DEMO: Record<string, () => string> = {
  ORO: () => (Math.random() * 8 + 1).toFixed(2) + ' g/t',
  PLATA: () => (Math.random() * 120 + 10).toFixed(1) + ' g/t',
  COBRE: () => (Math.random() * 3 + 0.2).toFixed(2) + ' %',
  PLOMO: () => (Math.random() * 2 + 0.1).toFixed(2) + ' %',
  ZINC: () => (Math.random() * 4 + 0.2).toFixed(2) + ' %',
  CARBON: () => (Math.random() * 20 + 60).toFixed(1) + ' % C fijo',
  ANTIMONIO: () => (Math.random() * 1.5 + 0.1).toFixed(2) + ' %',
};

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

  /**
   * Elimina una muestra. Solo se permite mientras sigue PENDIENTE_PAGO —
   * una vez que hay un pago real (aunque sea "en revisión"), ya no se
   * puede borrar, para no perder trazabilidad de facturación.
   */
  async remove(id: string, requesterId: string, requesterIsStaff: boolean) {
    const sample = await prisma.sample.findUnique({ where: { id }, include: { payment: true } });
    if (!sample) throw AppError.notFound('Muestra no encontrada');

    if (!requesterIsStaff && sample.clienteId !== requesterId) {
      throw AppError.forbidden('No tienes acceso a esta muestra');
    }

    if (sample.estado !== SampleStatus.PENDIENTE_PAGO || sample.payment) {
      throw AppError.conflict('Solo se pueden eliminar muestras que aún no han sido pagadas ni tienen un comprobante subido');
    }

    await prisma.sample.delete({ where: { id } });

    emitToDashboard('sample:deleted', { id });
    emitToCliente(sample.clienteId, 'sample:deleted', { id });

    return true;
  },

  /**
   * 🎬 MODO DEMO — avanza automáticamente las muestras que ya están pagadas,
   * simulando el trabajo del laboratorio sin necesitar que un staff mueva
   * cada una a mano. Se llama periódicamente desde server.ts.
   */
  async autoProgresarDemo() {
    const samples = await prisma.sample.findMany({
      where: { estado: { in: FLUJO_DEMO.slice(0, -1) } },
    });

    for (const sample of samples) {
      if (Math.random() >= 0.4) continue;

      const idx = FLUJO_DEMO.indexOf(sample.estado);
      if (idx === -1 || idx >= FLUJO_DEMO.length - 1) continue;
      const siguiente = FLUJO_DEMO[idx + 1];

      const updated = await transicionarEstado({
        sampleId: sample.id,
        estadoNuevo: siguiente,
        nota: 'Avance automático (modo demo)',
      });

      if (siguiente === SampleStatus.TERMINADO) {
        const yaExiste = await prisma.result.findUnique({ where: { sampleId: sample.id } });
        if (!yaExiste) {
          const generador = LEY_DEMO[sample.mineral] || (() => (Math.random() * 10).toFixed(2));
          await prisma.result.create({
            data: {
              sampleId: sample.id,
              ley: generador(),
              metodo: sample.tipoMineral === 'SULFURO' ? 'Fire Assay + AAS' : 'Digestión ácida + AAS',
              laboratorista: 'Lab. LabTech Minero - Trujillo',
            },
          });
        }
      }

      emitToDashboard('sample:status-updated', updated);
      emitToCliente(updated.clienteId, 'sample:status-updated', updated);
      if (siguiente === SampleStatus.ENTREGADO) {
        emitToCliente(updated.clienteId, 'result:ready', updated);
      }
    }
  },
};