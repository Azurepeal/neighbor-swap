import { ErrorResponse } from 'src/types';

export interface FetchBalanceResponseDto {
  error?: ErrorResponse;
  ts: string;
  result: {
    tokenAddress: string;
    amount: string;
    priceUsdc: number;
  }[];
}

export type FetchCurrencyParams = {
  coinId: 'tether' | 'ethereum' | 'usd-coin';
  targetCurrency: 'krw' | 'usd';
};
