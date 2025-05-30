import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import './ManageLiquidityPage.css';

const PREDEFINED_TOKENS_LIST_MANAGE = {
  WETH: {
    address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
    symbol: 'WETH',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1696501628'
  },
  USDC: {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png?1696506694'
  },
  OKB: {
    address: '0x3F4B6664338F23d2397c953f2AB4Ce8031663f80',
    symbol: 'OKB',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/4463/small/okb_token.png?1696504795'
  },
  R2USD: {
    address: '0x20c54C5F742F123Abb49a982BFe0af47edb38756',
    symbol: 'R2USD',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png?1696501661'
  },
  WBTC: {
    address: '0x340a5B718557801f20AfD6E244C78Fcd1c0B2212',
    symbol: 'WBTC',
    decimals: 8,
    logoURI: 'https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png?1696507857'
  },
  SR2USD: {
    address: '0xBD6b25c4132F09369C354beE0f7be777D7d434fa',
    symbol: 'SR2USD',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png?1696501661'
  },
  LINK: {
    address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    symbol: 'LINK',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1696502009'
  }
};

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

const INonfungiblePositionManagerABI_Manage = [{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH9","type":"address"},{"internalType":"address","name":"_tokenDescriptor_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Collect","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"DecreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"IncreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint128","name":"amount0Max","type":"uint128"},{"internalType":"uint128","name":"amount1Max","type":"uint128"}],"internalType":"struct INonfungiblePositionManager.CollectParams","name":"params","type":"tuple"}],"name":"collect","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"uint160","name":"sqrtPriceX96","type":"uint160"}],"name":"createAndInitializePoolIfNecessary","outputs":[{"internalType":"address","name":"pool","type":"address"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.DecreaseLiquidityParams","name":"params","type":"tuple"}],"name":"decreaseLiquidity","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.IncreaseLiquidityParams","name":"params","type":"tuple"}],"name":"increaseLiquidity","outputs":[{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.MintParams","name":"params","type":"tuple"}],"name":"mint","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"positions","outputs":[{"internalType":"uint96","name":"nonce","type":"uint96"},{"internalType":"address","name":"operator","type":"address"},{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"feeGrowthInside0LastX128","type":"uint256"},{"internalType":"uint256","name":"feeGrowthInside1LastX128","type":"uint256"},{"internalType":"uint128","name":"tokensOwed0","type":"uint128"},{"internalType":"uint128","name":"tokensOwed1","type":"uint128"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refundETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowed","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowedIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount0Owed","type":"uint256"},{"internalType":"uint256","name":"amount1Owed","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uniswapV3MintCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}];

const getTokenByAddressManage = (address) => {
  if (!address) return { symbol: '?', logoURI: '', decimals: 18 };
  const tokenAddressLower = address.toLowerCase();
  const foundToken = Object.values(PREDEFINED_TOKENS_LIST_MANAGE).find(
    token => token.address.toLowerCase() === tokenAddressLower
  );
  return foundToken || { symbol: address.substring(0, 6) + '...', logoURI: '', decimals: 18 };
};

function ManageLiquidityPage({ isWalletConnected, provider, signer, userAddress }) {
  const { tokenId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialSwapParams = location.state;

  const [positionInfo, setPositionInfo] = useState(location.state?.positionInfo || null);
  const [fees, setFees] = useState(location.state?.fees || null);
  const [token0, setToken0] = useState(null);
  const [token1, setToken1] = useState(null);

  const [isLoading, setIsLoading] = useState(!positionInfo);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('add');

  const [amountToAddToken0, setAmountToAddToken0] = useState('');
  const [amountToAddToken1, setAmountToAddToken1] = useState('');
  const [removeLiquidityPercentage, setRemoveLiquidityPercentage] = useState(100);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');

  const [selectedSlippage, setSelectedSlippage] = useState(0.5);
  const [transactionDeadlineMinutes, setTransactionDeadlineMinutes] = useState(20);

  const [isInRange, setIsInRange] = useState(null);
  const [tokenSymbolToAddWhenOutOfRange, setTokenSymbolToAddWhenOutOfRange] = useState('');
  const [tokenObjectToAddWhenOutOfRange, setTokenObjectToAddWhenOutOfRange] = useState(null);

  const fetchDetailsIfNeeded = async () => {
    if (tokenId && provider) {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const requestUrl = `${backendUrl}/api/position-details/${tokenId}`;
        const response = await fetch(requestUrl);

        if (!response.ok) {
          let errorMsg = `Failed to fetch position details: ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } catch (e) {
            const textError = await response.text();
            console.error("Non-JSON error response from backend:", textError);
            errorMsg = textError || errorMsg;
          }
          throw new Error(errorMsg);
        }
        const data = await response.json();
        if (data.positionInfo) {
          setPositionInfo(data.positionInfo);
          setFees(data.fees);
          const fetchedToken0 = getTokenByAddressManage(data.positionInfo.token0);
          const fetchedToken1 = getTokenByAddressManage(data.positionInfo.token1);
          setToken0(fetchedToken0);
          setToken1(fetchedToken1);
        } else {
          throw new Error(`Position details not found for tokenId ${tokenId}.`);
        }
      } catch (error) {
        console.error("Error in fetchDetailsIfNeeded:", error);
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    } else if (!tokenId) {
      setErrorMessage("TokenId is not available to fetch details.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!positionInfo || positionInfo.tokenId?.toString() !== tokenId) {
      fetchDetailsIfNeeded();
    } else {
      setToken0(getTokenByAddressManage(positionInfo.token0));
      setToken1(getTokenByAddressManage(positionInfo.token1));
      setIsLoading(false);
    }
  }, [tokenId, provider]);

  useEffect(() => {
    if (positionInfo && typeof positionInfo.currentTick === 'number' && token0 && token1) {
      const currentTick = positionInfo.currentTick;
      const tickLower = positionInfo.tickLower;
      const tickUpper = positionInfo.tickUpper;

      if (currentTick > tickLower) {
        setIsInRange(false);
        setTokenSymbolToAddWhenOutOfRange(token1.symbol);
        setTokenObjectToAddWhenOutOfRange(token1);
      } else if (currentTick < tickUpper) {
        setIsInRange(false);
        setTokenSymbolToAddWhenOutOfRange(token0.symbol);
        setTokenObjectToAddWhenOutOfRange(token0);
      } else {
        setIsInRange(true);
        setTokenSymbolToAddWhenOutOfRange('');
        setTokenObjectToAddWhenOutOfRange(null);
      }
      setAmountToAddToken0('');
      setAmountToAddToken1('');
    } else {
      setIsInRange(null);
    }
  }, [positionInfo, token0, token1]);

  const handleAddLiquidity = async () => {
    if (!isWalletConnected || !signer || !userAddress || !positionInfo || !token0 || !token1 || isProcessing || isInRange === null) {
      setProcessStatus("Wallet not connected, position data unavailable, or range status unknown.");
      return;
    }

    let amount0DesiredWei = 0n;
    let amount1DesiredWei = 0n;
    const enteredAmount0 = parseFloat(amountToAddToken0);
    const enteredAmount1 = parseFloat(amountToAddToken1);

    if (isInRange) {
      if (enteredAmount0 > 0 && enteredAmount1 > 0) {
        amount0DesiredWei = ethers.parseUnits(amountToAddToken0, token0.decimals);
        amount1DesiredWei = ethers.parseUnits(amountToAddToken1, token1.decimals);
      } else if (enteredAmount0 > 0) {
        amount0DesiredWei = ethers.parseUnits(amountToAddToken0, token0.decimals);
        setProcessStatus(`For in-range positions, ideally both token amounts are provided or one is calculated from the other. Proceeding with ${token0.symbol} only.`);
      } else if (enteredAmount1 > 0) {
        amount1DesiredWei = ethers.parseUnits(amountToAddToken1, token1.decimals);
        setProcessStatus(`For in-range positions, ideally both token amounts are provided or one is calculated from the other. Proceeding with ${token1.symbol} only.`);
      } else {
        setProcessStatus("Please enter an amount for at least one token.");
        return;
      }
    } else {
      if (tokenObjectToAddWhenOutOfRange?.address === token0.address && enteredAmount0 > 0) {
        amount0DesiredWei = ethers.parseUnits(amountToAddToken0, token0.decimals);
        amount1DesiredWei = 0n;
      } else if (tokenObjectToAddWhenOutOfRange?.address === token1.address && enteredAmount1 > 0) {
        amount1DesiredWei = ethers.parseUnits(amountToAddToken1, token1.decimals);
        amount0DesiredWei = 0n;
      } else {
        setProcessStatus(`Please enter an amount for ${tokenSymbolToAddWhenOutOfRange}.`);
        return;
      }
    }

    if (amount0DesiredWei <= 0n && amount1DesiredWei <= 0n) {
      setProcessStatus("No amount specified to add.");
      return;
    }

    setIsProcessing(true);
    setProcessStatus(`Preparing to add liquidity...`);
    try {
      const userAddr = await signer.getAddress();
      const nftManagerAddress = import.meta.env.VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
      if (!nftManagerAddress) throw new Error("NFT Position Manager address not configured.");

      if (amount0DesiredWei > 0n) {
        setProcessStatus(`Checking allowance for ${token0.symbol}...`);
        const token0Contract = new ethers.Contract(token0.address, ERC20_ABI, signer);
        const allowance0 = await token0Contract.allowance(userAddress, nftManagerAddress);
        if (allowance0 < amount0DesiredWei) {
          setProcessStatus(`Approving ${token0.symbol}...`);
          const approveTx0 = await token0Contract.approve(nftManagerAddress, amount0DesiredWei);
          setProcessStatus(`Approval for ${token0.symbol} sent... Waiting...`);
          await approveTx0.wait(1);
          setProcessStatus(`${token0.symbol} approved!`);
        } else {
          setProcessStatus(`${token0.symbol} allowance sufficient.`);
        }
      }
      if (amount1DesiredWei > 0n) {
        setProcessStatus(`Checking allowance for ${token1.symbol}...`);
        const token1Contract = new ethers.Contract(token1.address, ERC20_ABI, signer);
        const allowance1 = await token1Contract.allowance(userAddress, nftManagerAddress);
        if (allowance1 < amount1DesiredWei) {
          setProcessStatus(`Approving ${token1.symbol}...`);
          const approveTx1 = await token1Contract.approve(nftManagerAddress, amount1DesiredWei);
          setProcessStatus(`Approval for ${token1.symbol} sent... Waiting...`);
          await approveTx1.wait(1);
          setProcessStatus(`${token1.symbol} approved!`);
        } else {
          setProcessStatus(`${token1.symbol} allowance sufficient.`);
        }
      }

      const positionManagerContract = new ethers.Contract(nftManagerAddress, INonfungiblePositionManagerABI_Manage, signer);
      const deadline = Math.floor(Date.now() / 1000) + (transactionDeadlineMinutes * 60 || 20 * 60);
      const params = {
        tokenId: parseInt(tokenId),
        amount0Desired: amount0DesiredWei.toString(),
        amount1Desired: amount1DesiredWei.toString(),
        amount0Min: 0,
        amount1Min: 0,
        deadline: deadline
      };
      setProcessStatus('Simulating increaseLiquidity transaction...');

      const [simulatedLiquidity, simulatedAmount0, simulatedAmount1] = await positionManagerContract.increaseLiquidity.staticCall(
        params,
        { from: userAddr }
      );

      setProcessStatus('Simulation successful. Sending transaction...');
      setProcessStatus(`Sending increaseLiquidity transaction...`);

      const increaseTx = await positionManagerContract.increaseLiquidity(params);
      setProcessStatus(`Increase liquidity tx sent: ${increaseTx.hash.substring(0,10)}... Waiting...`);
      const receipt = await increaseTx.wait(1);
      if (receipt.status === 1) {
        setProcessStatus(`Liquidity successfully added! Tx: ${increaseTx.hash.substring(0,10)}...`);
        setAmountToAddToken0(''); setAmountToAddToken1('');
        await fetchDetailsIfNeeded();
      } else {
        throw new Error("Increase liquidity transaction failed (reverted).");
      }
    } catch (error) {
      console.error("Ошибка во время добавления ликвидности (approve, симуляция или отправка):", error);
      let errMsg = error.reason || error.message || "Unknown error occurred.";

      if (error.data && typeof error.data === 'string' && error.data.startsWith('0x')) {
        if (error.revert) {
          errMsg = `${error.revert.name}(${error.revert.args.join(', ')})`;
        } else {
          const hex = error.data;
          if (hex.length > 138) {
            try {
              errMsg = ethers.toUtf8String("0x" + hex.substring(138));
            // eslint-disable-next-line no-unused-vars
            } catch (decodeError) { /* оставляем предыдущее сообщение */ }
          }
        }
      } else if (error.data && error.data.message) {
        errMsg = error.data.message;
      } else if (error.error && error.error.message) {
        errMsg = error.error.message;
      } else if (error.code === 3 && error.message && error.message.toLowerCase().includes('execution reverted')) {
        errMsg = "Transaction would be reverted. Check parameters or pool conditions.";
      }
      setProcessStatus(`Failed to add liquidity: ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!isWalletConnected || !signer || !userAddress || !positionInfo || isProcessing) {
      setProcessStatus("Wallet not connected or position data unavailable.");
      return;
    }
    if (removeLiquidityPercentage <= 0 || removeLiquidityPercentage > 100) {
      setProcessStatus("Please select a valid percentage (1-100).");
      return;
    }

    setIsProcessing(true);
    setProcessStatus(`Preparing to remove ${removeLiquidityPercentage}% liquidity...`);

    try {
      const nftManagerAddress = import.meta.env.VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
      if (!nftManagerAddress) {
        throw new Error("NFT Position Manager address is not configured.");
      }

      const positionManagerContract = new ethers.Contract(
        nftManagerAddress,
        INonfungiblePositionManagerABI_Manage,
        signer
      );

      const currentLiquidityBigInt = BigInt(positionInfo.liquidity);
      const liquidityToRemove = (currentLiquidityBigInt * BigInt(removeLiquidityPercentage)) / 100n;
      let decreaseTxSuccessful = false;
      let actualLiquidityAfterDecrease = currentLiquidityBigInt;
      const deadline = Math.floor(Date.now() / 1000) + (transactionDeadlineMinutes * 60 || 20 * 60);
      let decreaseTxHash = null;

      if (liquidityToRemove > 0n) {
        const decreaseParams = {
          tokenId: parseInt(tokenId),
          liquidity: liquidityToRemove.toString(),
          amount0Min: 0,
          amount1Min: 0,
          deadline: deadline
        };

        setProcessStatus(`Sending decreaseLiquidity transaction for ${removeLiquidityPercentage}%...`);
        const decreaseTx = await positionManagerContract.decreaseLiquidity(decreaseParams);
        decreaseTxHash = decreaseTx.hash;
        setProcessStatus(`Decrease liquidity transaction sent: ${decreaseTx.hash.substring(0,10)}... Waiting for confirmation...`);
        const decreaseReceipt = await decreaseTx.wait(1);

        if (decreaseReceipt.status !== 1) {
          throw new Error("Decrease liquidity transaction failed (reverted).");
        }
        decreaseTxSuccessful = true;
        actualLiquidityAfterDecrease = currentLiquidityBigInt - liquidityToRemove;

        // Обновляем начальную ликвидность в базе данных
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
          const currentAmount0 = BigInt(positionInfo.amount0);
          const currentAmount1 = BigInt(positionInfo.amount1);
          const removedPercentage = BigInt(removeLiquidityPercentage);
          
          // Вычисляем новые значения начальной ликвидности
          const newAmount0 = (currentAmount0 * (100n - removedPercentage)) / 100n;
          const newAmount1 = (currentAmount1 * (100n - removedPercentage)) / 100n;

          const response = await fetch(`${backendUrl}/api/positions/update-initial-liquidity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenId: tokenId,
              newAmount0Wei: newAmount0.toString(),
              newAmount1Wei: newAmount1.toString()
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to update initial liquidity on backend:", errorData);
            setProcessStatus(`Liquidity decreased on-chain, but backend update failed: ${errorData.error || 'Unknown error'}`);
          }
        } catch (backendError) {
          console.error("Error updating initial liquidity on backend:", backendError);
          setProcessStatus(`Liquidity decreased on-chain, but backend update error: ${backendError.message}`);
        }

        setProcessStatus(`Liquidity successfully decreased! ${decreaseTxHash ? `Tx: ${decreaseTxHash.substring(0,10)}... ` : ''}Now collecting funds...`);
      } else if (removeLiquidityPercentage > 0) {
        setProcessStatus("Current position liquidity is zero. Proceeding to collect fees...");
        decreaseTxSuccessful = true;
        actualLiquidityAfterDecrease = 0n;
      } else {
        setProcessStatus("Percentage to remove is zero. No liquidity decrease needed.");
      }

      const MAX_UINT128 = (2n ** 128n) - 1n;
      const collectParams = {
        tokenId: parseInt(tokenId),
        recipient: userAddress,
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128
      };

      setProcessStatus(`Sending collect transaction to gather funds and fees...`);
      const collectTx = await positionManagerContract.collect(collectParams);
      setProcessStatus(`Collect transaction sent: ${collectTx.hash.substring(0,10)}... Waiting for confirmation...`);
      const collectReceipt = await collectTx.wait(1);

      if (collectReceipt.status !== 1) {
        setProcessStatus(`Warning: Failed to collect funds/fees (Tx: ${collectTx.hash.substring(0,10)}...). If you proceed with burning the NFT, these funds might be lost.`);
      } else {
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
          let amount0CollectedFromEvent = 0n;
          let amount1CollectedFromEvent = 0n;
          const eventInterface = new ethers.Interface(INonfungiblePositionManagerABI_Manage);
          for (const log of collectReceipt.logs) {
            try {
              if (log.address.toLowerCase() === nftManagerAddress.toLowerCase()) {
                const parsedLog = eventInterface.parseLog({ topics: [...log.topics], data: log.data });
                if (parsedLog && parsedLog.name === "Collect" && parsedLog.args.tokenId.toString() === tokenId.toString()) {
                  amount0CollectedFromEvent = parsedLog.args.amount0;
                  amount1CollectedFromEvent = parsedLog.args.amount1;
                  break;
                }
              }
            } catch (e) { /* ignore parsing errors */ }
          }

          if (amount0CollectedFromEvent > 0n || amount1CollectedFromEvent > 0n) {
            const response = await fetch(`${backendUrl}/api/positions/update-collected-fees`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tokenId: tokenId,
                collectedAmount0Wei: amount0CollectedFromEvent.toString(),
                collectedAmount1Wei: amount1CollectedFromEvent.toString()
              })
            });
            if (!response.ok) {
              const errorData = await response.json();
              console.error("Failed to update collected fees on backend:", errorData);
              setProcessStatus(`Funds and fees collected on-chain, but backend update failed: ${errorData.error || 'Unknown error'}`);
            } else {
              setProcessStatus(`Funds and fees successfully collected! Tx: ${collectTx.hash.substring(0,10)}...`);
            }
          } else {
            setProcessStatus(`Funds and fees successfully collected! Tx: ${collectTx.hash.substring(0,10)}...`);
          }
        } catch (backendError) {
          console.error("Error calling backend to update fees:", backendError);
          setProcessStatus(`Funds and fees collected on-chain, but backend update error: ${backendError.message}`);
        }
      }

      if (removeLiquidityPercentage === 100 && actualLiquidityAfterDecrease === 0n) {
        setProcessStatus(`Preparing to burn NFT #${tokenId}...`);
        const burnTx = await positionManagerContract.burn(tokenId);
        setProcessStatus(`Burn NFT transaction sent: ${burnTx.hash.substring(0,10)}... Waiting for confirmation...`);
        const burnReceipt = await burnTx.wait(1);

        if (burnReceipt.status === 1) {
          setProcessStatus(`NFT #${tokenId} successfully burned! Position fully removed. Tx: ${burnTx.hash.substring(0,10)}...`);
          navigate('/earn');
        } else {
          throw new Error("Burn NFT transaction failed (reverted). The position (NFT) still exists but should be empty of liquidity.");
        }
      } else if (removeLiquidityPercentage === 100 && actualLiquidityAfterDecrease > 0n) {
        setProcessStatus(`Liquidity was decreased, but not to zero (${actualLiquidityAfterDecrease.toString()}). NFT burn will not be performed.`);
        await fetchDetailsIfNeeded();
      } else {
        setProcessStatus(`Successfully removed ${removeLiquidityPercentage}% liquidity and collected funds/fees!`);
        await fetchDetailsIfNeeded();
      }
    } catch (error) {
      console.error("Error during remove liquidity/collect/burn:", error);
      let errMsg = error.reason || error.message || "Unknown error during operation.";
      if (error.data && typeof error.data.message === 'string') {
        errMsg = error.data.message;
      } else if (error.error && typeof error.error.message === 'string') {
        errMsg = error.error.message;
      }
      setProcessStatus(`Operation failed: ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="manage-liquidity-page loading">Loading position data...</div>;
  if (errorMessage) return <div className="manage-liquidity-page error">{errorMessage} <button onClick={() => navigate('/earn')}>Back to Earn</button></div>;
  if (!positionInfo || !token0 || !token1) return <div className="manage-liquidity-page error">Position data not available. <button onClick={() => navigate('/earn')}>Back to Earn</button></div>;

  return (
    <div className="manage-liquidity-page">
      <div className="manage-liquidity-header">
        <button onClick={() => navigate('/earn')} className="back-button">← Back to Positions</button>
        <h2>Manage Liquidity</h2>
        <div className="position-summary-header">
          <div className="token-pair-manage">
            {token0.logoURI && <img src={token0.logoURI} alt={token0.symbol} className="token-logo-manage first" />}
            {token1.logoURI && <img src={token1.logoURI} alt={token1.symbol} className="token-logo-manage second" />}
            <span>{token0.symbol} / {token1.symbol}</span>
          </div>
          <span className="fee-tier-chip-manage">{positionInfo.fee / 10000}% Fee</span>
          <span>ID: #{tokenId}</span>
        </div>
      </div>

      <div className="manage-tabs">
        <button
          className={`manage-tab-button ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          Add Liquidity
        </button>
        <button
          className={`manage-tab-button ${activeTab === 'remove' ? 'active' : ''}`}
          onClick={() => setActiveTab('remove')}
        >
          Remove Liquidity
        </button>
      </div>

      <div className="manage-tab-content">
        {activeTab === 'add' && (
          <div className="add-liquidity-form">
            <h3>Add Liquidity</h3>
            <p>Range: Ticks {positionInfo.tickLower} - {positionInfo.tickUpper}
              {isInRange === true && <span style={{color: 'green', marginLeft: '10px'}}>(In Range)</span>}
              {isInRange === false && <span style={{color: 'orange', marginLeft: '10px'}}>(Out of Range)</span>}
            </p>

            {isInRange === true && (
              <>
                <div className="add-liquidity-input-group">
                  <label htmlFor="add-amount0">{token0.symbol}:</label>
                  <input type="text" id="add-amount0" placeholder={`Amount of ${token0.symbol}`}
                    value={amountToAddToken0}
                    onChange={(e) => {
                      setAmountToAddToken0(e.target.value);
                    }}
                    disabled={isProcessing} className="amount-input-field" />
                </div>
                <div className="add-liquidity-input-group">
                  <label htmlFor="add-amount1">{token1.symbol}:</label>
                  <input type="text" id="add-amount1" placeholder={`Amount of ${token1.symbol}`}
                    value={amountToAddToken1}
                    onChange={(e) => setAmountToAddToken1(e.target.value)}
                    disabled={isProcessing} className="amount-input-field" />
                </div>
                <p className="info-text-small">When in range, you typically add both tokens. Enter one amount, and the other can be estimated, or enter both.</p>
              </>
            )}

            {isInRange === false && tokenObjectToAddWhenOutOfRange && (
              <div className="add-liquidity-input-group">
                <label htmlFor="add-amount-single">Add {tokenObjectToAddWhenOutOfRange.symbol}:</label>
                <input
                  type="text" id="add-amount-single"
                  placeholder={`Amount of ${tokenObjectToAddWhenOutOfRange.symbol}`}
                  value={tokenObjectToAddWhenOutOfRange.address === token0.address ? amountToAddToken0 : amountToAddToken1}
                  onChange={(e) => {
                    if (tokenObjectToAddWhenOutOfRange.address === token0.address) {
                      setAmountToAddToken0(e.target.value); setAmountToAddToken1('');
                    } else {
                      setAmountToAddToken1(e.target.value); setAmountToAddToken0('');
                    }
                  }}
                  disabled={isProcessing} className="amount-input-field"
                />
                <p className="info-text-small">Your position is out of range. Add only {tokenObjectToAddWhenOutOfRange.symbol} to increase liquidity.</p>
              </div>
            )}
            {isInRange === null && <p>Determining position range status...</p>}

            <button onClick={handleAddLiquidity} disabled={isProcessing || !isWalletConnected || isInRange === null || (!parseFloat(amountToAddToken0) && !parseFloat(amountToAddToken1))} className="action-btn-manage">
              {isProcessing ? 'Processing...' : `Add Liquidity`}
            </button>
          </div>
        )}
        {activeTab === 'remove' && (
          <div className="remove-liquidity-form">
            <h3>Remove Liquidity from Position</h3>
            <p>Current Liquidity: {Number(ethers.formatUnits(positionInfo.liquidity, 0)).toLocaleString()}</p>
            <label htmlFor="remove-percentage">Percentage to remove:</label>
            <div className="settings-section deadline-settings">
              <span className="trade-summary-label">Transaction Deadline:</span>
              <div className="deadline-input-group">
                <input
                  type="number"
                  value={transactionDeadlineMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                      setTransactionDeadlineMinutes(val);
                    } else if (e.target.value === '') {
                      setTransactionDeadlineMinutes('');
                    }
                  }}
                  className="deadline-input"
                  min="1"
                />
                <span>minutes</span>
              </div>
            </div>
            <div className="percentage-slider-container">
              <input
                type="range"
                id="remove-percentage"
                min="1"
                max="100"
                value={removeLiquidityPercentage}
                onChange={(e) => setRemoveLiquidityPercentage(Number(e.target.value))}
                disabled={isProcessing}
                className="percentage-slider"
              />
              <span>{removeLiquidityPercentage}%</span>
            </div>
            <button onClick={handleRemoveLiquidity} disabled={isProcessing || !isWalletConnected} className="action-btn-manage remove">
              {isProcessing ? 'Processing...' : `Remove ${removeLiquidityPercentage}% Liquidity`}
            </button>
          </div>
        )}
        {processStatus && <p className="process-status-message">{processStatus}</p>}
      </div>
    </div>
  );
}

export default ManageLiquidityPage;