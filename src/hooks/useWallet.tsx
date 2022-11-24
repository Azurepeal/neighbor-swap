import { useCallback } from 'react';

import { atom, useAtom, useSetAtom } from 'jotai';
import { atomWithReducer } from 'jotai/utils';

import { keyMap } from 'src/constant/storage-key';
import { chainAtom } from 'src/domain/chain/atom';
import { balanceFetchKey } from 'src/domain/swap/atom';
import {
  TransactionParams,
  WalletExtension,
  WalletExtensionFactory,
  WALLET_TYPES,
} from 'src/utils/wallet';

interface WalletState {
  type?: ValueOf<typeof WALLET_TYPES>;
  address?: string;
  requestedWalletType?: ValueOf<typeof WALLET_TYPES>;
  walletExtension?: WalletExtension;
}

const initialWalletState: WalletState = {
  type: undefined,
  address: undefined,
  requestedWalletType: undefined,
  walletExtension: undefined,
};

export const wallStateAtom = atom(initialWalletState);

const CONNECT_WALLET_ACTION = '@wallet/connect';
interface ConnectWalletAction {
  type: typeof CONNECT_WALLET_ACTION;
  payload: {
    requestedWalletType: ValueOf<typeof WALLET_TYPES>;
  };
}

const CONNECT_WALLET_SUCCESS_ACTION = '@wallet/connect-success';
interface ConnectWalletSuccessAction {
  type: typeof CONNECT_WALLET_SUCCESS_ACTION;
  payload: WalletState;
}

/**
 * TODO: local storage에서 remove,
 * state에서 type, address 비우기
 */
const DISCONNECT_WALLET_ACTION = '@wallet/disconnect';
interface DisconnectWalletAction {
  type: typeof DISCONNECT_WALLET_ACTION;
}

type WalletAction = ConnectWalletAction | ConnectWalletSuccessAction | DisconnectWalletAction;

const walletReducer = (state = initialWalletState, action: WalletAction): WalletState => {
  switch (action.type) {
    case CONNECT_WALLET_ACTION:
      return {
        ...state,
        requestedWalletType: action.payload.requestedWalletType,
      };
    case CONNECT_WALLET_SUCCESS_ACTION:
      return { ...action.payload, requestedWalletType: undefined };
    case DISCONNECT_WALLET_ACTION:
      return initialWalletState;
    default:
      return state;
  }
};

export const wallReducerAtom = atomWithReducer(initialWalletState, walletReducer);

export const useWallet = () => {
  const [state, dispatch] = useAtom(wallReducerAtom);
  const updateFetchKey = useSetAtom(balanceFetchKey);
  const [chain, setChain] = useAtom(chainAtom);

  const connect = useCallback(
    async (requestWalletType: ValueOf<typeof WALLET_TYPES>) => {
      const walletExtensionFactory = new WalletExtensionFactory(requestWalletType);
      const walletExtension = walletExtensionFactory.createWalletExtension();

      if (!walletExtension) return null;

      const res = await walletExtension?.connect();

      if (!res) return null;

      const currentWalletChain = await walletExtension?.getCurrentChain();

      if (currentWalletChain) {
        setChain(currentWalletChain);
      }

      dispatch({ type: CONNECT_WALLET_SUCCESS_ACTION, payload: { ...res, walletExtension } });
      updateFetchKey(+new Date());

      if (typeof window.localStorage === undefined) return null;
      localStorage.setItem(keyMap.LAST_CONNECTED_WALLET_TYPE, res.type);

      return res;
    },
    [dispatch, chain, setChain],
  );

  const disconnect = useCallback(() => {
    dispatch({ type: DISCONNECT_WALLET_ACTION });
    if (typeof window.localStorage === undefined) return;
    localStorage.removeItem(keyMap.LAST_CONNECTED_WALLET_TYPE);
  }, [state]);

  const getBalance = useCallback(async () => {
    if (!state.address || !state.walletExtension) return;
    return state.walletExtension.getBalance(state.address);
  }, [state.type, state.address]);

  const sendTransaction = useCallback(
    (params: TransactionParams) => {
      if (!state.type || !state.address) return;

      const walletExtensionFactory = new WalletExtensionFactory(state.type);
      const walletExtension = walletExtensionFactory.createWalletExtension();

      if (!walletExtension) return;

      return walletExtension.sendTransaction({
        ...params,
        // maxPriorityFeePerGas: new Decimal('1.5e9').toHexadecimal(),
        // maxFeePerGas: new Decimal('2.75e10').toHexadecimal(),
      });
    },
    [state.address, state.type],
  );

  return { ...state, connect, disconnect, getBalance, sendTransaction };
};
