import PDFDocument from 'pdfkit';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { StorageService } from '../uploads/upload.service';
import { IGV_PERCENT } from '../../shared/constants/estados';

async function generarNumero(): Promise<string> {
  const count = await prisma.invoice.count();
  const correlativo = String(count + 1).padStart(6, '0');
  return `${env.INVOICE_SERIES_BOLETA}-${correlativo}`;
}

function buildPdfBuffer(data: {
  numero: string;
  clienteNombre: string;
  clienteDocumento: string;
  muestraCodigo: string;
  descripcion: string;
  subtotal: number;
  igv: number;
  total: number;
  fecha: Date;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fontSize(18)
      .fillColor('#0a0b0d')
      .text('LabTech Minero SAC', { continued: false })
      .fontSize(9)
      .fillColor('#555')
      .text('Laboratorio de análisis mineralógico — Trujillo, La Libertad, Perú')
      .moveDown(1);

    doc
      .fontSize(13)
      .fillColor('#C9A227')
      .text(`BOLETA DE VENTA ELECTRÓNICA ${data.numero}`, { align: 'right' })
      .fontSize(9)
      .fillColor('#555')
      .text(data.fecha.toLocaleDateString('es-PE'), { align: 'right' })
      .moveDown(1.2);

    doc.moveTo(40, doc.y).lineTo(410, doc.y).strokeColor('#ddd').stroke().moveDown(0.8);

    doc
      .fontSize(10)
      .fillColor('#0a0b0d')
      .text(`Cliente: ${data.clienteNombre}`)
      .text(`RUC/DNI: ${data.clienteDocumento}`)
      .text(`Muestra: ${data.muestraCodigo}`)
      .moveDown(1);

    doc.fontSize(10).text(data.descripcion).moveDown(1.2);

    doc.moveTo(40, doc.y).lineTo(410, doc.y).strokeColor('#ddd').stroke().moveDown(0.8);

    doc
      .fontSize(10)
      .text(`Subtotal: S/ ${data.subtotal.toFixed(2)}`, { align: 'right' })
      .text(`IGV (${IGV_PERCENT}%): S/ ${data.igv.toFixed(2)}`, { align: 'right' })
      .fontSize(13)
      .fillColor('#C9A227')
      .text(`TOTAL: S/ ${data.total.toFixed(2)}`, { align: 'right' });

    doc
      .moveDown(2)
      .fontSize(8)
      .fillColor('#999')
      .text('Documento generado automáticamente por el sistema LabTech Minero.', { align: 'center' });

    doc.end();
  });
}

export const InvoiceService = {
  async generarBoleta(sampleId: string) {
    const existing = await prisma.invoice.findUnique({ where: { sampleId } });
    if (existing) return existing;

    const sample = await prisma.sample.findUniqueOrThrow({
      where: { id: sampleId },
      include: { cliente: true },
    });

    const subtotal = Number(sample.precio) / (1 + IGV_PERCENT / 100);
    const igv = Number(sample.precio) - subtotal;
    const numero = await generarNumero();

    const pdfBuffer = await buildPdfBuffer({
      numero,
      clienteNombre: sample.cliente.nombre,
      clienteDocumento: sample.cliente.documento,
      muestraCodigo: sample.codigo,
      descripcion: `Análisis de ${sample.mineral.toLowerCase()} (${sample.tipoMineral.toLowerCase()}) — ${sample.descripcion}`,
      subtotal,
      igv,
      total: Number(sample.precio),
      fecha: new Date(),
    });

    const stored = await StorageService.saveBuffer(pdfBuffer, `${numero}.pdf`, 'boletas');

    return prisma.invoice.create({
      data: {
        numero,
        sampleId: sample.id,
        clienteId: sample.clienteId,
        subtotal,
        igv,
        total: Number(sample.precio),
        pdfUrl: stored.url,
      },
    });
  },

  async getBySample(sampleId: string) {
    return prisma.invoice.findUnique({ where: { sampleId } });
  },
};
