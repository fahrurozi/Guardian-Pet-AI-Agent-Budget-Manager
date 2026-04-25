// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/GuardianBudgetManager.sol";

contract GuardianBudgetManagerTest is Test {
    GuardianBudgetManager public guardian;
    address public owner;
    address public agent1;
    address public agent2;
    address public recipient;

    uint256 constant DAILY_LIMIT = 1 ether;

    receive() external payable {}

    function setUp() public {
        owner = address(this);
        agent1 = makeAddr("agent1");
        agent2 = makeAddr("agent2");
        recipient = makeAddr("recipient");

        guardian = new GuardianBudgetManager();
        // Fund the contract
        vm.deal(address(guardian), 10 ether);
    }

    function test_Deposit() public {
        uint256 balBefore = address(guardian).balance;
        guardian.deposit{value: 1 ether}();
        assertEq(address(guardian).balance, balBefore + 1 ether);
    }

    function test_RegisterAgent() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);

        (
            string memory name,
            string memory emoji,
            uint256 dailyLimit,
            ,
            ,
            bool isRegistered,
            bool isRevoked,

        ) = guardian.getAgent(agent1);

        assertEq(name, "Whiskers");
        assertEq(emoji, "cat");
        assertEq(dailyLimit, DAILY_LIMIT);
        assertTrue(isRegistered);
        assertFalse(isRevoked);
    }

    function test_RegisterAgent_OnlyOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        guardian.registerAgent(agent2, "Buddy", "dog", DAILY_LIMIT);
    }

    function test_ExecutePayment_WithinLimit() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);

        uint256 recipientBefore = recipient.balance;

        vm.prank(agent1);
        guardian.executePayment(payable(recipient), 0.5 ether, "API call");

        assertEq(recipient.balance, recipientBefore + 0.5 ether);
    }

    function test_ExecutePayment_ExceedsLimit() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);

        vm.prank(agent1);
        vm.expectRevert("Daily limit exceeded");
        guardian.executePayment(payable(recipient), 2 ether, "Too expensive");
    }

    function test_ExecutePayment_CumulativeLimit() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);

        vm.prank(agent1);
        guardian.executePayment(payable(recipient), 0.6 ether, "First call");

        vm.prank(agent1);
        vm.expectRevert("Daily limit exceeded");
        guardian.executePayment(payable(recipient), 0.6 ether, "Second call - should fail");
    }

    function test_DailyReset_After24Hours() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);

        vm.prank(agent1);
        guardian.executePayment(payable(recipient), 0.9 ether, "Near limit");

        // Advance time by 25 hours
        vm.warp(block.timestamp + 25 hours);

        // Should succeed after reset
        vm.prank(agent1);
        guardian.executePayment(payable(recipient), 0.9 ether, "After reset");
    }

    function test_RevokeAgent() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);
        guardian.revokeAgent(agent1);

        vm.prank(agent1);
        vm.expectRevert("Agent is revoked");
        guardian.executePayment(payable(recipient), 0.1 ether, "Should fail");
    }

    function test_RestoreAgent() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);
        guardian.revokeAgent(agent1);
        guardian.restoreAgent(agent1);

        vm.prank(agent1);
        guardian.executePayment(payable(recipient), 0.1 ether, "Restored");
    }

    function test_SetDailyLimit() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);
        guardian.setDailyLimit(agent1, 2 ether);

        vm.prank(agent1);
        guardian.executePayment(payable(recipient), 1.5 ether, "Higher limit");
    }

    function test_UnregisteredAgent_CannotPay() public {
        vm.prank(agent1);
        vm.expectRevert("Not a registered agent");
        guardian.executePayment(payable(recipient), 0.1 ether, "Not registered");
    }

    function test_MultipleAgents_IndependentLimits() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", 0.5 ether);
        guardian.registerAgent(agent2, "Buddy", "dog", 1 ether);

        vm.prank(agent1);
        guardian.executePayment(payable(recipient), 0.4 ether, "Agent1 call");

        // agent2 has its own limit — should succeed
        vm.prank(agent2);
        guardian.executePayment(payable(recipient), 0.9 ether, "Agent2 call");

        // agent1 exceeded their limit
        vm.prank(agent1);
        vm.expectRevert("Daily limit exceeded");
        guardian.executePayment(payable(recipient), 0.4 ether, "Agent1 over limit");
    }

    function test_GetAgentList() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);
        guardian.registerAgent(agent2, "Buddy", "dog", DAILY_LIMIT);

        address[] memory list = guardian.getAgentList();
        assertEq(list.length, 2);
        assertEq(list[0], agent1);
        assertEq(list[1], agent2);
    }

    function test_Events_PaymentExecuted() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);

        vm.expectEmit(true, true, false, true);
        emit GuardianBudgetManager.PaymentExecuted(agent1, recipient, 0.1 ether, "test");

        vm.prank(agent1);
        guardian.executePayment(payable(recipient), 0.1 ether, "test");
    }

    function test_Events_LimitExceeded() public {
        guardian.registerAgent(agent1, "Whiskers", "cat", DAILY_LIMIT);

        vm.expectEmit(true, false, false, false);
        emit GuardianBudgetManager.LimitExceeded(agent1, 2 ether, DAILY_LIMIT);

        vm.prank(agent1);
        vm.expectRevert("Daily limit exceeded");
        guardian.executePayment(payable(recipient), 2 ether, "over limit");
    }

    function test_Withdraw_PartialAmount() public {
        uint256 ownerBefore = owner.balance;
        guardian.withdraw(1 ether);
        assertEq(address(guardian).balance, 9 ether);
        assertEq(owner.balance, ownerBefore + 1 ether);
    }

    function test_WithdrawAll() public {
        uint256 ownerBefore = owner.balance;
        guardian.withdrawAll();
        assertEq(address(guardian).balance, 0);
        assertEq(owner.balance, ownerBefore + 10 ether);
    }

    function test_Withdraw_OnlyOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        guardian.withdraw(1 ether);
    }

    function test_Withdraw_InsufficientBalance() public {
        vm.expectRevert("Insufficient balance");
        guardian.withdraw(100 ether);
    }
}
