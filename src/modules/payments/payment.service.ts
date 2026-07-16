import { PaymentMethod, PaymentStatus, SampleStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { emitToDashboard, emitToCliente } from '../../config/socket';
import { StorageService } from '../uploads/upload.service';
import { transicionarEstado } from '../samples/sample.state-machine';
import { CulqiProvider } from './providers/culqi.provider';
import { YapeProvider } from './providers/yape.provider';
import { BcpProvider } from './providers/bcp.provider';
import { InvoiceService } from '../invoices/invoice.service';
import type { InitiatePaymentInput } from './payment.schema';

export const PaymentService = {
  /**
   * Crea (o recupera) el registro de pago de una muestra y devuelve la
   * información necesaria para que la PWA muestre el paso de cobro
   * correspondiente (QR de Yape, cuenta BCP, o resultado del cargo Culqi).
   */
  async initiate(sampleId: string, clienteId: string, input: InitiatePaymentInput) {
    const sample = await prisma.sample.findUnique({ where: { id: sampleId }, include: { cliente: true } });
    if (!sample) throw AppError.notFound('Muestra no encontrada');
    if (sample.clienteId !== clienteId) throw AppError.forbidden('Esta muestra no te pertenece');
    if (sample.estado !== SampleStatus.PENDIENTE_PAGO) {
      throw AppError.conflict('Esta muestra ya no está pendiente de pago');
    }

    let payment = await prisma.payment.findUnique({ where: { sampleId } });

    // Pago con tarjeta vía Culqi: se procesa de inmediato
    if (input.metodo === PaymentMethod.CULQI) {
      if (!input.culqiTokenId) throw AppError.badRequest('culqiTokenId es requerido para pagos con tarjeta');

      const charge = await CulqiProvider.charge({
        amountSoles: Number(sample.precio),
        tokenId: input.culqiTokenId,
        email: sample.cliente.email,
        description: `LabTech Minero — Muestra ${sample.codigo}`,
      });

      payment = await prisma.payment.upsert({
        where: { sampleId },
        create: {
          sampleId,
          monto: sample.precio,
          metodo: PaymentMethod.CULQI,
          estado: PaymentStatus.APROBADO,
          proveedorRef: charge.chargeId,
          metadata: charge.raw as any,
          pagadoAt: new Date(),
        },
        update: {
          estado: PaymentStatus.APROBADO,
          proveedorRef: charge.chargeId,
          metadata: charge.raw as any,
          pagadoAt: new Date(),
        },
      });

      await this._aprobarYAvanzarMuestra(sampleId);
      return { payment, gateway: 'culqi' as const };
    }

    // Yape / Transferencia: se crea el registro en PENDIENTE y se espera comprobante
    payment = await prisma.payment.upsert({
      where: { sampleId },
      create: { sampleId, monto: sample.precio, metodo: input.metodo, estado: PaymentStatus.PENDIENTE },
      update: { metodo: input.metodo, estado: PaymentStatus.PENDIENTE },
    });

    const gatewayInfo =
      input.metodo === PaymentMethod.YAPE_BUSINESS ? YapeProvider.getChargeInfo() : BcpProvider.getAccountInfo();

    return { payment, gateway: input.metodo.toLowerCase() as 'yape_business' | 'transferencia_bcp', gatewayInfo };
  },

  /** Cliente sube la captura del pago (Yape/transferencia) → pasa a EN_REVISION. */
  async uploadComprobante(sampleId: string, clienteId: string, file: Express.Multer.File) {
    const payment = await prisma.payment.findUnique({ where: { sampleId } });
    if (!payment) throw AppError.notFound('No existe un pago iniciado para esta muestra');

    const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
    if (!sample || sample.clienteId !== clienteId) throw AppError.forbidden('Esta muestra no te pertenece');

    const stored = await StorageService.saveBuffer(file.buffer, file.originalname, 'comprobantes');

    const updated = await prisma.payment.update({
      where: { sampleId },
      data: { comprobanteUrl: stored.url, estado: PaymentStatus.EN_REVISION },
    });

    emitToDashboard('payment:comprobante-uploaded', updated);
    return updated;
  },

  /** Staff aprueba o rechaza un pago en revisión (Yape/transferencia). */
  async validate(
    paymentId: string,
    staffId: string,
    estado: (typeof PaymentStatus)['APROBADO'] | (typeof PaymentStatus)['RECHAZADO'],
    nota?: string
  ) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw AppError.notFound('Pago no encontrado');

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        estado,
        validadoPorId: staffId,
        pagadoAt: estado === PaymentStatus.APROBADO ? new Date() : payment.pagadoAt,
        metadata: nota ? { ...(payment.metadata as any), notaValidacion: nota } : payment.metadata,
      },
    });

    if (estado === PaymentStatus.APROBADO) {
      await this._aprobarYAvanzarMuestra(payment.sampleId);
    } else {
      emitToDashboard('payment:rejected', updated);
    }

    return updated;
  },

  async getBySample(sampleId: string) {
    const payment = await prisma.payment.findUnique({ where: { sampleId } });
    if (!payment) throw AppError.notFound('Pago no encontrado para esta muestra');
    return payment;
  },

  /** Avanza la muestra a PAGADO, genera la boleta y notifica en tiempo real. */
  async _aprobarYAvanzarMuestra(sampleId: string) {
    const sample = await transicionarEstado({
      sampleId,
      estadoNuevo: SampleStatus.PAGADO,
      nota: 'Pago validado',
    });

    await InvoiceService.generarBoleta(sampleId);

    emitToDashboard('payment:approved', sample);
    emitToCliente(sample.clienteId, 'payment:approved', sample);
    return sample;
  },
};
