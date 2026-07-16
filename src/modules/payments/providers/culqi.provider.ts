import { env } from '../../../config/env';
import { AppError } from '../../../shared/errors/AppError';

const CULQI_API_URL = 'https://api.culqi.com/v2';

interface CulqiChargeParams {
  amountSoles: number;
  tokenId: string; // token generado en el frontend con Culqi.js
  email: string;
  description: string;
}

interface CulqiChargeResult {
  chargeId: string;
  raw: unknown;
}

/**
 * Integración con Culqi. El token de tarjeta se genera en el cliente
 * (Culqi.js) por seguridad — el backend nunca recibe el número de tarjeta.
 * https://docs.culqi.com/
 */
export const CulqiProvider = {
  async charge(params: CulqiChargeParams): Promise<CulqiChargeResult> {
    if (!env.CULQI_SECRET_KEY) {
      throw AppError.badRequest('Culqi no está configurado en este entorno (falta CULQI_SECRET_KEY)');
    }

    const response = await fetch(`${CULQI_API_URL}/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CULQI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(params.amountSoles * 100), // Culqi trabaja en céntimos
        currency_code: 'PEN',
        email: params.email,
        source_id: params.tokenId,
        description: params.description,
      }),
    });

    const data = (await response.json()) as Record<string, any>;

    if (!response.ok) {
      throw AppError.badRequest(data?.user_message ?? 'El cargo con Culqi fue rechazado', data);
    }

    return { chargeId: data.id, raw: data };
  },
};
