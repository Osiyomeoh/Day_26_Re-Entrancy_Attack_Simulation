// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Vunerable.sol";

// This is the secure version of the bank contract
contract SecureBank {
    mapping(address => uint256) public balances;
    bool private locked;

    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);
    event Debug(string message, uint256 value);

    modifier noReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    // Fix: Made deposit function more explicit
    function deposit() public payable {
        require(msg.value > 0, "Must send ETH");
        emit Debug("Deposit amount", msg.value);
        emit Debug("Previous balance", balances[msg.sender]);
        
        balances[msg.sender] += msg.value;
        
        emit Debug("New balance", balances[msg.sender]);
        emit Deposit(msg.sender, msg.value);
    }

    // Fix: Made withdrawal more robust
    function withdraw() public noReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        require(address(this).balance >= amount, "Contract has insufficient funds");
        emit Debug("Withdrawal amount", amount);
        
        // Zero the balance before transfer
        balances[msg.sender] = 0;
        emit Debug("Balance after setting to 0", balances[msg.sender]);

        // Transfer the funds
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawal(msg.sender, amount);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
