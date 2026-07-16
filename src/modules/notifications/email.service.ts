import { Resend } from 'resend';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface EnviarReporteInput {
  to: string;
  clienteNombre: string;
  muestraCodigo: string;
  mineral: string;
  ley: string;
  reportePdfUrl: string;
}

export const EmailService = {
  async enviarReporte(data: EnviarReporteInput) {
    if (!resend) {
      throw AppError.conflict(
        'El envío de correos no está configurado en el servidor (falta RESEND_API_KEY).'
      );
    }

    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: data.to,
      subject: `Resultado de tu análisis — Muestra ${data.muestraCodigo}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color:#0a0b0d;">
          <div style="background:#0a0b0d; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color:#F2C94C; font-size: 20px; margin:0;">LABTECH MINERO</h1>
            <p style="color:#cfcfcf; font-size: 11px; margin: 4px 0 0;">Laboratorio de Análisis Mineralógico</p>
          </div>
          <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
            <p>Hola <strong>${data.clienteNombre}</strong>,</p>
            <p>El resultado del análisis de tu muestra <strong>${data.muestraCodigo}</strong> (${data.mineral}) ya está listo.</p>
            <div style="background:#faf6e8; border: 1px solid #F2C94C; border-radius: 10px; padding: 14px 18px; margin: 16px 0;">
              <p style="margin:0; font-size: 12px; color:#8f7419;">RESULTADO</p>
              <p style="margin:4px 0 0; font-size: 22px; font-weight: bold; color:#8f7419;">${data.ley}</p>
            </div>
            <p style="text-align:center; margin: 24px 0;">
              <a href="${data.reportePdfUrl}" style="background:#F2C94C; color:#0a0b0d; padding: 12px 24px; border-radius: 10px; text-decoration:none; font-weight:bold; font-size: 14px;">
                Descargar informe completo (PDF)
              </a>
            </p>
            <p style="color:#888; font-size: 11px; text-align:center;">LabTech Minero — Trujillo, La Libertad, Perú</p>
          </div>
        </div>
      `,
    });

    if (error) {
      throw AppError.conflict(`No se pudo enviar el correo: ${error.message}`);
    }
  },
};
