import { env } from '../../../config/env';

interface BcpAccountInfo {
  accountNumber: string;
  cci: string;
  accountHolder: string;
}

export const BcpProvider = {
  getAccountInfo(): BcpAccountInfo {
    return {
      accountNumber: env.BCP_ACCOUNT_NUMBER ?? '',
      cci: env.BCP_CCI ?? '',
      accountHolder: env.BCP_ACCOUNT_HOLDER ?? 'LabTech Minero SAC',
    };
  },
};
