import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import './PositionCard.css';

const INonfungiblePositionManagerABI_Card = [{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH9","type":"address"},{"internalType":"address","name":"_tokenDescriptor_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Collect","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"DecreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"IncreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint128","name":"amount0Max","type":"uint128"},{"internalType":"uint128","name":"amount1Max","type":"uint128"}],"internalType":"struct INonfungiblePositionManager.CollectParams","name":"params","type":"tuple"}],"name":"collect","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"uint160","name":"sqrtPriceX96","type":"uint160"}],"name":"createAndInitializePoolIfNecessary","outputs":[{"internalType":"address","name":"pool","type":"address"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.DecreaseLiquidityParams","name":"params","type":"tuple"}],"name":"decreaseLiquidity","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.IncreaseLiquidityParams","name":"params","type":"tuple"}],"name":"increaseLiquidity","outputs":[{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.MintParams","name":"params","type":"tuple"}],"name":"mint","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"positions","outputs":[{"internalType":"uint96","name":"nonce","type":"uint96"},{"internalType":"address","name":"operator","type":"address"},{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"feeGrowthInside0LastX128","type":"uint256"},{"internalType":"uint256","name":"feeGrowthInside1LastX128","type":"uint256"},{"internalType":"uint128","name":"tokensOwed0","type":"uint128"},{"internalType":"uint128","name":"tokensOwed1","type":"uint128"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refundETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowed","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowedIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount0Owed","type":"uint256"},{"internalType":"uint256","name":"amount1Owed","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uniswapV3MintCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}];
const ERC20_ABI_CARD = ["function approve(address spender, uint256 amount) external returns (bool)", "function allowance(address owner, address spender) external view returns (uint256)", "function balanceOf(address account) external view returns (uint256)"];
const MAX_UINT256_CARD = ethers.MaxUint256;

// Modify the tickToPrice function to return price directly (not inverted)
const tickToPrice = (tick, token0Decimals, token1Decimals) => {
    if (typeof tick !== 'number') return null;
    const base = 1.0001;
    // Calculate the price (token1/token0)
    return Math.pow(base, tick) * Math.pow(10, token0Decimals - token1Decimals);
};

function PositionCard({
    positionData,
    signer,
    userAddress,
    provider,
    isWalletConnected,
    onPositionUpdate
}) {
    const navigate = useNavigate();
    const [isCollecting, setIsCollecting] = useState(false);
    const [collectStatus, setCollectStatus] = useState('');
    const [isAutoManageEnabled, setIsAutoManageEnabled] = useState(false);
    const [isTogglingAutoManage, setIsTogglingAutoManage] = useState(false);
    const [autoManageStatus, setAutoManageStatus] = useState('');
    const [isNftApprovedForOperator, setIsNftApprovedForOperator] = useState(false);
    const [isCheckingApproval, setIsCheckingApproval] = useState(false);
    const [isProcessingApproval, setIsProcessingApproval] = useState(false);
    const [token0ApprovedForSwapRouter, setToken0ApprovedForSwapRouter] = useState(false);
    const [token1ApprovedForSwapRouter, setToken1ApprovedForSwapRouter] = useState(false);
    const [token0ApprovedForNftManager, setToken0ApprovedForNftManager] = useState(false);
    const [token1ApprovedForNftManager, setToken1ApprovedForNftManager] = useState(false);
    const [isProcessingTokenApproval, setIsProcessingTokenApproval] = useState(null);

    const [pnlDetails, setPnlDetails] = useState({
        pnlToken0Formatted: 'N/A',
        pnlToken1Formatted: 'N/A',
        profitPercentageToken0: 'N/A',
        profitPercentageToken1: 'N/A',
        initialValueToken0Formatted: 'N/A',
        initialValueToken1Formatted: 'N/A',
        currentTotalValueToken0Formatted: 'N/A',
        currentTotalValueToken1Formatted: 'N/A',
        totalFeesToken0Formatted: 'N/A',
        totalFeesToken1Formatted: 'N/A',
    });

    // Add price calculation effect
    const [prices, setPrices] = useState({
        minPrice: null,
        maxPrice: null,
        currentPrice: null
    });

    const tokenId = positionData?.tokenId;
    const positionInfo = positionData?.positionInfo;
    const uncollectedFees = positionData?.uncollectedFees;
    const pnlData = positionData?.pnlData;

    const backendOperatorAddress = import.meta.env.VITE_BACKEND_OPERATOR_ADDRESS;
    const nftManagerAddress = import.meta.env.VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
    const swapRouterAddress = import.meta.env.VITE_UNISWAP_V3_SWAP_ROUTER_ADDRESS;

    useEffect(() => {
        if (!positionInfo || !positionInfo.token0Details || !positionInfo.token1Details ||
            !uncollectedFees ||
            !pnlData || !provider) {
            console.log('PositionCard: Missing data for PnL calculation:', {
                hasPositionInfo: !!positionInfo,
                hasToken0Details: positionInfo?.token0Details,
                hasToken1Details: positionInfo?.token1Details,
                uncollectedFees,
                pnlData
            });
            setPnlDetails(prev => ({
                ...prev,
                pnlToken0Formatted: 'Data Missing',
                pnlToken1Formatted: 'Data Missing',
            }));
            return;
        }

        try {
            console.log('PositionCard: Calculating PnL with data:', {
                tokenId,
                positionInfo: {
                    calculatedAmount0: positionInfo.calculatedAmount0,
                    calculatedAmount1: positionInfo.calculatedAmount1,
                    token0Details: positionInfo.token0Details,
                    token1Details: positionInfo.token1Details
                },
                uncollectedFees,
                pnlData
            });

            const token0Details = positionInfo.token0Details;
            const token1Details = positionInfo.token1Details;

            if (typeof token0Details.decimals === 'undefined' || typeof token1Details.decimals === 'undefined') {
                console.warn(`PositionCard (${tokenId}): Decimals missing for tokens`, token0Details, token1Details);
                setPnlDetails(prev => ({ ...prev, pnlToken0Formatted: 'Token Data Error', pnlToken1Formatted: 'Token Data Error' }));
                return;
            }

            console.log('Raw values before BigInt conversion:', {
                calculatedAmount0: positionInfo.calculatedAmount0,
                calculatedAmount1: positionInfo.calculatedAmount1,
                initialAmount0Wei: pnlData.initialAmount0Wei,
                initialAmount1Wei: pnlData.initialAmount1Wei
            });

            const initialAmount0BN = BigInt(pnlData.initialAmount0Wei || '0');
            const initialAmount1BN = BigInt(pnlData.initialAmount1Wei || '0');
            const cumulativeFeesToken0BN = BigInt(pnlData.cumulativeFeesToken0Wei || '0');
            const cumulativeFeesToken1BN = BigInt(pnlData.cumulativeFeesToken1Wei || '0');
            const uncollectedFees0BN = BigInt(uncollectedFees.feesAmount0 || '0');
            const uncollectedFees1BN = BigInt(uncollectedFees.feesAmount1 || '0');
            
            const currentLiquidityAmount0BN = BigInt(positionInfo.calculatedAmount0 || '0');
            const currentLiquidityAmount1BN = BigInt(positionInfo.calculatedAmount1 || '0');

            console.log('Values after BigInt conversion:', {
                initialAmount0BN: initialAmount0BN.toString(),
                initialAmount1BN: initialAmount1BN.toString(),
                currentLiquidityAmount0BN: currentLiquidityAmount0BN.toString(),
                currentLiquidityAmount1BN: currentLiquidityAmount1BN.toString()
            });

            const totalFees0BN = cumulativeFeesToken0BN + uncollectedFees0BN;
            const totalFees1BN = cumulativeFeesToken1BN + uncollectedFees1BN;

            const currentTotalValueToken0BN = currentLiquidityAmount0BN + totalFees0BN;
            const currentTotalValueToken1BN = currentLiquidityAmount1BN + totalFees1BN;
            
            const pnlToken0BN = currentTotalValueToken0BN - initialAmount0BN;
            const pnlToken1BN = currentTotalValueToken1BN - initialAmount1BN;

            let profitPercentageToken0 = 'N/A';
            if (initialAmount0BN > 0n) {
                const percentageRaw0 = Number((pnlToken0BN * 10000n) / initialAmount0BN) / 100;
                profitPercentageToken0 = percentageRaw0.toFixed(2) + '%';
            }

            let profitPercentageToken1 = 'N/A';
            if (initialAmount1BN > 0n) {
                const percentageRaw1 = Number((pnlToken1BN * 10000n) / initialAmount1BN) / 100;
                profitPercentageToken1 = percentageRaw1.toFixed(2) + '%';
            }
            
            setPnlDetails({
                pnlToken0Formatted: `${ethers.formatUnits(pnlToken0BN, token0Details.decimals)} ${token0Details.symbol}`,
                pnlToken1Formatted: `${ethers.formatUnits(pnlToken1BN, token1Details.decimals)} ${token1Details.symbol}`,
                profitPercentageToken0: profitPercentageToken0,
                profitPercentageToken1: profitPercentageToken1,
                initialValueToken0Formatted: `${ethers.formatUnits(initialAmount0BN, token0Details.decimals)} ${token0Details.symbol}`,
                initialValueToken1Formatted: `${ethers.formatUnits(initialAmount1BN, token1Details.decimals)} ${token1Details.symbol}`,
                currentTotalValueToken0Formatted: `${ethers.formatUnits(currentTotalValueToken0BN, token0Details.decimals)} ${token0Details.symbol}`,
                currentTotalValueToken1Formatted: `${ethers.formatUnits(currentTotalValueToken1BN, token1Details.decimals)} ${token1Details.symbol}`,
                totalFeesToken0Formatted: `${ethers.formatUnits(totalFees0BN, token0Details.decimals)} ${token0Details.symbol}`,
                totalFeesToken1Formatted: `${ethers.formatUnits(totalFees1BN, token1Details.decimals)} ${token1Details.symbol}`,
            });

        } catch (e) {
            console.error(`Error calculating PNL in PositionCard for tokenId ${tokenId}:`, e);
            setPnlDetails(prev => ({ ...prev, pnlToken0Formatted: 'Calc Error', pnlToken1Formatted: 'Calc Error' }));
        }
    }, [positionInfo, uncollectedFees, pnlData, provider, tokenId]);

    useEffect(() => {
        if (positionInfo && positionInfo.token0Details && positionInfo.token1Details) {
            const token0Decimals = positionInfo.token0Details.decimals;
            const token1Decimals = positionInfo.token1Details.decimals;

            // For min price, use tickUpper (as it corresponds to the lower price in USDC per WETH)
            const minPrice = tickToPrice(positionInfo.tickUpper, token0Decimals, token1Decimals);
            // For max price, use tickLower (as it corresponds to the higher price in USDC per WETH)
            const maxPrice = tickToPrice(positionInfo.tickLower, token0Decimals, token1Decimals);
            const currentPrice = tickToPrice(positionInfo.currentTick, token0Decimals, token1Decimals);

            setPrices({
                minPrice: minPrice ? (1/minPrice).toFixed(6) : null,
                maxPrice: maxPrice ? (1/maxPrice).toFixed(6) : null,
                currentPrice: currentPrice ? (1/currentPrice).toFixed(6) : null
            });
        }
    }, [positionInfo]);

    const checkNftApproval = async () => {
        if (!isWalletConnected || !signer || !tokenId || !backendOperatorAddress || !nftManagerAddress) {
            setIsNftApprovedForOperator(false);
            return;
        }
        setIsCheckingApproval(true);
        try {
            const positionManagerContract = new ethers.Contract(nftManagerAddress, INonfungiblePositionManagerABI_Card, provider);
            const approvedAddress = await positionManagerContract.getApproved(tokenId);
            if (approvedAddress && approvedAddress.toLowerCase() === backendOperatorAddress.toLowerCase()) {
                setIsNftApprovedForOperator(true);
            } else {
                const isApprovedForAll = await positionManagerContract.isApprovedForAll(userAddress, backendOperatorAddress);
                setIsNftApprovedForOperator(isApprovedForAll);
            }
        } catch (error) {
            console.error("Error checking NFT approval:", error);
            setIsNftApprovedForOperator(false);
            setAutoManageStatus(`Error checking NFT approval: ${error.message}`);
        } finally {
            setIsCheckingApproval(false);
        }
    };

    const handleApproveNftForOperator = async () => {
        if (!isWalletConnected || !signer || !tokenId || !backendOperatorAddress || isProcessingApproval || !nftManagerAddress) return;
        setIsProcessingApproval(true);
        setAutoManageStatus('Requesting approval for auto-management...');
        try {
            const positionManagerContract = new ethers.Contract(nftManagerAddress, INonfungiblePositionManagerABI_Card, signer);
            const tx = await positionManagerContract.approve(backendOperatorAddress, tokenId);
            setAutoManageStatus(`Approval transaction sent: ${tx.hash.substring(0,10)}... Waiting...`);
            await tx.wait(1);
            setIsNftApprovedForOperator(true);
            setAutoManageStatus('NFT successfully approved for auto-management!');
        } catch (error) {
            console.error("Error approving NFT for operator:", error);
            let errMsg = error.reason || error.data?.message || error.message || "Failed to approve NFT.";
            setAutoManageStatus(`Approval failed: ${errMsg}`);
            setIsNftApprovedForOperator(false);
        } finally {
            setIsProcessingApproval(false);
        }
    };

    const checkTokenAllowance = async (tokenAddress, spenderAddress, setApprovalState) => {
        if (!isWalletConnected || !provider || !userAddress || !tokenAddress || !spenderAddress) return;
        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI_CARD, provider);
            const allowance = await tokenContract.allowance(userAddress, spenderAddress);
            if (allowance >= (MAX_UINT256_CARD / 2n) ) {
                setApprovalState(true);
            } else {
                setApprovalState(false);
            }
        } catch (error) {
            console.error(`Error checking allowance for ${tokenAddress} to ${spenderAddress}:`, error);
            setApprovalState(false);
        }
    };

    const handleApproveToken = async (token, spenderAddress, approvalType, setApprovalState) => {
        if (!isWalletConnected || !signer || !token || !token.address || !spenderAddress || isProcessingTokenApproval) return;
        setIsProcessingTokenApproval(approvalType);
        setAutoManageStatus(`Approving ${token.symbol} for ${spenderAddress === swapRouterAddress ? 'Swap Router' : 'Position Manager'}...`);
        try {
            const tokenContract = new ethers.Contract(token.address, ERC20_ABI_CARD, signer);
            const tx = await tokenContract.approve(spenderAddress, MAX_UINT256_CARD);
            setAutoManageStatus(`Approval for ${token.symbol} sent: ${tx.hash.substring(0,10)}... Waiting...`);
            await tx.wait(1);
            setApprovalState(true);
            setAutoManageStatus(`${token.symbol} successfully approved for ${spenderAddress === swapRouterAddress ? 'Swap Router' : 'Position Manager'}!`);
        } catch (error) {
            console.error(`Error approving ${token.symbol}:`, error);
            let errMsg = error.reason || error.data?.message || error.message || `Failed to approve ${token.symbol}.`;
            setAutoManageStatus(`Approval failed: ${errMsg}`);
            setApprovalState(false);
        } finally {
            setIsProcessingTokenApproval(null);
        }
    };

    useEffect(() => {
        const fetchAllStatuses = async () => {
            if (!tokenId || !isWalletConnected || !userAddress || !provider || !positionInfo || !positionInfo.token0Details || !positionInfo.token1Details) return;
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                const response = await fetch(`${backendUrl}/api/auto-manage/status/${tokenId}`);
                if (response.ok) {
                    const data = await response.json();
                    setIsAutoManageEnabled(data.isEnabled);
                } else { console.warn(`Could not fetch auto-manage status for token ${tokenId}`); }
            } catch (error) { console.error("Error fetching auto-manage status from backend:", error); }

            await checkNftApproval();
            if (positionInfo.token0Details.address && swapRouterAddress) await checkTokenAllowance(positionInfo.token0Details.address, swapRouterAddress, setToken0ApprovedForSwapRouter);
            if (positionInfo.token1Details.address && swapRouterAddress) await checkTokenAllowance(positionInfo.token1Details.address, swapRouterAddress, setToken1ApprovedForSwapRouter);
            if (positionInfo.token0Details.address && nftManagerAddress) await checkTokenAllowance(positionInfo.token0Details.address, nftManagerAddress, setToken0ApprovedForNftManager);
            if (positionInfo.token1Details.address && nftManagerAddress) await checkTokenAllowance(positionInfo.token1Details.address, nftManagerAddress, setToken1ApprovedForNftManager);
        };
        fetchAllStatuses();
    }, [tokenId, isWalletConnected, userAddress, provider, positionInfo, backendOperatorAddress, nftManagerAddress, swapRouterAddress]);

    const handleToggleAutoManage = async () => {
        if (!isWalletConnected || !signer || isTogglingAutoManage || !isNftApprovedForOperator ||
            !token0ApprovedForSwapRouter || !token1ApprovedForSwapRouter ||
            !token0ApprovedForNftManager || !token1ApprovedForNftManager
        ) {
            let missingApprovals = [];
            if (!isNftApprovedForOperator) missingApprovals.push("NFT for Operator");
            if (positionInfo?.token0Details && !token0ApprovedForSwapRouter) missingApprovals.push(`${positionInfo.token0Details.symbol} for Swapping`);
            if (positionInfo?.token1Details && !token1ApprovedForSwapRouter) missingApprovals.push(`${positionInfo.token1Details.symbol} for Swapping`);
            if (positionInfo?.token0Details && !token0ApprovedForNftManager) missingApprovals.push(`${positionInfo.token0Details.symbol} for Liquidity Mgmt.`);
            if (positionInfo?.token1Details && !token1ApprovedForNftManager) missingApprovals.push(`${positionInfo.token1Details.symbol} for Liquidity Mgmt.`);

            if (missingApprovals.length > 0) {
                 setAutoManageStatus(`Please grant all required approvals: ${missingApprovals.join(', ')}.`);
            } else {
                 setAutoManageStatus('Please wait, checking approvals or processing another action.');
            }
            return;
        }

        setIsTogglingAutoManage(true);
        const newStatus = !isAutoManageEnabled;
        setAutoManageStatus(newStatus ? 'Enabling auto-management...' : 'Disabling auto-management...');
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${backendUrl}/api/auto-manage/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({
                    tokenId: parseInt(tokenId),
                    enable: newStatus,
                    userAddress: userAddress,
                    strategyParameters: { rangePercentage: 5 },
                }),
            });
            if (response.ok) {
                const data = await response.json();
                setIsAutoManageEnabled(data.isEnabled);
                setAutoManageStatus(data.isEnabled ? 'Auto-management enabled.' : 'Auto-management disabled.');
                 if (onPositionUpdate) onPositionUpdate(tokenId);
            } else {
                const errorData = await response.json();
                setAutoManageStatus(`Error: ${errorData.error || 'Failed to toggle auto-management.'}`);
            }
        } catch (error) {
            console.error("Error toggling auto-management:", error);
            setAutoManageStatus(`Error: ${error.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsTogglingAutoManage(false);
        }
    };

    const handleManagePosition = () => {
        if (!positionInfo || !uncollectedFees || !positionInfo.token0Details || !positionInfo.token1Details) {
             console.error("Cannot navigate to manage liquidity, essential data missing.");
             return;
        }
        navigate(`/manage-liquidity/${tokenId}`, { 
            state: { 
                positionInfo: positionInfo, // Pass the enriched positionInfo
                fees: uncollectedFees, 
                // token0 and token1 are now part of positionInfo.token0Details / positionInfo.token1Details
            } 
        });
    };

    const handleCollectFees = async () => {
        if (!signer || !userAddress || !nftManagerAddress) {
            setCollectStatus("Wallet not connected or configuration missing.");
            return;
        }
        if (!uncollectedFees || (uncollectedFees.feesAmount0 === '0' && uncollectedFees.feesAmount1 === '0')) {
            setCollectStatus("No fees to collect.");
            return;
        }
        if (isCollecting) return;

        setIsCollecting(true);
        setCollectStatus('Preparing to collect fees...');

        try {
            const positionManagerContract = new ethers.Contract(
                nftManagerAddress,
                INonfungiblePositionManagerABI_Card,
                signer
            );
            const MAX_UINT128 = (2n ** 128n) - 1n;
            const params = {
                tokenId: tokenId,
                recipient: userAddress,
                amount0Max: MAX_UINT128,
                amount1Max: MAX_UINT128
            };

            setCollectStatus('Sending collect transaction...');
            const tx = await positionManagerContract.collect(params);
            setCollectStatus(`Collect transaction sent: ${tx.hash.substring(0,10)}... Waiting...`);
            
            const receipt = await tx.wait(1);
            setCollectStatus(`Fees collected successfully! Tx: ${tx.hash.substring(0,10)}...`);
            
            // Call backend to update cumulative fees
            if (receipt.status === 1) {
                let amount0CollectedFromEvent = 0n;
                let amount1CollectedFromEvent = 0n;
                const eventInterface = new ethers.Interface(INonfungiblePositionManagerABI_Card);
                for (const log of receipt.logs) {
                    try {
                        if (log.address.toLowerCase() === nftManagerAddress.toLowerCase()) {
                            const parsedLog = eventInterface.parseLog({ topics: [...log.topics], data: log.data });
                            if (parsedLog && parsedLog.name === "Collect" && parsedLog.args.tokenId.toString() === tokenId.toString()) {
                                amount0CollectedFromEvent = parsedLog.args.amount0;
                                amount1CollectedFromEvent = parsedLog.args.amount1;
                                break;
                            }
                        }
                    // eslint-disable-next-line no-unused-vars
                    } catch (e) { /* ignore parsing errors */ }
                }

                if (amount0CollectedFromEvent > 0n || amount1CollectedFromEvent > 0n) {
                    try {
                        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                        const feeUpdateResponse = await fetch(`${backendUrl}/api/positions/update-collected-fees`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                tokenId: tokenId,
                                collectedAmount0Wei: amount0CollectedFromEvent.toString(),
                                collectedAmount1Wei: amount1CollectedFromEvent.toString()
                            })
                        });
                        if (!feeUpdateResponse.ok) {
                           const errData = await feeUpdateResponse.json();
                           console.error("Failed to update collected fees on backend:", errData.error);
                           setCollectStatus(`Fees collected on-chain, but backend update failed: ${errData.error || feeUpdateResponse.statusText}`);
                        } else {
                           console.log("Backend cumulative fees updated after manual collect.");
                        }
                    } catch (backendError) {
                        console.error("Error calling backend to update fees:", backendError);
                        setCollectStatus(`Fees collected on-chain, but backend update error: ${backendError.message}`);
                    }
                }
            }
            if (onPositionUpdate) onPositionUpdate(tokenId);

        } catch (error) {
            console.error("Error collecting fees:", error);
            let errMsg = error.reason || error.message || "Unknown error collecting fees.";
            if (error.data && typeof error.data.message === 'string') errMsg = error.data.message;
            else if (error.error && typeof error.error.message === 'string') errMsg = error.error.message;
            setCollectStatus(`Failed to collect fees: ${errMsg}`);
        } finally {
            setIsCollecting(false);
        }
    };

    if (!positionInfo || !positionInfo.token0Details || !positionInfo.token1Details) {
        return <div className="position-card loading">Loading position data...</div>;
    }
     
    let isInRange = null;
    if (typeof positionInfo.currentTick === 'number' && 
        typeof positionInfo.tickLower === 'number' && 
        typeof positionInfo.tickUpper === 'number') {
        isInRange = positionInfo.currentTick >= positionInfo.tickLower && positionInfo.currentTick <= positionInfo.tickUpper;
    }

    const canCollect = uncollectedFees && (BigInt(uncollectedFees.feesAmount0 || '0') > 0n || BigInt(uncollectedFees.feesAmount1 || '0') > 0n);
    const allApprovalsDone = isNftApprovedForOperator && token0ApprovedForSwapRouter && token1ApprovedForSwapRouter && token0ApprovedForNftManager && token1ApprovedForNftManager;
     
    return (
    <div className={`position-card ${isInRange === false ? 'out-of-range' : (isInRange === true ? 'in-range': '')}`}>
        <div className="position-card-header">
            <div className="token-pair">
                {positionInfo.token0Details.logoURI && <img src={positionInfo.token0Details.logoURI} alt={positionInfo.token0Details.symbol} className="token-logo-card first" />}
                {positionInfo.token1Details.logoURI && <img src={positionInfo.token1Details.logoURI} alt={positionInfo.token1Details.symbol} className="token-logo-card second" />}
                <span className="pair-symbols">{positionInfo.token0Details.symbol}/{positionInfo.token1Details.symbol}</span>
            </div>
            <div>
                {positionInfo.fee && <span className="fee-tier-chip">Fee: {positionInfo.fee / 10000}%</span>}
                {isInRange !== null && (  
                    <span className={`status-chip ${isInRange ? 'in-range' : 'out-of-range-chip'}`}>
                        {isInRange ? 'In Range' : 'Out of Range'}
                    </span>
                )}
            </div>
        </div>

        <div className="position-info-grid">
            <div>
                <span className="info-label">Min Price</span>
                <span className="info-value">
                    {prices.minPrice 
                        ? `${prices.minPrice} ${positionInfo.token0Details.symbol} per ${positionInfo.token1Details.symbol}`
                        : 'N/A'
                    }
                </span>
            </div>
            <div>
                <span className="info-label">Max Price</span>
                <span className="info-value">
                    {prices.maxPrice 
                        ? `${prices.maxPrice} ${positionInfo.token0Details.symbol} per ${positionInfo.token1Details.symbol}`
                        : 'N/A'
                    }
                </span>
            </div>
            {typeof positionInfo.currentTick === 'number' && (  
                <div>
                    <span className="info-label">Current Price</span>
                    <span className="info-value">
                        {prices.currentPrice 
                            ? `${prices.currentPrice} ${positionInfo.token0Details.symbol} per ${positionInfo.token1Details.symbol}`
                            : 'N/A'
                        }
                    </span>
                </div>
            )}
            <div>
                <span className="info-label">Current Liquidity</span>
                <span className="info-value">
                    {positionInfo.calculatedAmount0 && positionInfo.calculatedAmount1 
                        ? `${parseFloat(ethers.formatUnits(positionInfo.calculatedAmount0, positionInfo.token0Details.decimals)).toFixed(6)} ${positionInfo.token0Details.symbol} + ${parseFloat(ethers.formatUnits(positionInfo.calculatedAmount1, positionInfo.token1Details.decimals)).toFixed(6)} ${positionInfo.token1Details.symbol}`
                        : '0'
                    }
                </span>
            </div>
            <div>
                <span className="info-label">Position ID</span>
                <span className="info-value">#{tokenId}</span>
            </div>
        </div>

        {uncollectedFees && (
            <div className="uncollected-fees">
                <span className="info-label">Uncollected Fees:</span>
                <div className="fee-values">
                    <span>
                        {uncollectedFees.feeToken0 ? 
                            `${parseFloat(ethers.formatUnits(uncollectedFees.feesAmount0 || '0', uncollectedFees.feeToken0.decimals)).toFixed(Math.min(uncollectedFees.feeToken0.decimals, 6))} ${uncollectedFees.feeToken0.symbol}`
                            : 'N/A' 
                        }
                    </span>
                    <span>
                        {uncollectedFees.feeToken1 ?
                            `${parseFloat(ethers.formatUnits(uncollectedFees.feesAmount1 || '0', uncollectedFees.feeToken1.decimals)).toFixed(Math.min(uncollectedFees.feeToken1.decimals, 6))} ${uncollectedFees.feeToken1.symbol}`
                            : 'N/A'
                        }
                    </span>
                </div>
                <button 
                    onClick={handleCollectFees} 
                    className="collect-fees-btn-small"
                    disabled={!canCollect || isCollecting || !isWalletConnected}
                >
                    {isCollecting ? 'Collecting...' : 'Collect'}
                </button>
            </div>
        )}
        {collectStatus && <p className="collect-status-message" style={{ color: collectStatus.toLowerCase().includes('fail') || collectStatus.toLowerCase().includes('error') ? 'red' : (collectStatus.toLowerCase().includes('success') ? 'green' : '#a5a2b3') }}>{collectStatus}</p>}
        
        {pnlData && positionInfo && positionInfo.token0Details && positionInfo.token1Details && (
            <div className="pnl-section">
                <h4 className="pnl-header">Profit & Loss</h4>
                <div className="pnl-details-grid">
                    <div className="pnl-label">Initial {positionInfo.token0Details.symbol}:</div>
                    <div className="pnl-value">{pnlDetails.initialValueToken0Formatted}</div>
                    <div className="pnl-label">Initial {positionInfo.token1Details.symbol}:</div>
                    <div className="pnl-value">{pnlDetails.initialValueToken1Formatted}</div>

                    <div className="pnl-label">Current Total {positionInfo.token0Details.symbol}:</div>
                    <div className="pnl-value">{pnlDetails.currentTotalValueToken0Formatted}</div>
                    <div className="pnl-label">Current Total {positionInfo.token1Details.symbol}:</div>
                    <div className="pnl-value">{pnlDetails.currentTotalValueToken1Formatted}</div>
                    
                    <div className="pnl-label">Total Fees {positionInfo.token0Details.symbol}:</div>
                    <div className="pnl-value">{pnlDetails.totalFeesToken0Formatted}</div>
                    <div className="pnl-label">Total Fees {positionInfo.token1Details.symbol}:</div>
                    <div className="pnl-value">{pnlDetails.totalFeesToken1Formatted}</div>

                    <div className="pnl-label pnl-result-label">PnL {positionInfo.token0Details.symbol}:</div>
                    <div className={`pnl-value pnl-result-value ${!pnlDetails.pnlToken0Formatted.startsWith('-') && pnlDetails.pnlToken0Formatted !== 'N/A' && pnlDetails.pnlToken0Formatted !== 'Data Missing' && pnlDetails.pnlToken0Formatted !== 'Calc Error' && pnlDetails.pnlToken0Formatted !== `0.000000 ${positionInfo.token0Details.symbol}` ? 'positive-pnl' : (pnlDetails.pnlToken0Formatted.startsWith('-') ? 'negative-pnl' : '')}`}>
                        {pnlDetails.pnlToken0Formatted}
                        {pnlDetails.initialValueToken0Formatted !== 'N/A' && !pnlDetails.initialValueToken0Formatted.startsWith('0.0 ') && pnlDetails.profitPercentageToken0 !== 'N/A' && ` (${pnlDetails.profitPercentageToken0})`}
                    </div>
                    <div className="pnl-label pnl-result-label">PnL {positionInfo.token1Details.symbol}:</div>
                    <div className={`pnl-value pnl-result-value ${!pnlDetails.pnlToken1Formatted.startsWith('-') && pnlDetails.pnlToken1Formatted !== 'N/A' && pnlDetails.pnlToken1Formatted !== 'Data Missing' && pnlDetails.pnlToken1Formatted !== 'Calc Error' && pnlDetails.pnlToken1Formatted !== `0.000000 ${positionInfo.token1Details.symbol}` ? 'positive-pnl' : (pnlDetails.pnlToken1Formatted.startsWith('-') ? 'negative-pnl' : '')}`}>
                        {pnlDetails.pnlToken1Formatted}
                        {pnlDetails.initialValueToken1Formatted !== 'N/A' && !pnlDetails.initialValueToken1Formatted.startsWith('0.0 ') && pnlDetails.profitPercentageToken1 !== 'N/A' && ` (${pnlDetails.profitPercentageToken1})`}
                    </div>
                </div>
            </div>
        )}

        {isWalletConnected && backendOperatorAddress && isNftApprovedForOperator && (!token0ApprovedForSwapRouter || !token1ApprovedForSwapRouter || !token0ApprovedForNftManager || !token1ApprovedForNftManager) && (
            <div className="token-approvals-section">
                <p className="info-label" style={{textAlign: 'center', marginBottom: '0.75rem'}}>Auto-management requires further token approvals:</p>
                {positionInfo.token0Details && nftManagerAddress && swapRouterAddress && (
                    <>
                        {!token0ApprovedForSwapRouter && (
                            <button onClick={() => handleApproveToken(positionInfo.token0Details, swapRouterAddress, `token0Swap-${tokenId}`, setToken0ApprovedForSwapRouter)} disabled={isProcessingTokenApproval === `token0Swap-${tokenId}`} className="action-button approve-token">
                                {isProcessingTokenApproval === `token0Swap-${tokenId}` ? 'Approving...' : `Approve ${positionInfo.token0Details.symbol} for Swapping`}
                            </button>
                        )}
                        {!token0ApprovedForNftManager && (
                             <button onClick={() => handleApproveToken(positionInfo.token0Details, nftManagerAddress, `token0Nft-${tokenId}`, setToken0ApprovedForNftManager)} disabled={isProcessingTokenApproval === `token0Nft-${tokenId}`} className="action-button approve-token">
                                {isProcessingTokenApproval === `token0Nft-${tokenId}` ? 'Approving...' : `Approve ${positionInfo.token0Details.symbol} for Liquidity Mgmt.`}
                             </button>
                        )}
                    </>
                )}
                {positionInfo.token1Details && nftManagerAddress && swapRouterAddress && (
                    <>
                        {!token1ApprovedForSwapRouter && (
                            <button onClick={() => handleApproveToken(positionInfo.token1Details, swapRouterAddress, `token1Swap-${tokenId}`, setToken1ApprovedForSwapRouter)} disabled={isProcessingTokenApproval === `token1Swap-${tokenId}`} className="action-button approve-token">
                                {isProcessingTokenApproval === `token1Swap-${tokenId}` ? 'Approving...' : `Approve ${positionInfo.token1Details.symbol} for Swapping`}
                            </button>
                        )}
                         {!token1ApprovedForNftManager && (
                             <button onClick={() => handleApproveToken(positionInfo.token1Details, nftManagerAddress, `token1Nft-${tokenId}`, setToken1ApprovedForNftManager)} disabled={isProcessingTokenApproval === `token1Nft-${tokenId}`} className="action-button approve-token">
                                {isProcessingTokenApproval === `token1Nft-${tokenId}` ? 'Approving...' : `Approve ${positionInfo.token1Details.symbol} for Liquidity Mgmt.`}
                             </button>
                        )}
                    </>
                )}
            </div>
        )}

        <div className="position-card-actions">
            <button onClick={handleManagePosition} className="action-button manage" disabled={!isWalletConnected}>Manage</button>
            
            {!isNftApprovedForOperator && isWalletConnected && backendOperatorAddress && (
                <button 
                    onClick={handleApproveNftForOperator} 
                    className="action-button approve-operator"
                    disabled={isProcessingApproval || isCheckingApproval}
                >
                    {isProcessingApproval ? 'Approving NFT...' : (isCheckingApproval ? 'Checking NFT...' : 'Approve NFT for Auto-Manage')}
                </button>
            )}

            {isWalletConnected && backendOperatorAddress && (
                <div className="auto-manage-toggle-container">
                    <label htmlFor={`autoManageToggle-${tokenId}`} className="auto-manage-label">
                        Auto-Manage:
                    </label>
                    <button
                        id={`autoManageToggle-${tokenId}`}
                        className={`action-button auto-manage-toggle ${isAutoManageEnabled ? 'active' : ''}`}
                        onClick={handleToggleAutoManage}
                        disabled={
                            !isWalletConnected || 
                            isTogglingAutoManage || 
                            !allApprovalsDone || 
                            isCheckingApproval || 
                            isProcessingApproval || 
                            !!isProcessingTokenApproval
                        }
                        title={
                            isAutoManageEnabled ? "Disable Auto-Management" : 
                            (allApprovalsDone ? "Enable Auto-Management" : "All approvals required (NFT & Tokens)")
                        }
                    >
                        <span className="toggle-switch-circle"></span>
                        <span className="toggle-status-text">{isAutoManageEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                </div>
            )}
        </div>
        {autoManageStatus && <p className="auto-manage-status-message" style={{ color: autoManageStatus.toLowerCase().includes('error') || autoManageStatus.toLowerCase().includes('fail') || autoManageStatus.toLowerCase().includes('required') ? 'red' : (autoManageStatus.toLowerCase().includes('enabled') || autoManageStatus.toLowerCase().includes('approved') || autoManageStatus.toLowerCase().includes('disabled') ? 'green' : '#a5a2b3') }}>{autoManageStatus}</p>}
    </div>
  );
}

export default PositionCard;