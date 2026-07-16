import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const smtpTransport =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: (env.SMTP_PORT || 587) === 465, // true solo para el puerto 465
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

interface EnviarReporteInput {
  to: string;
  clienteNombre: string;
  muestraCodigo: string;
  mineral: string;
  ley: string;
  reportePdfUrl: string;
}

function buildHtml(data: EnviarReporteInput): string {
  return `
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
  `;
}

export const EmailService = {
  async enviarReporte(data: EnviarReporteInput) {
    const subject = `Resultado de tu análisis — Muestra ${data.muestraCodigo}`;
    const html = buildHtml(data);

    if (env.EMAIL_DRIVER === 'smtp') {
      if (!smtpTransport) {
        throw AppError.conflict(
          'El envío por SMTP no está configurado (faltan SMTP_HOST, SMTP_USER o SMTP_PASS).'
        );
      }
      try {
        await smtpTransport.sendMail({ from: env.EMAIL_FROM, to: data.to, subject, html });
      } catch (err) {
        throw AppError.conflict(`No se pudo enviar el correo por SMTP: ${(err as Error).message}`);
      }
      return;
    }

    // Driver por defecto: Resend
    if (!resend) {
      throw AppError.conflict(
        'El envío de correos no está configurado en el servidor (falta RESEND_API_KEY).'
      );
    }
    const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to: data.to, subject, html });
    if (error) {
      throw AppError.conflict(`No se pudo enviar el correo: ${error.message}`);
    }
  },
};