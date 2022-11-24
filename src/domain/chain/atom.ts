import { atom } from 'jotai';

import config from 'meta.config';
import auroraTokenList from 'src/constant/token-list/near.json';

import { tokenInAddressAtom, tokenOutAddressAtom } from '../swap/atom';
import { Chain, Token } from './types';

export const tokenListMap: Record<Chain, Token[]> = {
  aurora: auroraTokenList.result
};

export const chainList: Chain[] = config.chain.chainList;

export const defaultChain: Chain = config.chain.defaultChain;

export const defaultTokenList: Token[] = tokenListMap[defaultChain];

const chainPrimitiveAtom = atom<Chain>(defaultChain);

export const chainAtom = atom<Chain, Chain>(
  get => get(chainPrimitiveAtom),
  (_, set, newChain) => {
    set(chainPrimitiveAtom, newChain);

    const updateList = tokenListMap[newChain];

    if (updateList.length > 1) {
      set(tokenInAddressAtom, updateList[0].address);
      set(tokenOutAddressAtom, updateList[1].address);
    }
  },
);

export const tokenListAtom = atom<Token[]>(get => {
  const chain = get(chainAtom);
  return tokenListMap[chain];
});
