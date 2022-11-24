import { QueryFunctionContext } from '@tanstack/query-core';

import { Chain } from './domain/chain/types';
import { CrossContractGetQuoteRequestParams, GetQuoteRequestParams } from './types';

type CoinId = 'usd-coin';
type TargetCurrency = 'krw' | 'usd';
export type AxelarEndpoint = {
  chain: Chain;
  endpoint: string;
  from: string;
  to: string;
  fromSymbol: string;
  toSymbol: string;
  amount: string;
};

export type ContextFromQueryKey<QueryKeyFunc extends (...args: any[]) => readonly any[]> =
  QueryFunctionContext<ReturnType<QueryKeyFunc>>;

const queryKeys = {
  balance: {
    metaMask: (chain: Chain, address: string | undefined, balanceFetchKey: number) =>
      ['metamask', { chain, address, balanceFetchKey }] as const,
    byAddress: (endpoint: string, address?: string) => ['balance', { endpoint, address }] as const,
  },
  currency: {
    byCoinId: (endpoint: string, coinId: CoinId, targetCurrency: TargetCurrency) =>
      ['currency', { endpoint, coinId, targetCurrency }] as const,
  },
  quote: {
    calculate: (
      endpoint: string,
      params: GetQuoteRequestParams,
    ): [string, GetQuoteRequestParams & { endpoint: string }] => ['quote', { ...params, endpoint }],
    axelar: (endpoints: AxelarEndpoint[], params: CrossContractGetQuoteRequestParams) =>
      ['quote-axelar', { ...params, endpoints }] as const,
  },
};

export default queryKeys;
