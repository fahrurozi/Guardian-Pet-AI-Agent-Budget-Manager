// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice On-chain spending firewall for AI agents on Monad.
/// Each registered agent ("pet") has a daily MON budget enforced trustlessly.
contract GuardianBudgetManager is Ownable, ReentrancyGuard {
    struct Agent {
        string name;
        string petEmoji;
        uint256 dailyLimit;
        uint256 spentToday;
        uint256 lastResetTimestamp;
        bool isRegistered;
        bool isRevoked;
    }

    mapping(address => Agent) public agents;
    address[] public agentList;

    event Deposited(address indexed by, uint256 amount);
    event AgentRegistered(address indexed agent, string name, string petEmoji, uint256 dailyLimit);
    event DailyLimitSet(address indexed agent, uint256 newLimit);
    event PaymentExecuted(address indexed agent, address indexed to, uint256 amount, string reason);
    event LimitExceeded(address indexed agent, uint256 attempted, uint256 remaining);
    event AgentRevoked(address indexed agent);
    event AgentRestored(address indexed agent);
    event DailySpendReset(address indexed agent);
    event Withdrawn(address indexed to, uint256 amount);

    constructor() Ownable(msg.sender) {}

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function deposit() external payable {
        require(msg.value > 0, "Must send MON");
        emit Deposited(msg.sender, msg.value);
    }

    function registerAgent(
        address agent,
        string calldata name,
        string calldata petEmoji,
        uint256 dailyLimit
    ) external onlyOwner {
        require(agent != address(0), "Invalid address");
        require(!agents[agent].isRegistered, "Already registered");
        require(bytes(name).length > 0, "Name required");

        agents[agent] = Agent({
            name: name,
            petEmoji: petEmoji,
            dailyLimit: dailyLimit,
            spentToday: 0,
            lastResetTimestamp: block.timestamp,
            isRegistered: true,
            isRevoked: false
        });
        agentList.push(agent);

        emit AgentRegistered(agent, name, petEmoji, dailyLimit);
    }

    function setDailyLimit(address agent, uint256 amount) external onlyOwner {
        require(agents[agent].isRegistered, "Not registered");
        agents[agent].dailyLimit = amount;
        emit DailyLimitSet(agent, amount);
    }

    /// @notice The only way an agent can transfer MON — enforces daily budget.
    function executePayment(
        address payable to,
        uint256 amount,
        string calldata reason
    ) external nonReentrant {
        Agent storage agent = agents[msg.sender];
        require(agent.isRegistered, "Not a registered agent");
        require(!agent.isRevoked, "Agent is revoked");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(address(this).balance >= amount, "Insufficient contract balance");

        // Auto-reset spend if 24 hours have passed
        if (block.timestamp >= agent.lastResetTimestamp + 1 days) {
            agent.spentToday = 0;
            agent.lastResetTimestamp = block.timestamp;
            emit DailySpendReset(msg.sender);
        }

        uint256 remaining = agent.dailyLimit > agent.spentToday
            ? agent.dailyLimit - agent.spentToday
            : 0;

        if (amount > remaining) {
            emit LimitExceeded(msg.sender, amount, remaining);
            revert("Daily limit exceeded");
        }

        agent.spentToday += amount;

        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");

        emit PaymentExecuted(msg.sender, to, amount, reason);
    }

    function revokeAgent(address agent) external onlyOwner {
        require(agents[agent].isRegistered, "Not registered");
        require(!agents[agent].isRevoked, "Already revoked");
        agents[agent].isRevoked = true;
        emit AgentRevoked(agent);
    }

    function restoreAgent(address agent) external onlyOwner {
        require(agents[agent].isRegistered, "Not registered");
        require(agents[agent].isRevoked, "Not revoked");
        agents[agent].isRevoked = false;
        emit AgentRestored(agent);
    }

    function resetDailySpend(address agent) external onlyOwner {
        require(agents[agent].isRegistered, "Not registered");
        agents[agent].spentToday = 0;
        agents[agent].lastResetTimestamp = block.timestamp;
        emit DailySpendReset(agent);
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
        emit Withdrawn(owner(), amount);
    }

    function withdrawAll() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        require(bal > 0, "Nothing to withdraw");
        (bool success, ) = payable(owner()).call{value: bal}("");
        require(success, "Transfer failed");
        emit Withdrawn(owner(), bal);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getAgent(address agent) external view returns (
        string memory name,
        string memory petEmoji,
        uint256 dailyLimit,
        uint256 spentToday,
        uint256 lastResetTimestamp,
        bool isRegistered,
        bool isRevoked,
        uint256 remainingToday
    ) {
        Agent storage a = agents[agent];
        uint256 spent = a.spentToday;
        if (block.timestamp >= a.lastResetTimestamp + 1 days) {
            spent = 0;
        }
        uint256 remaining = a.dailyLimit > spent ? a.dailyLimit - spent : 0;
        return (
            a.name,
            a.petEmoji,
            a.dailyLimit,
            spent,
            a.lastResetTimestamp,
            a.isRegistered,
            a.isRevoked,
            remaining
        );
    }

    function getAgentList() external view returns (address[] memory) {
        return agentList;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function owner() public view override returns (address) {
        return super.owner();
    }
}
