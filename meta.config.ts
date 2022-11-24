import { ethers } from 'ethers';
import { DefaultSeoProps } from 'next-seo';

import { Chain } from 'src/domain/chain/types';

interface ChainMetaData {
  metamaskParams: {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: {
      name: string;
      symbol: string; // 2-6 characters long
      decimals: 18;
    };
  };

  apiEndpoint: string;
  getBlockExplorerUrl: (hash: string) => string;
  /** wrapped native token의 가격은 native token의 가격을 바라봐야 한다. getPriceInUSDC에서 사용 */
  nativeToken: string;
  wrappedNativeToken: string;
  routeProxyAddress: string;
  approveProxyAddress: string;
}

interface MetaConfig {
  commonApiEndpoint: string;
  chain: {
    defaultChain: Chain;
    chainList: Chain[];
    metaData: Record<Chain, ChainMetaData>;
  };
  navigation: {
    serviceName: string;
    logoURL: string;
    height: number | undefined;
  };
  seo: DefaultSeoProps;
}

const config: MetaConfig = {
  commonApiEndpoint: 'https://api.eisenfinance.com',
  chain: {
    defaultChain: 'aurora',
    chainList: ['aurora'],
    metaData: {
      aurora: {
        metamaskParams: {
          chainId: ethers.utils.hexlify(1313161554),
          chainName: 'aurora-mainnet',
          rpcUrls: ['https://mainnet.aurora.dev'],
          nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH', // 2-6 characters long
            decimals: 18,
          },
        },
        nativeToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        wrappedNativeToken: '0xc9bdeed33cd01541e1eed10f90519d2c06fe3feb',
        apiEndpoint: 'https://api-aurora.eisenfinance.com',
        getBlockExplorerUrl: (txHash: string) => `https://aurorascan.dev/tx/${txHash}`,
        routeProxyAddress: '0x208dA73F71fE00387C3fe0c4D71b77b39a8D1c5D',
        approveProxyAddress: '0xaf957563450b124655Af816c1D947a647bac62D1',
      },
    },
  },
  navigation: {
    serviceName: 'NeighborSwap',
    logoURL: 'neighbor-swap-logo.png',
    height: 150,
  },
  seo: {
    title: 'NeighborSwap',
    description: '',
    additionalLinkTags: [
      {
        rel: 'icon',
        href: '',
      },
    ],
    openGraph: {
      title: '',
      type: 'website',
      url: '',
      description: '',
      images: [
        {
          url: '',
          type: 'image/png',
        },
      ],
      site_name: '',
    },
  },
};

export default config;
