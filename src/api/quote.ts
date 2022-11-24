import { QueryFunctionContext } from 'react-query';

import axiosInstance from 'src/config/axios';
import queryKeys, { AxelarEndpoint } from 'src/query-key';
import { ContextFromQueryKey } from 'src/query-key';
import { GetQuoteRequestParams, QuoteResponseDto } from 'src/types';

const makeQuoteRequest = async (
  endpoint: string,
  queryParams: GetQuoteRequestParams | undefined,
) => {
  const { data } = await axiosInstance.post<QuoteResponseDto>(`${endpoint}/v1/quote/calculate`, {
    options: queryParams,
    metaData: 'string',
  });

  const { error, ts, ...result } = data;

  return result;
};

export type FetchResult = Omit<QuoteResponseDto, 'ts' | 'error'> | undefined;
export type CrossChainFetchResult = Omit<QuoteResponseDto & AxelarEndpoint, 'ts' | 'error'>;

export const fetchQuote = async ({
  queryKey,
}: QueryFunctionContext<ReturnType<typeof queryKeys.quote.calculate>>): Promise<FetchResult> => {
  const [_key, { endpoint, ...queryParams }] = queryKey;

  if (!queryParams || queryParams.amount === '0') return;

  return await makeQuoteRequest(endpoint, queryParams);
};

export const fetchQuoteCrossChain = async ({
  queryKey,
}: ContextFromQueryKey<typeof queryKeys.quote.axelar>): Promise<CrossChainFetchResult[]> => {
  const [_key, { endpoints, ...queryParams }] = queryKey;

  return await Promise.all(
    endpoints.map(x => {
      const { endpoint, from, to, amount } = x;
      return makeQuoteRequest(endpoint, {
        ...queryParams,
        amount,
        tokenInAddr: from,
        tokenOutAddr: to,
      }).then(response => ({
        ...response,
        ...x,
      }));
    }),
  );

  // logger.log(JSON.stringify(responses.map(x => x.dexAgg.expectedAmountOut)));

  // const sorted = responses.sort((a, b) =>
  //   new Decimal(b.dexAgg.expectedAmountOut).comparedTo(a.dexAgg.expectedAmountOut),
  // );
};
