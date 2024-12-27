import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Re-Entrancy Attack", function () {
  async function deployContractsFixture() {
    const [owner, attacker] = await hre.ethers.getSigners();

    // Deploy contracts
    const VulnerableBank = await hre.ethers.getContractFactory("VulnerableBank");
    const vulnerableBank = await VulnerableBank.deploy();

    const SecureBank = await hre.ethers.getContractFactory("SecureBank");
    const secureBank = await SecureBank.deploy();

    const Attacker = await hre.ethers.getContractFactory("Attacker");
    const attackerContract = await Attacker.deploy(await vulnerableBank.getAddress());

    const AttackerForSecureBank = await hre.ethers.getContractFactory("AttackerForSecureBank");
    const secureAttackerContract = await AttackerForSecureBank.deploy(await secureBank.getAddress());

    return {
      vulnerableBank,
      secureBank,
      attackerContract,
      secureAttackerContract,
      owner,
      attacker
    };
  }

  describe("Vulnerable Bank", function () {
    it("Should allow normal deposit and withdrawal", async function () {
      const { vulnerableBank, owner } = await loadFixture(deployContractsFixture);
      
      // Test deposit
      const depositAmount = hre.ethers.parseEther("1.0");
      await vulnerableBank.connect(owner).deposit({ value: depositAmount });
      
      const userBalance = await vulnerableBank.balances(owner.address);
      expect(userBalance).to.equal(depositAmount);
      
      // Test withdrawal
      await vulnerableBank.connect(owner).withdraw();
      const finalBalance = await vulnerableBank.balances(owner.address);
      expect(finalBalance).to.equal(0);
    });

    it("Should be vulnerable to re-entrancy attack", async function () {
      const { vulnerableBank, attackerContract, attacker } = await loadFixture(deployContractsFixture);
      
      // Initial bank funding
      await vulnerableBank.deposit({ value: hre.ethers.parseEther("10.0") });
      
      // Launch attack
      const attackAmount = hre.ethers.parseEther("1.0");
      const bankBalanceBefore = await vulnerableBank.getBalance();
      
      await attackerContract.connect(attacker).attack({ value: attackAmount });
      await attackerContract.connect(attacker).collectStolenFunds();
      
      const bankBalanceAfter = await vulnerableBank.getBalance();
      
      // Verify attack was successful (more than attackAmount was drained)
      expect(bankBalanceAfter).to.be.lessThan(bankBalanceBefore - attackAmount);
    });
  });

  describe("Secure Bank", function () {
    it("Should allow normal deposit and withdrawal", async function () {
      const { secureBank, owner } = await loadFixture(deployContractsFixture);
      
      // Test deposit
      const depositAmount = hre.ethers.parseEther("1.0");
      await secureBank.connect(owner).deposit({ value: depositAmount });
      
      const userBalance = await secureBank.balances(owner.address);
      expect(userBalance).to.equal(depositAmount);
      
      // Test withdrawal
      await secureBank.connect(owner).withdraw();
      const finalBalance = await secureBank.balances(owner.address);
      expect(finalBalance).to.equal(0);
    });

    // it("Should prevent re-entrancy attack", async function () {
    //   const { secureBank, secureAttackerContract, attacker } = await loadFixture(deployContractsFixture);

    //   // Initial bank funding
    //   await secureBank.deposit({ value: hre.ethers.parseEther("10.0") });
      
    //   // Try the attack
    //   const attackAmount = hre.ethers.parseEther("1.0");
    //   const bankBalanceBefore = await secureBank.getBalance();
      
    //   await secureAttackerContract.connect(attacker).attack({ value: attackAmount });
      
    //   const bankBalanceAfter = await secureBank.getBalance();
      
    //   // Bank should only reduce by the legitimate withdrawal amount
    //   expect(bankBalanceAfter).to.equal(bankBalanceBefore - attackAmount);
    // });
    
    it("Should revert on re-entrant calls", async function () {
      const { secureBank, secureAttackerContract, attacker } = await loadFixture(deployContractsFixture);
      
      // Initial bank funding
      await secureBank.deposit({ value: hre.ethers.parseEther("10.0") });
      
      // Attempt attack
      const attackAmount = hre.ethers.parseEther("1.0");
      await secureAttackerContract.connect(attacker).attack({ value: attackAmount });
      
      // Check attack count (should only succeed once)
      expect(await secureAttackerContract.attackCount()).to.equal(1n);
    });
  });

  describe("Attack Mechanics", function () {
    it("Should track attack attempts", async function () {
      const { secureBank, secureAttackerContract, attacker } = await loadFixture(deployContractsFixture);
      
      // Fund bank
      await secureBank.deposit({ value: hre.ethers.parseEther("10.0") });
      
      // Launch attack
      const attackAmount = hre.ethers.parseEther("1.0");
      await secureAttackerContract.connect(attacker).attack({ value: attackAmount });
      
      // Verify attack tracking
      expect(await secureAttackerContract.attackAmount()).to.equal(attackAmount);
      expect(await secureAttackerContract.attackCount()).to.equal(1n);
    });

    it("Should allow attacker to withdraw stolen funds from vulnerable bank", async function () {
      const { vulnerableBank, attackerContract, attacker } = await loadFixture(deployContractsFixture);
      
      // Fund bank
      await vulnerableBank.deposit({ value: hre.ethers.parseEther("10.0") });
      
      // Launch attack
      const attackAmount = hre.ethers.parseEther("1.0");
      await attackerContract.connect(attacker).attack({ value: attackAmount });
      
      // Check attacker can withdraw funds
      const balanceBefore = await hre.ethers.provider.getBalance(attacker.address);
      await attackerContract.connect(attacker).collectStolenFunds();
      const balanceAfter = await hre.ethers.provider.getBalance(attacker.address);
      
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });
});