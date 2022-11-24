import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';

import { useQuery } from 'react-query';

import { ArrowUpDownIcon, RepeatIcon } from '@chakra-ui/icons';
import {
  Box,
  Divider,
  Flex,
  Heading,
  HStack,
  Button,
  IconButton,
  Tab,
  Tabs,
  TabList,
  useToast,
} from '@chakra-ui/react';
import Decimal from 'decimal.js';
import { BigNumber, ethers } from 'ethers';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useAtomCallback, useHydrateAtoms } from 'jotai/utils';

import config from 'meta.config';
import { fetchQuote } from 'src/api/quote';
import SlippageInput from 'src/components/SlippageInput';
import SwapPreviewResult from 'src/components/SwapPreviewResult';
import TokenAmountInput from 'src/components/TokenAmountInput';
import { keyMap } from 'src/constant/storage-key';
import { chainAtom, defaultTokenList, tokenListMap } from 'src/domain/chain/atom';
import { Token } from 'src/domain/chain/types';
import {
  balanceFetchKey,
  pageModeAtom,
  slippageRatioAtom,
  tokenInAddressAtom,
  tokenInAmountAtom,
  tokenInAmountStringAtom,
  tokenInAtom,
  tokenOutAddressAtom,
  tokenOutAtom,
} from 'src/domain/swap/atom';
import { useDebounce } from 'src/hooks/useDebounce';
import { useWallet } from 'src/hooks/useWallet';
import useWalletEffect from 'src/hooks/useWalletEffect';
import queryKeys from 'src/query-key';
import getBigNumberWithDecimals from 'src/utils/get-denom-big-number';
import { logger } from 'src/utils/logger';
import { removeDotExceptFirstOne } from 'src/utils/with-comma';
import { IERC20__factory, IWETH__factory } from 'types/ethers-contracts/factories';

import styles from './Swap.module.scss';

export const getServerSideProps: GetServerSideProps<{
  defaultTokenList: Token[];
}> = async context => {
  return { props: { defaultTokenList } };
};

const Swap = ({ defaultTokenList }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  useHydrateAtoms([
    [tokenInAddressAtom, defaultTokenList[0].address] as const,
    [tokenOutAddressAtom, defaultTokenList[1].address] as const,
  ]);
  useWalletEffect();

  const chain = useAtomValue(chainAtom);

  const [tokenInAddress, setTokenInAddress] = useAtom(tokenInAddressAtom);
  const [tokenOutAddress, setTokenOutAddress] = useAtom(tokenOutAddressAtom);

  const { address, sendTransaction, walletExtension } = useWallet();
  const toast = useToast();

  const selectedTokenIn = useAtomValue(tokenInAtom);
  const selectedTokenOut = useAtomValue(tokenOutAtom);

  const [tokenInAmountString, setTokenInAmountString] = useAtom(tokenInAmountStringAtom);
  const tokenInAmount = useAtomValue(tokenInAmountAtom);

  const [pageMode, setPageMode] = useAtom(pageModeAtom);

  const debouncedTokenInAmount = useDebounce(tokenInAmount, 200);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = e.target.value;
    const [integer] = value.split('.');
    if (integer && integer.length > 10) {
      return;
    }
    setTokenInAmountString(removeDotExceptFirstOne(value));
  };

  const [slippageRatio, setSlippageRatio] = useAtom(slippageRatioAtom);

  const updateFetchKey = useSetAtom(balanceFetchKey);

  const [isSwapLoading, setIsSwapLoading] = useState(false);
  const [needRefreshTimer, setNeedRefreshTimer] = useState(false);

  const { wrappedNativeToken, nativeToken } = config.chain.metaData[chain];

  const isNativeToWrappedNative =
    tokenInAddress === nativeToken && tokenOutAddress === wrappedNativeToken;
  const isWrappedNativeToNative =
    tokenInAddress === wrappedNativeToken && tokenOutAddress === nativeToken;

  const { data, isLoading, isRefetching, refetch, isError } = useQuery(
    queryKeys.quote.calculate(config.chain.metaData[chain].apiEndpoint, {
      tokenInAddr: selectedTokenIn!.address,
      tokenOutAddr: selectedTokenOut!.address,
      from: address!,
      amount: new Decimal(tokenInAmount).mul(Math.pow(10, selectedTokenIn!.decimals)).toFixed(),
      slippageBps: slippageRatio * 100,
      /**
       * constant
       */
      maxEdge: 4,
      /**
       * constant
       */
      maxSplit: 1,
      withCycle: pageMode === 'flash',
    }),
    fetchQuote,
    {
      enabled:
        Boolean(selectedTokenIn?.address && selectedTokenOut?.address && tokenInAmount) &&
        !isNativeToWrappedNative &&
        !isWrappedNativeToNative,
      refetchOnWindowFocus: false,
      onSettled: () => setNeedRefreshTimer(true),
      retry: 3,
    },
  );

  const handleClickReverse = useAtomCallback(
    useCallback(
      (get, set) => {
        const tokenInAddress = get(tokenInAddressAtom);
        const tokenOutAddress = get(tokenOutAddressAtom);

        set(tokenInAddressAtom, tokenOutAddress);
        set(tokenOutAddressAtom, tokenInAddress);
        set(tokenInAmountStringAtom, '0');
      },
      [chain],
    ),
  );

  const previewResult = useMemo(() => {
    if (!data || !selectedTokenOut || isError || !debouncedTokenInAmount) return null;
    if (isNativeToWrappedNative || isWrappedNativeToNative) return null;
    return data;
  }, [
    data,
    selectedTokenOut,
    isError,
    debouncedTokenInAmount,
    isNativeToWrappedNative,
    isWrappedNativeToNative,
  ]);

  useEffect(() => {
    if (!selectedTokenIn || !selectedTokenOut) return;

    localStorage.setItem(keyMap.SWAP_FROM_TOKEN, JSON.stringify(selectedTokenIn));
    localStorage.setItem(keyMap.SWAP_TO_TOKEN, JSON.stringify(selectedTokenOut));
  }, [selectedTokenIn, selectedTokenOut]);

  const tokenOutAmount: number = (() => {
    if (previewResult && selectedTokenOut) {
      return getBigNumberWithDecimals(
        previewResult.dexAgg.expectedAmountOut,
        -selectedTokenOut.decimals,
      ).toNumber();
    }
    if (isNativeToWrappedNative || isWrappedNativeToNative) return tokenInAmount;
    return 0;
  })();

  const isCTADisabled: boolean = (() => {
    if (isSwapLoading) return true;
    if (!address || pageMode === 'flash') return false;
    if (isNativeToWrappedNative || isWrappedNativeToNative) return false;
    return !Boolean(data?.metamaskSwapTransaction);
  })();

  const buttonText = pageMode === 'flash' ? 'Flash' : 'Swap';

  const handleClickSwap = async () => {
    if (!address || !tokenInAddress) return;

    const provider = new ethers.providers.Web3Provider(
      window.ethereum as unknown as ethers.providers.ExternalProvider,
    );

    walletExtension?.switchChain(chain);
    const signer = provider.getSigner();

    if (tokenInAddress !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      const erc20 = IERC20__factory.connect(tokenInAddress, signer);
      const allowance = await erc20.allowance(
        address,
        config.chain.metaData[chain].approveProxyAddress,
      );

      if (allowance.eq(0)) {
        try {
          const tx = await erc20.approve(
            config.chain.metaData[chain].approveProxyAddress,
            ethers.constants.MaxUint256,
          );
          const receipt = await tx.wait();

          if (receipt.status !== 1) {
            throw new Error('Approve failed');
          }
        } catch (e) {
          toast({
            title: 'Failed to send transaction',
            description: 'Need to approve first!',
            status: 'error',
            position: 'top-right',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
      }
    }

    try {
      // to address는  wN 주소
      setIsSwapLoading(true);
      const wEth = IWETH__factory.connect(wrappedNativeToken, signer);
      const amount = getBigNumberWithDecimals(tokenInAmount, selectedTokenIn?.decimals);
      const valueInHex = amount.toHexString();

      let txPromise = (async () => {
        if (isNativeToWrappedNative) {
          // N -> wN: deposit
          const contractTx = await wEth.deposit({ value: valueInHex });
          return contractTx.wait().then(({ transactionHash }) => transactionHash);
        } else if (isWrappedNativeToNative) {
          // wN -> N: withdraw
          const contractTx = await wEth.withdraw(valueInHex);
          return contractTx.wait().then(({ transactionHash }) => transactionHash);
        } else {
          if (!data?.metamaskSwapTransaction) {
            throw new Error('no response');
          }
          const { gasLimit, ...rest } = data.metamaskSwapTransaction;
          return sendTransaction({ ...rest, value: BigNumber.from(rest.value).toHexString() });
        }
      })();

      const txHash = await txPromise;

      if (!txHash) throw new Error('invalid transaction!');

      const toastId = toast({
        title: 'Success!',
        description: `Your transaction has sent: ${txHash}`,
        status: 'success',
        position: 'top-right',
        duration: 5000,
        isClosable: true,
      });

      const receipt = await provider.waitForTransaction(txHash);
      updateFetchKey(+new Date());
      if (receipt) {
        // success
        if (toastId) toast.close(toastId);
        toast({
          title: 'Success!',
          description: (
            <a
              href={config.chain.metaData[chain]?.getBlockExplorerUrl(
                txHash,
              )}>{`Your transaction(${txHash}) is approved!`}</a>
          ),
          status: 'success',
          position: 'top-right',
          duration: 5000,
          isClosable: true,
        });
      } else {
        // fail
      }
      logger.debug('txhash', txHash);
    } catch (e) {
      logger.error(e);
      toast({
        title: 'Failed to send transaction',
        description: 'Sorry. Someting went wrong, please try again',
        status: 'error',
        position: 'top-right',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSwapLoading(false);
    }
  };

  return (
    <>
      <main className={styles.main}>
        <Box
          className={styles['swap-container']}
          padding={12}
          paddingTop={6}
          w={['100%', '80%', '80%', '50%']}
          maxW="500px"
          borderRadius={8}>
          {
            <Tabs onChange={index => setPageMode(index == 0 ? 'swap' : 'flash')}>
              <TabList>
                <Tab>
                  <Heading as="h2" size="md" alignSelf="start">
                    Swap
                  </Heading>
                </Tab>
                <Tab>
                  <Heading as="h2" size="md" alignSelf="start">
                    Flash
                  </Heading>
                </Tab>
              </TabList>
            </Tabs>
          }

          <Box h={3} />
          <HStack justifyContent="flex-end">
            <HStack spacing={4}>
              <IconButton
                onClick={() => refetch()}
                aria-label="refresh swap preview"
                variant="outline"
                disabled={isRefetching || isLoading}
                icon={<RepeatIcon />}
              />
            </HStack>
            {/* <IconButton aria-label="swap settings" variant="outline" icon={<SettingsIcon />} /> */}
          </HStack>

          <Box h={4} />

          <TokenAmountInput
            tokenAddress={tokenInAddress}
            amount={tokenInAmountString}
            handleChange={handleChange}
            modalHeaderTitle={`You Sell`}
            label={`You Sell`}
            isInvalid={isError}
            showBalance={!!address}
            tokenList={tokenListMap[chain]}
            chain={chain}
            onBalanceClick={balance => {
              setTokenInAmountString(balance);
            }}
            decimals={selectedTokenIn?.decimals ?? 0}
            onTokenSelect={token => {
              if (token.address === tokenOutAddress) {
                handleClickReverse();
                return;
              }
              setTokenInAddress(token.address);
            }}
          />

          <Flex alignItems="center" marginY={8}>
            <Divider marginRight={4} />
            <IconButton
              aria-label="reverse-from-to"
              icon={<ArrowUpDownIcon />}
              variant="outline"
              onClick={handleClickReverse}
            />
            <Divider marginLeft={4} />
          </Flex>

          <TokenAmountInput
            tokenAddress={tokenOutAddress}
            amount={tokenOutAmount}
            isReadOnly
            modalHeaderTitle="You Buy"
            label={`You Buy`}
            tokenList={tokenListMap[chain]}
            chain={chain}
            decimals={selectedTokenOut?.decimals ?? 0}
            onTokenSelect={token => {
              if (token.address === tokenInAddress) {
                handleClickReverse();
                return;
              }
              setTokenOutAddress(token.address);
            }}
          />

          <Box w="100%" h={12} />

          <SlippageInput value={slippageRatio} setValue={setSlippageRatio} />

          <Box w="100%" h={12} />

          <Button
            isDisabled={isCTADisabled}
            isLoading={isSwapLoading}
            w="100%"
            size="lg"
            height={['48px', '54px', '54px', '64px']}
            fontSize={['md', 'lg', 'lg', 'xl']}
            opacity={1}
            colorScheme="primary"
            onClick={handleClickSwap}>
            {buttonText}
          </Button>
        </Box>

        {previewResult && debouncedTokenInAmount ? (
          <SwapPreviewResult
            previewResult={previewResult}
            expectedInputAmount={Number(debouncedTokenInAmount)}
            expectedOutputAmount={tokenOutAmount}
            isLoaded={!isLoading && !isRefetching}
          />
        ) : null}
      </main>
    </>
  );
};

export default Swap;
