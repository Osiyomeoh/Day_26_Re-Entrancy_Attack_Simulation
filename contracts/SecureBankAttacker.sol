// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SecureBank.sol";

// Test contract to demonstrate the security of the secure version

contract AttackerForSecureBank {
    SecureBank public secureBank;
    uint256 public attackAmount;
    uint256 public attackCount;

    event AttackAttempt(uint256 bankBalance, uint256 attackerBalance);

    constructor(address _secureBankAddress) {
        secureBank = SecureBank(_secureBankAddress);
    }

    function attack() external payable {
        require(msg.value >= 1 ether, "Need at least 1 ETH to attack");
        attackAmount = msg.value;

        // Initial attack
        emit AttackAttempt(address(secureBank).balance, address(this).balance);
        secureBank.deposit{value: attackAmount}();
        secureBank.withdraw();
    }

    receive() external payable {
        attackCount++;
        emit AttackAttempt(address(secureBank).balance, address(this).balance);
        
        if (address(secureBank).balance >= attackAmount) {
            try secureBank.withdraw() {
                // This should fail
            } catch {
                // Expected
            }
        }
    }
}