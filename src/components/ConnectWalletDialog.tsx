import React, { useEffect, useState } from 'react';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Button,
  ModalFooter,
  useToast,
  Box,
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { useAtomValue } from 'jotai';
import Image from 'next/image';

import config from 'meta.config';
import MetaMaskLogoImg from 'public/metamask-logo.svg';
import { chainAtom } from 'src/domain/chain/atom';
import { tokenInAddressAtom } from 'src/domain/swap/atom';
import { useWallet } from 'src/hooks/useWallet';
import { logger } from 'src/utils/logger';
import { WALLET_TYPES } from 'src/utils/wallet';
import { IERC20__factory } from 'types/ethers-contracts/factories';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const agreementList = [
  { text: 'I accept Terms of Service and Privacy Policy' },
  { text: 'I understand all the risk and security of Eisen Finance.' },
];

const ConnectWalletDialog = ({ isOpen, onClose }: Props) => {
  const toast = useToast();
  const { connect, address, getBalance, sendTransaction } = useWallet();
  const tokenIn = useAtomValue(tokenInAddressAtom);

  const [hasReadRiskDocument, setHasReadRiskDocument] = useState(false);
  const [checkList, setCheckList] = useState(agreementList.map(() => false));
  const isAllChecked = checkList.every(item => item);
  const chain = useAtomValue(chainAtom);

  useEffect(() => {
    if (!address) return;
    getBalance().then(res => logger.log('getBalance', res));
  }, [address]);

  const handleClick = (type: ValueOf<typeof WALLET_TYPES>) => async () => {
    const response = await connect(type);

    if (!response) {
      onClose();
      setCheckList(agreementList.map(() => false));
      toast({
        title: 'Failed to connect your wallet',
        description: 'Sorry. Someting went wrong, please try again',
        status: 'error',
        position: 'top-right',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!tokenIn || tokenIn === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      onClose();
      return;
    }

    const provider = new ethers.providers.Web3Provider(
      window.ethereum as unknown as ethers.providers.ExternalProvider,
    );
    const signer = provider.getSigner();

    const erc20 = IERC20__factory.connect(tokenIn, signer);
    const allowance = await erc20.allowance(
      response.address,
      config.chain.metaData[chain].approveProxyAddress,
    );

    if (allowance.gt(0)) {
      onClose();
      return;
    }

    try {
      const tx = await erc20.approve(
        config.chain.metaData[chain].approveProxyAddress,
        ethers.constants.MaxUint256,
      );
      const receipt = await tx.wait();

      if (receipt.status !== 1) {
        throw new Error('Approve failed');
      }
    } catch (e) {}

    // // TODO: approve sendTransaction
    // const result = await sendTransaction({
    //   // @ts-expect-error hello
    //   from: success?.address,
    //   to: '0xdf7ba1982ff003a80A74CdC0eEf246bc2a3E5F32',
    //   gas: '',
    //   value: '',
    //   data: '',
    // })
    // console.log(result)

    setCheckList(agreementList.map(() => false));
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setCheckList(agreementList.map(() => false));
        onClose();
      }}
      size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Connect Your Wallet</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box mt={4}>
            <Button
              onClick={handleClick('metamask')}
              variant="outline"
              size="lg"
              isFullWidth
              leftIcon={<Image src={MetaMaskLogoImg} alt="123" width={32} height={32} />}>
              Metamask
            </Button>
          </Box>
        </ModalBody>

        <ModalFooter />
      </ModalContent>
    </Modal>
  );
};

export default ConnectWalletDialog;
