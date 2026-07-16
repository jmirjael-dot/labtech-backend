import PDFDocument from 'pdfkit';
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

function buildReportPdf(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Encabezado
    doc
      .fontSize(20)
      .fillColor('#0a0b0d')
      .text('LabTech Minero', { continued: false })
      .fontSize(10)
      .fillColor('#666')
      .text('Laboratorio de Análisis Mineralógico — Trujillo, La Libertad, Perú')
      .moveDown(0.5);

    doc
      .fontSize(15)
      .fillColor('#C9A227')
      .text('INFORME DE RESULTADOS DE ANÁLISIS', { align: 'left' })
      .moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke().moveDown(1);

    // Datos generales
    const row = (label: string, value: string) => {
      doc
        .fontSize(10)
        .fillColor('#666')
        .text(label, 50, doc.y, { continued: true, width: 150 })
        .fillColor('#0a0b0d')
        .text(value);
    };

    row('Código de muestra:', data.muestraCodigo);
    row('Cliente:', data.clienteNombre);
    row('RUC / DNI:', data.clienteDocumento);
    row('Tipo de mineral:', data.tipoMineral);
    row('Mineral analizado:', data.mineral);
    row('Descripción:', data.descripcion);
    row('Fecha de emisión:', data.emitidoAt.toLocaleDateString('es-PE'));

    doc.moveDown(1.2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke().moveDown(1);

    // Resultado destacado
    doc.fontSize(12).fillColor('#0a0b0d').text('RESULTADO', { underline: false }).moveDown(0.4);
    doc
      .roundedRect(50, doc.y, 495, 60, 6)
      .fillAndStroke('#faf6e8', '#C9A227');
    doc
      .fillColor('#0a0b0d')
      .fontSize(10)
      .text('Ley obtenida', 65, doc.y - 48)
      .fontSize(22)
      .fillColor('#8f7419')
      .text(data.ley, 65, doc.y - 30);
    doc
      .fontSize(10)
      .fillColor('#0a0b0d')
      .text(`Método: ${data.metodo}`, 300, doc.y - 46, { width: 220 });

    doc.moveDown(3);
    row('Analista responsable:', data.laboratorista);
    if (data.observaciones) {
      doc.moveDown(0.6);
      doc.fontSize(10).fillColor('#666').text('Observaciones:');
      doc.fontSize(10).fillColor('#0a0b0d').text(data.observaciones, { width: 495 });
    }

    doc
      .moveDown(3)
      .fontSize(8)
      .fillColor('#999')
      .text(
        'Este informe es generado y firmado digitalmente por el sistema LabTech Minero. ' +
          'Los resultados corresponden exclusivamente a la muestra identificada arriba.',
        { align: 'center' }
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
