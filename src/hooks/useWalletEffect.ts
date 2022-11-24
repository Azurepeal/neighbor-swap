import { useEffect } from 'react';

import { useAtom } from 'jotai';

import { keyMap } from 'src/constant/storage-key';
import { chainAtom } from 'src/domain/chain/atom';
import { WALLET_TYPES } from 'src/utils/wallet';

import { useWallet } from './useWallet';

function useWalletEffect() {
  const { connect, walletExtension } = useWallet();
  const [chain, setChain] = useAtom(chainAtom);

  useEffect(() => {
    if (typeof window.localStorage === undefined) return;
    const lastConnectedWalletType = localStorage.getItem(keyMap.LAST_CONNECTED_WALLET_TYPE);

    if (!lastConnectedWalletType) return;
    connect(lastConnectedWalletType as ValueOf<typeof WALLET_TYPES>);
  }, []);

  useEffect(() => {
    const setChainFromMetaMask = async () => {
      if (walletExtension) {
        const currentWalletChain = await walletExtension.getCurrentChain();
        if (currentWalletChain !== chain && currentWalletChain) {
          setChain(currentWalletChain);
        }
      }
    };
    if (!window.ethereum) return;
    window.ethereum.on('chainChanged', setChainFromMetaMask);

    return () => {
      if (!window.ethereum) return;
      window.ethereum.removeListener('chainChanged', setChainFromMetaMask);
    };
  }, [walletExtension, chain]);
}

export default useWalletEffect;
