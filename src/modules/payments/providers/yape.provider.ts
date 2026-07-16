import { env } from '../../../config/env';

interface YapeChargeInfo {
  merchantNumber: string | null;
  qrImageUrl: string | null;
  instructions: string;
}

/**
 * Yape Business aún no expone una API pública de cargos directos para todos
 * los comercios; el flujo típico es: mostrar el QR/número comercial → el
 * cliente paga desde su app Yape → sube captura → el staff valida el
 * comprobante (o se concilia vía el webhook de Yape Business si el
 * comercio tiene esa integración habilitada).
 */
export const YapeProvider = {
  getChargeInfo(): YapeChargeInfo {
    return {
      merchantNumber: env.YAPE_BUSINESS_MERCHANT_ID ?? null,
      qrImageUrl: `${env.API_URL}/static/qr-yape-labtech.png`,
      instructions: 'Yapea el monto exacto y sube la captura del comprobante para validar tu pago.',
    };
  },

  /** Punto de extensión para cuando Yape Business habilite webhooks de confirmación. */
  async handleWebhook(payload: unknown) {
    // TODO: verificar firma del webhook y conciliar con el `proveedorRef` del Payment.
    return payload;
  },
};
