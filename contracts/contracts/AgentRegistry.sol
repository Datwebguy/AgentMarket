// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentRegistry
 * @notice On-chain registry for AI agents on AgentMarket.
 *         Deployed on X Layer (OKX L2, chain ID 196).
 *
 * Responsibilities:
 * - Register agents with their wallet address, price, and metadata hash
 * - Record every x402 call settlement on-chain
 * - Maintain agent reputation scores
 * - Allow builders to update or suspend their agents
 * - Collect platform fees (5%) on each settlement
 *
 * USDC on X Layer: 0x74b7F16337b8972027F6196A17a631aC6dE26d22
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IUSDC is IERC20 {
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8   v,
        bytes32 r,
        bytes32 s
    ) external;
}

contract AgentRegistry is Ownable, ReentrancyGuard, Pausable {

    // ─── CONSTANTS ────────────────────────────────────────────────────────────
    uint256 public constant PLATFORM_FEE_BPS  = 500;   // 5%
    uint256 public constant BPS_DENOMINATOR   = 10_000;
    uint256 public constant LISTING_FEE_USDC  = 10_000; // 0.01 USDC (6 decimals)
    uint256 public constant MAX_PRICE_USDC    = 100_000_000; // 100 USDC

    IUSDC public immutable usdc;

    // ─── STRUCTS ──────────────────────────────────────────────────────────────
    struct Agent {
        address owner;
        address wallet;          // Agent's earning wallet
        uint256 pricePerCall;    // In USDC base units (6 decimals)
        bytes32 metadataHash;    // IPFS CID of agent metadata JSON
        uint64  totalCalls;
        uint256 totalEarned;     // USDC earned (6 decimals)
        uint32  avgResponseMs;
        uint32  registeredAt;
        bool    active;
        bool    verified;        // Manually verified by platform
    }

    struct CallRecord {
        bytes32 agentId;
        address caller;
        uint256 amount;          // USDC amount (6 decimals)
        uint256 agentEarned;
        uint256 platformFee;
        uint32  responseMs;
        uint32  timestamp;
    }

    // ─── STATE ────────────────────────────────────────────────────────────────
    mapping(bytes32 => Agent)  public agents;
    bytes32[]                  public agentIds;
    mapping(bytes32 => bool)   public usedNonces;        // x402 replay protection
    mapping(address => bytes32[]) public ownerAgents;    // owner -> agent IDs

    uint256 public platformFeesCollected;
    uint256 public totalCallsExecuted;
    uint256 public totalVolumeUsdc;

    // ─── EVENTS ───────────────────────────────────────────────────────────────
    event AgentRegistered(
        bytes32 indexed agentId,
        address indexed owner,
        address indexed wallet,
        uint256 pricePerCall
    );
    event AgentUpdated(bytes32 indexed agentId);
    event AgentSuspended(bytes32 indexed agentId);
    event AgentActivated(bytes32 indexed agentId);
    event AgentVerified(bytes32 indexed agentId);

    event CallSettled(
        bytes32 indexed agentId,
        address indexed caller,
        uint256 amount,
        uint256 agentEarned,
        uint256 platformFee,
        uint32  responseMs
    );

    event PlatformFeesWithdrawn(address indexed to, uint256 amount);

    // ─── ERRORS ───────────────────────────────────────────────────────────────
    error AgentNotFound();
    error AgentNotActive();
    error AgentAlreadyExists();
    error NotAgentOwner();
    error InsufficientPayment();
    error NonceAlreadyUsed();
    error InvalidPrice();
    error PlatformFeePaymentFailed();

    // ─── CONSTRUCTOR ──────────────────────────────────────────────────────────
    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IUSDC(_usdc);
    }

    // ─── AGENT REGISTRATION ──────────────────────────────────────────────────

    /**
     * @notice Register a new agent on the marketplace.
     * @param agentId       Unique bytes32 ID (keccak256 of slug)
     * @param agentWallet   Wallet that will receive earnings
     * @param pricePerCall  USDC amount per call (6 decimals, e.g. 2000 = $0.002)
     * @param metadataHash  IPFS hash of metadata JSON
     */
    function registerAgent(
        bytes32 agentId,
        address agentWallet,
        uint256 pricePerCall,
        bytes32 metadataHash
    ) external nonReentrant whenNotPaused {
        if (agents[agentId].owner != address(0)) revert AgentAlreadyExists();
        if (pricePerCall == 0 || pricePerCall > MAX_PRICE_USDC) revert InvalidPrice();

        // Charge listing fee
        bool ok = usdc.transferFrom(msg.sender, address(this), LISTING_FEE_USDC);
        if (!ok) revert PlatformFeePaymentFailed();
        platformFeesCollected += LISTING_FEE_USDC;

        agents[agentId] = Agent({
            owner:          msg.sender,
            wallet:         agentWallet,
            pricePerCall:   pricePerCall,
            metadataHash:   metadataHash,
            totalCalls:     0,
            totalEarned:    0,
            avgResponseMs:  0,
            registeredAt:   uint32(block.timestamp),
            active:         true,
            verified:       false
        });

        agentIds.push(agentId);
        ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, agentWallet, pricePerCall);
    }

    // ─── x402 CALL SETTLEMENT ─────────────────────────────────────────────────

    /**
     * @notice Settle an x402 agent call payment on-chain.
     *
     * Called by the platform backend after verifying the EIP-3009 signature.
     * The USDC transferWithAuthorization moves funds atomically:
     *   - 95% to agent wallet
     *   - 5% retained in contract for platform
     *
     * @param agentId       The agent being called
     * @param from          Caller's wallet (payer)
     * @param value         Total USDC amount (6 decimals)
     * @param validAfter    EIP-3009 timing
     * @param validBefore   EIP-3009 expiry
     * @param nonce         EIP-3009 nonce (replay protection)
     * @param v,r,s         EIP-712 signature
     * @param responseMs    Agent response time (for stats)
     */
    function settleCall(
        bytes32 agentId,
        address from,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8   v,
        bytes32 r,
        bytes32 s,
        uint32  responseMs
    ) external nonReentrant whenNotPaused onlyOwner {
        Agent storage agent = agents[agentId];
        if (agent.owner == address(0)) revert AgentNotFound();
        if (!agent.active)             revert AgentNotActive();
        if (usedNonces[nonce])         revert NonceAlreadyUsed();
        if (value < agent.pricePerCall) revert InsufficientPayment();

        // Mark nonce used (replay protection)
        usedNonces[nonce] = true;

        // Calculate fee split
        uint256 platformFee  = (value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 agentEarned  = value - platformFee;

        // Execute EIP-3009 transferWithAuthorization
        // This atomically moves USDC from caller to this contract
        usdc.transferWithAuthorization(
            from, address(this), value,
            validAfter, validBefore, nonce, v, r, s
        );

        // Forward 95% to agent wallet immediately
        bool sent = usdc.transfer(agent.wallet, agentEarned);
        require(sent, "Agent transfer failed");

        // Accumulate platform fee (withdrawn separately)
        platformFeesCollected += platformFee;
        totalVolumeUsdc       += value;

        // Update agent stats
        agent.totalCalls++;
        agent.totalEarned += agentEarned;
        if (agent.avgResponseMs == 0) {
            agent.avgResponseMs = responseMs;
        } else {
            agent.avgResponseMs = uint32(
                (uint256(agent.avgResponseMs) + responseMs) / 2
            );
        }

        totalCallsExecuted++;

        emit CallSettled(agentId, from, value, agentEarned, platformFee, responseMs);
    }

    // ─── AGENT MANAGEMENT ────────────────────────────────────────────────────

    function updateAgentPrice(bytes32 agentId, uint256 newPrice) external {
        if (agents[agentId].owner != msg.sender) revert NotAgentOwner();
        if (newPrice == 0 || newPrice > MAX_PRICE_USDC) revert InvalidPrice();
        agents[agentId].pricePerCall = newPrice;
        emit AgentUpdated(agentId);
    }

    function updateAgentWallet(bytes32 agentId, address newWallet) external {
        if (agents[agentId].owner != msg.sender) revert NotAgentOwner();
        agents[agentId].wallet = newWallet;
        emit AgentUpdated(agentId);
    }

    function updateAgentMetadata(bytes32 agentId, bytes32 newHash) external {
        if (agents[agentId].owner != msg.sender) revert NotAgentOwner();
        agents[agentId].metadataHash = newHash;
        emit AgentUpdated(agentId);
    }

    function suspendAgent(bytes32 agentId) external {
        Agent storage a = agents[agentId];
        if (a.owner != msg.sender && owner() != msg.sender) revert NotAgentOwner();
        a.active = false;
        emit AgentSuspended(agentId);
    }

    function activateAgent(bytes32 agentId) external {
        if (agents[agentId].owner != msg.sender) revert NotAgentOwner();
        agents[agentId].active = true;
        emit AgentActivated(agentId);
    }

    // ─── ADMIN ────────────────────────────────────────────────────────────────

    function verifyAgent(bytes32 agentId) external onlyOwner {
        agents[agentId].verified = true;
        emit AgentVerified(agentId);
    }

    function withdrawPlatformFees(address to) external onlyOwner nonReentrant {
        uint256 amount = platformFeesCollected;
        platformFeesCollected = 0;
        bool ok = usdc.transfer(to, amount);
        require(ok, "Fee withdrawal failed");
        emit PlatformFeesWithdrawn(to, amount);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── VIEW FUNCTIONS ───────────────────────────────────────────────────────

    function getAgent(bytes32 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }

    function getOwnerAgents(address owner) external view returns (bytes32[] memory) {
        return ownerAgents[owner];
    }

    function getTotalAgents() external view returns (uint256) {
        return agentIds.length;
    }

    function isNonceUsed(bytes32 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }

    function getPlatformStats() external view returns (
        uint256 _totalAgents,
        uint256 _totalCalls,
        uint256 _totalVolume,
        uint256 _feesCollected
    ) {
        return (
            agentIds.length,
            totalCallsExecuted,
            totalVolumeUsdc,
            platformFeesCollected
        );
    }
}
