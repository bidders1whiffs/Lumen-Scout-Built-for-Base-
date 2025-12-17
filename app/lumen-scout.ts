// app.lumen-scout.ts
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import { createBaseAccountSDK } from '@base-org/account';
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  formatEther,
  http,
  keccak256,
  parseAbi,
  toBytes,
  type Hex,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';

type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
};

const CHAINS = {
  baseMainnet: {
    chain: base,
    chainIdDecimal: 8453,
    chainIdHex: '0x2105' as Hex,
    rpcUrl: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
  },
  baseSepolia: {
    chain: baseSepolia,
    chainIdDecimal: 84532,
    chainIdHex: '0x14a34' as Hex,
    rpcUrl: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
  },
};

const APP = {
  name: 'Lumen Scout (Built for Base)',
  logoUrl: 'https://base.org/favicon.ico',
};

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
]);

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: Array<Node | string> = [],
) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) el.append(c instanceof Node ? c : document.createTextNode(c));
  return el;
}

async function ensureChain(provider: EIP1193Provider, target: (typeof CHAINS)[keyof typeof CHAINS]) {
  const current = (await provider.request({ method: 'eth_chainId' })) as string;
  if (current?.toLowerCase() === target.chainIdHex.toLowerCase()) return;

  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: target.chainIdHex }] });
  } catch (err: any) {
    if (err?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: target.chainIdHex,
            chainName: target.chain.name,
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: [target.rpcUrl],
            blockExplorerUrls: [target.explorer],
          },
        ],
      });
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: target.chainIdHex }] });
      return;
    }
    throw err;
  }
}

function makeBaseAccountProvider(): EIP1193Provider {
  const sdk = createBaseAccountSDK({
    appName: APP.name,
    appLogoUrl: APP.logoUrl,
    appChainIds: [CHAINS.baseMainnet.chainIdDecimal, CHAINS.baseSepolia.chainIdDecimal],
  });
  return sdk.getProvider() as unknown as EIP1193Provider;
}

function makeCoinbaseWalletProvider(target: (typeof CHAINS)[keyof typeof CHAINS]): EIP1193Provider {
  const sdk = new CoinbaseWalletSDK({ appName: APP.name, appLogoUrl: APP.logoUrl });
  return sdk.makeWeb3Provider(target.rpcUrl, target.chainIdDecimal) as unknown as EIP1193Provider;
}

function safeJson(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function defaultWatchList(chainId: number) {
  if (chainId === CHAINS.baseMainnet.chainIdDecimal) {
    return [
      { label: 'USDC (Base)', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
      { label: 'WETH (Base)', address: '0x4200000000000000000000000000000000000006' },
    ];
  }
  return [
    { label: 'Sample token (paste)', address: '' },
    { label: 'WETH (Base Sepolia)', address: '0x4200000000000000000000000000000000000006' },
  ];
}

function selector(sig: string) {
  return keccak256(toBytes(sig)).slice(0, 10);
}

async function readTokenMeta(publicClient: ReturnType<typeof createPublicClient>, token: `0x${string}`) {
  const [name, symbol, decimals] = await Promise.all([
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'name' }),
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'symbol' }),
    publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'decimals' }),
  ]);
  return { name, symbol, decimals: Number(decimals) };
}

async function readTokenBalance(
  publicClient: ReturnType<typeof createPublicClient>,
  token: `0x${string}`,
  owner: `0x${string}`,
) {
  const bal = await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [owner] });
  return bal as bigint;
}

async function mount() {
  const root = h('div', {
    style:
      'font-family: ui-sans-serif, system-ui; max-width: 1120px; margin: 40px auto; padding: 0 16px; line-height: 1.4;',
  });

  const title = h('h1', { style: 'margin: 0 0 6px 0; font-size: 24px;' }, [APP.name]);
  const subtitle = h(
    'p',
    { style: 'margin: 0 0 14px 0; opacity: 0.8;' },
    ['Connect to Base (8453) or Base Sepolia (84532), then run read-only token balance scans.'],
  );

  const controls = h('div', { style: 'display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0 10px 0;' });

  const out = h('pre', {
    style:
      'white-space: pre-wrap; word-break: break-word; background: #0b0f1a; color: #dbe7ff; padding: 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); min-height: 320px;',
  }) as HTMLPreElement;

  const tokenBox = h('input', {
    style:
      'flex: 1; min-width: 280px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.12);',
    placeholder: 'ERC-20 token address (0x...)',
  }) as HTMLInputElement;

  const ownerBox = h('input', {
    style:
      'flex: 1; min-width: 280px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.12);',
    placeholder: 'Owner address (defaults to connected address)',
  }) as HTMLInputElement;

  const btnBaseAccount = h(
    'button',
    {
      style:
        'padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.12); cursor: pointer; background: white;',
      type: 'button',
    },
    ['Connect (Base Account SDK)'],
  ) as HTMLButtonElement;

  const btnCoinbaseWallet = h(
    'button',
    {
      style:
        'padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.12); cursor: pointer; background: white;',
      type: 'button',
    },
    ['Connect (Coinbase Wallet SDK)'],
  ) as HTMLButtonElement;

  const btnToggle = h(
    'button',
    {
      style:
        'padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.12); cursor: pointer; background: white;',
      type: 'button',
    },
    ['Toggle Network'],
  ) as HTMLButtonElement;

  const btnScan = h(
    'button',
    {
      style:
        'padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.12); cursor: pointer; background: white;',
      type: 'button',
      disabled: 'true',
    },
    ['Scan Token Balance'],
  ) as HTMLButtonElement;

  const btnExample = h(
    'button',
    {
      style:
        'padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.12); cursor: pointer; background: white;',
      type: 'button',
      disabled: 'true',
    },
    ['Fill Examples'],
  ) as HTMLButtonElement;

  let target: (typeof CHAINS)[keyof typeof CHAINS] = CHAINS.baseSepolia;
  let provider: EIP1193Provider | null = null;
  let publicClient: ReturnType<typeof createPublicClient> | null = null;
  let connected: { address: `0x${string}`; chainId: number; chainHex: string } | null = null;

  const renderHeader = () => {
    subtitle.textContent = `Connect to Base (8453) or Base Sepolia (84532), then run read-only token balance scans. Active target: ${target.chain.name} (chainId ${target.chainIdDecimal}).`;
  };

  const connect = async (p: EIP1193Provider) => {
    out.textContent = 'Connecting…';
    const accounts = (await p.request({ method: 'eth_requestAccounts' })) as string[];
    const address = accounts?.[0] as `0x${string}` | undefined;
    if (!address) throw new Error('No address returned from eth_requestAccounts.');
    await ensureChain(p, target);

    const chainHex = (await p.request({ method: 'eth_chainId' })) as string;
    const chainId = parseInt(chainHex, 16);

    provider = p;
    publicClient = createPublicClient({ chain: target.chain, transport: http(target.rpcUrl) });
    createWalletClient({ chain: target.chain, transport: custom(p as any) });

    const bal = await publicClient.getBalance({ address });
    const block = await publicClient.getBlockNumber();

    connected = { address, chainId, chainHex };
    btnScan.removeAttribute('disabled');
    btnExample.removeAttribute('disabled');

    out.textContent = [
      `Connected`,
      `Network: ${target.chain.name}`,
      `chainId: ${chainId} (${chainHex})`,
      `Address: ${address}`,
      `ETH balance: ${formatEther(bal)} ETH`,
      `Latest block: ${block}`,
      `Explorer: ${target.explorer}/address/${address}`,
      ``,
      `Tip: Use "Fill Examples" for quick token addresses, then "Scan Token Balance".`,
      ``,
      `ABI selectors (sanity):`,
      `balanceOf(address): ${selector('balanceOf(address)')}`,
      `decimals(): ${selector('decimals()')}`,
    ].join('\n');
  };

  btnToggle.onclick = () => {
    target = target.chainIdDecimal === CHAINS.baseSepolia.chainIdDecimal ? CHAINS.baseMainnet : CHAINS.baseSepolia;
    provider = null;
    publicClient = null;
    connected = null;
    btnScan.setAttribute('disabled', 'true');
    btnExample.setAttribute('disabled', 'true');
    tokenBox.value = '';
    ownerBox.value = '';
    renderHeader();
    out.textContent = 'Network toggled. Reconnect to initialize on the new target.';
  };

  btnBaseAccount.onclick = async () => {
    try {
      await connect(makeBaseAccountProvider());
    } catch (e: any) {
      out.textContent = `Error (Base Account SDK): ${e?.message ?? String(e)}`;
    }
  };

  btnCoinbaseWallet.onclick = async () => {
    try {
      await connect(makeCoinbaseWalletProvider(target));
    } catch (e: any) {
      out.textContent = `Error (Coinbase Wallet SDK): ${e?.message ?? String(e)}`;
    }
  };

  btnExample.onclick = () => {
    const chainId = target.chainIdDecimal;
    const list = defaultWatchList(chainId);
    tokenBox.value = list[0]?.address ?? '';
    ownerBox.value = connected?.address ?? '';
    out.textContent = [
      `Examples filled for ${target.chain.name}`,
      `Token: ${tokenBox.value || '(paste an ERC-20 address)'}`,
      `Owner: ${ownerBox.value || '(will default to connected address)'}`,
      ``,
      `Watchlist:`,
      safeJson(list),
    ].join('\n');
  };

  btnScan.onclick = async () => {
    try {
      if (!publicClient || !connected) throw new Error('Not connected. Connect first.');
      const token = (tokenBox.value.trim() || '').toLowerCase();
      const owner = (ownerBox.value.trim() || connected.address).toLowerCase();

      if (!token.startsWith('0x') || token.length !== 42) throw new Error('Token address must be a 20-byte 0x address.');
      if (!owner.startsWith('0x') || owner.length !== 42) throw new Error('Owner address must be a 20-byte 0x address.');

      const tokenAddr = token as `0x${string}`;
      const ownerAddr = owner as `0x${string}`;

      out.textContent = 'Reading token metadata and balance (read-only)…';

      const meta = await readTokenMeta(publicClient, tokenAddr);
      const bal = await readTokenBalance(publicClient, tokenAddr, ownerAddr);

      const explorerToken = `${target.explorer}/address/${tokenAddr}`;
      const explorerOwner = `${target.explorer}/address/${ownerAddr}`;

      out.textContent = [
        `Lumen Scout report`,
        `Network: ${target.chain.name}`,
        `chainId: ${target.chainIdDecimal}`,
        ``,
        `Token: ${tokenAddr}`,
        `Token explorer: ${explorerToken}`,
        `Name: ${meta.name}`,
        `Symbol: ${meta.symbol}`,
        `Decimals: ${meta.decimals}`,
        ``,
        `Owner: ${ownerAddr}`,
        `Owner explorer: ${explorerOwner}`,
        `Raw balance: ${bal.toString()}`,
        ``,
        `Tip: For UI formatting, divide by 10^decimals. This tool prints raw balance for accuracy.`,
      ].join('\n');
    } catch (e: any) {
      out.textContent = `Error (Scan): ${e?.message ?? String(e)}`;
    }
  };

  const intro = [
    'Ready.',
    `- Default target: ${target.chain.name} (chainId ${target.chainIdDecimal}).`,
    '- Connect using Base Account SDK or Coinbase Wallet SDK.',
    '- Then read ERC-20 metadata and balances on Base using viem (read-only).',
  ].join('\n');

  controls.append(btnBaseAccount, btnCoinbaseWallet, btnToggle, tokenBox, ownerBox, btnExample, btnScan);
  root.append(title, subtitle, controls, out);
  document.body.append(root);

  renderHeader();
  out.textContent = intro;
}

mount();
