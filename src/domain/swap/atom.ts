import { BigNumber, ethers } from 'ethers';
import { Atom, atom, useAtomValue } from 'jotai';
import { atomWithQuery } from 'jotai/query';
import { atomFamily, loadable } from 'jotai/utils';

import config from 'meta.config';
import { FetchBalanceResponseDto } from 'src/api/token';
import axiosInstance from 'src/config/axios';
import queryKeys, { ContextFromQueryKey } from 'src/query-key';
import { filterDecimal, removeDotExceptFirstOne } from 'src/utils/with-comma';
import { IERC20__factory } from 'types/ethers-contracts';

import { chainAtom, tokenListAtom } from '../chain/atom';
import { Chain, Token } from '../chain/types';

export const pageModeAtom = atom<'swap' | 'flash'>('swap');
export const tokenInAddressAtom = atom<string | undefined>(undefined);

export const balanceFetchKey = atom<number>(0);
export const balanceAtom = atomWithQuery(get => {
  return {
    queryKey: queryKeys.balance.metaMask(
      get(chainAtom),
      get(tokenInAddressAtom),
      get(balanceFetchKey),
    ),
    queryFn: async ({ queryKey }: ContextFromQueryKey<typeof queryKeys.balance.metaMask>) => {
      const [_, { address }] = queryKey;

      if (!address) {
        return BigNumber.from(0);
      }
      return getBalanceFromAddress(address);
    },
  };
});

export async function getBalanceFromAddress(tokenAddress: string) {
  try {
    const provider = new ethers.providers.Web3Provider(
      window.ethereum as unknown as ethers.providers.ExternalProvider,
    );
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    if (tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return provider.getBalance(address);
    }

    const erc20 = IERC20__factory.connect(tokenAddress as string, signer);
    return await erc20.balanceOf(address);
  } catch (e) {
    return BigNumber.from(0);
  }
}

export const balanceAtomFamily = atomFamily<string, Atom<string | 'need approve' | null>>(() =>
  atom(null),
);

export const targetCurrencyAtom = atom<'krw' | 'usd'>('usd');

export const targetCurrencyInUSDCAtom = atomWithQuery(get => ({
  queryKey: queryKeys.currency.byCoinId(
    config.chain.metaData[get(chainAtom)].apiEndpoint,
    'usd-coin',
    get(targetCurrencyAtom),
  ),
  queryFn: async ({ queryKey }: ContextFromQueryKey<typeof queryKeys.currency.byCoinId>) => {
    const [_, { endpoint, ...params }] = queryKey;

    const { data } = await axiosInstance.get<number>(`${endpoint}/css/currency`, {
      params,
    });

    return data;
  },
}));

export const tokenPriceListAtom = atomWithQuery(get => ({
  queryKey: queryKeys.balance.byAddress(config.chain.metaData[get(chainAtom)].apiEndpoint),
  queryFn: async ({ queryKey }: ContextFromQueryKey<typeof queryKeys.balance.byAddress>) => {
    const [_, { address, endpoint }] = queryKey;

    const { data } = await axiosInstance.get<FetchBalanceResponseDto>(
      `${endpoint}/v1/tokens/balance`,
      {
        params: { address },
      },
    );

    return data.result;
  },
}));

export const tokenOutAddressAtom = atom<string | undefined>(undefined);

export const tokenInAtom = atom<Token | undefined>(get => {
  if (!get(tokenInAddressAtom)) {
    return undefined;
  }

  const tokenList = get(tokenListAtom);
  const result = tokenList.find(x => x.address === get(tokenInAddressAtom));

  if (!result) {
    return tokenList[0];
  }

  return result;
});

export const tokenOutAtom = atom<Token | undefined>(get => {
  if (!get(tokenOutAddressAtom)) {
    return undefined;
  }

  const tokenList = get(tokenListAtom);
  const result = tokenList.find(({ address }) => address === get(tokenOutAddressAtom));

  if (!result) {
    return tokenList[1];
  }

  return result;
});

export const tokenInAmountStringAtom = atom<string>('');

export const tokenInAmountAtom = atom<number>(get => {
  return parseFloat(removeDotExceptFirstOne(filterDecimal(get(tokenInAmountStringAtom))));
});

export const slippageRatioAtom = atom<number>(1);

/**
 * TODO: currency 관련 로직들 파일 분리
 *
 */
export const useCurrency = (chain: Chain, tokenAddr?: string) => {
  const tokenPriceListLoadable = useAtomValue(loadable(tokenPriceListAtom));
  const tokenPriceList =
    tokenPriceListLoadable.state === 'hasData' ? tokenPriceListLoadable.data : undefined;

  const currency = useAtomValue(targetCurrencyAtom);
  const currencyLoadable = useAtomValue(loadable(targetCurrencyInUSDCAtom));
  const currencyInUSDC = currencyLoadable.state === 'hasData' ? currencyLoadable.data : undefined;

  const getPriceInUSDC = (tokenAddr: string) => {
    const metaData = config.chain.metaData[chain];
    const wrappedNavtiveTokenAddress = metaData.wrappedNativeToken;
    const nativeTokenAddress = metaData.nativeToken;
    return (
      tokenPriceList &&
      (tokenPriceList.find(x =>
        tokenAddr === wrappedNavtiveTokenAddress
          ? x.tokenAddress === nativeTokenAddress
          : x.tokenAddress === tokenAddr,
      )?.priceUsdc ??
        0)
    );
  };

  const priceInUSDC = tokenAddr ? getPriceInUSDC(tokenAddr) : undefined;

  const getPriceInCurrency = (tokenAddr: string) => {
    const priceInUSDC = getPriceInUSDC(tokenAddr);
    if (priceInUSDC && currencyInUSDC) {
      return priceInUSDC * currencyInUSDC;
    }

    return undefined;
  };

  const priceInCurrency = tokenAddr ? getPriceInCurrency(tokenAddr) : undefined;

  return {
    currency,
    getPriceInUSDC,
    getPriceInCurrency,
    priceInUSDC,
    priceInCurrency,
  };
};
