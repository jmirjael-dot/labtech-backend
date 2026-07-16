import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { StorageService } from '../uploads/upload.service';

interface ReportData {
  muestraCodigo: string;
  clienteNombre: string;
  clienteDocumento: string;
  tipoMineral: string;
  mineral: string;
  descripcion: string;
  ley: string;
  metodo: string;
  laboratorista: string;
  observaciones?: string | null;
  emitidoAt: Date;
}

const GOLD = '#C9A227';
const INK = '#0a0b0d';
const MUTED = '#666666';
const LINE = '#dddddd';
const PAGE_WIDTH = 495; // A4 con margen de 50pt a cada lado (595 - 100)

async function buildReportPdf(data: ReportData): Promise<Buffer> {
  // QR de verificación: apunta al código de la muestra (útil para escanear
  // desde el papel impreso y confirmar el informe contra el sistema).
  const qrDataUrl = await QRCode.toDataURL(`LabTech Minero — Informe ${data.muestraCodigo}`, {
    margin: 0,
    width: 200,
  });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ---- Encabezado / membrete ----
    doc.rect(0, 0, doc.page.width, 90).fill(INK);
    doc.fillColor('#ffffff').fontSize(20).text('LABTECH MINERO', 50, 28, { characterSpacing: 1 });
    doc.fontSize(9).fillColor(GOLD).text('LABORATORIO DE ANÁLISIS MINERALÓGICO', 50, 52);
    doc.fontSize(8).fillColor('#cfcfcf').text('Trujillo, La Libertad, Perú  ·  contacto@labtechminero.pe', 50, 66);

    doc.y = 112;
    doc.fontSize(14).fillColor(INK).text(`INFORME DE ENSAYO — ${data.muestraCodigo}`, 50, 112);
    doc.moveDown(0.6);
    doc.moveTo(50, doc.y).lineTo(50 + PAGE_WIDTH, doc.y).strokeColor(LINE).stroke();
    doc.moveDown(1);

    // ---- Datos generales ----
    const row = (label: string, value: string, y: number) => {
      doc.fontSize(9).fillColor(MUTED).text(label, 50, y, { width: 150 });
      doc.fontSize(9).fillColor(INK).text(value, 205, y, { width: 340 });
    };

    let y = doc.y;
    row('Cliente', data.clienteNombre, y); y += 16;
    row('RUC / DNI', data.clienteDocumento, y); y += 16;
    row('Tipo de mineral', data.tipoMineral, y); y += 16;
    row('Mineral analizado', data.mineral, y); y += 16;
    row('Descripción de la muestra', data.descripcion, y); y += 16;
    row(
      'Fecha de emisión',
      data.emitidoAt.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }),
      y
    );
    y += 26;

    doc.y = y;
    doc.moveTo(50, doc.y).lineTo(50 + PAGE_WIDTH, doc.y).strokeColor(LINE).stroke();
    doc.moveDown(1.2);

    // ---- Tabla de resultado ----
    doc.fontSize(11).fillColor(INK).text('RESULTADO DEL ENSAYO', 50, doc.y);
    doc.moveDown(0.6);

    const tableTop = doc.y;
    const col1 = 50, col2 = 260, col3 = 400;
    doc.rect(50, tableTop, PAGE_WIDTH, 24).fill('#f4f4f4');
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .text('ELEMENTO / PARÁMETRO', col1 + 8, tableTop + 8)
      .text('MÉTODO', col2 + 8, tableTop + 8)
      .text('RESULTADO', col3 + 8, tableTop + 8);

    const rowTop = tableTop + 24;
    doc.rect(50, rowTop, PAGE_WIDTH, 38).fillAndStroke('#faf6e8', GOLD);
    doc.fillColor(INK).fontSize(11).text(data.mineral, col1 + 8, rowTop + 13, { width: 200 });
    doc.fontSize(9).fillColor(MUTED).text(data.metodo, col2 + 8, rowTop + 14, { width: 130 });
    doc.fontSize(15).fillColor('#8f7419').text(data.ley, col3 + 8, rowTop + 10, { width: 90 });

    doc.y = rowTop + 38 + 20;

    if (data.observaciones) {
      doc.fontSize(9).fillColor(MUTED).text('Observaciones:', 50, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor(INK).text(data.observaciones, 50, doc.y, { width: PAGE_WIDTH });
      doc.moveDown(1);
    }

    // ---- Firma + QR de verificación ----
    const footerY = Math.max(doc.y + 30, 640);
    doc.moveTo(50, footerY).lineTo(50 + PAGE_WIDTH, footerY).strokeColor(LINE).stroke();

    doc.image(qrBuffer, 50, footerY + 20, { width: 70 });
    doc.fontSize(7).fillColor(MUTED).text('Verifica este informe', 50, footerY + 94, { width: 70, align: 'center' });

    doc.fontSize(9).fillColor(INK).text(data.laboratorista, 250, footerY + 55, { width: 200, align: 'center' });
    doc.moveTo(250, footerY + 50).lineTo(450, footerY + 50).strokeColor(INK).stroke();
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text('Laboratorista responsable', 250, footerY + 65, { width: 200, align: 'center' });

    doc
      .fontSize(7)
      .fillColor('#999')
      .text(
        'Este informe es generado y firmado digitalmente por el sistema LabTech Minero. Los resultados ' +
          'corresponden exclusivamente a la muestra identificada arriba y no deben reproducirse parcialmente ' +
          'sin autorización.',
        50,
        footerY + 110,
        { width: PAGE_WIDTH, align: 'center' }
      );

    doc.end();
  });
}

export const ReportService = {
  async generarReporte(data: ReportData): Promise<string> {
    const buffer = await buildReportPdf(data);
    const stored = await StorageService.saveBuffer(buffer, `${data.muestraCodigo}-reporte.pdf`, 'reportes');
    return stored.url;
  },
};