import { expect } from 'chai'
import { ethers } from 'hardhat'

// Helper to encode match ID
const toMatchId = (value: string) => ethers.encodeBytes32String(value);

describe('PocketPokerEscrowCUSD', () => {
    const stakeAmountInUSD_decimal = 100n; // Represents 100 cUSD
    // Assuming cUSD has 18 decimals, like most ERC20 tokens
    const stakeAmountInSmallestUnit = stakeAmountInUSD_decimal * (10n ** 18n); 
    const doubleStakeAmount = stakeAmountInSmallestUnit * 2n;

    let cUsdToken: any; // Mock cUSD token instance
    let escrow: any;     // PocketPokerEscrowCUSD instance
    let owner: any;
    let playerA: any;
    let playerB: any;
    let outsider: any;

    beforeEach(async () => {
        [owner, playerA, playerB, outsider] = await ethers.getSigners();

        // Deploy a mock cUSD token using the MockToken contract from contracts/MockToken.sol
        const MockTokenFactory = await ethers.getContractFactory('MockToken');
        cUsdToken = await MockTokenFactory.deploy('Mock cUSD', 'mcUSD', ethers.parseEther('1000000'));
        await cUsdToken.waitForDeployment();

        // Deploy the PocketPokerEscrowCUSD contract, passing the mock cUSD token address
        const EscrowFactory = await ethers.getContractFactory('PocketPokerEscrowCUSD');
        escrow = await EscrowFactory.deploy(await cUsdToken.getAddress());
        await escrow.waitForDeployment();
    });

    it('deploys successfully and sets cUSD token address', async () => {
        expect(await escrow.owner()).to.equal(owner.address);
        expect(await escrow.cUSDTokenAddress()).to.equal(await cUsdToken.getAddress());
    });

    it('allows players to fund their stake with cUSD and protects against double funding/mismatches', async () => {
        const matchId = toMatchId('stakeGuardCUSD');
        const escrowAddress = await escrow.getAddress();

        // Give players some cUSD
        await cUsdToken.transfer(playerA.address, doubleStakeAmount);
        await cUsdToken.transfer(playerB.address, doubleStakeAmount);

        // Player A funds stake
        await cUsdToken.connect(playerA).approve(escrowAddress, stakeAmountInSmallestUnit);
        await expect(escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit))
            .to.emit(escrow, 'StakeFunded')
            .withArgs(matchId, playerA.address, stakeAmountInSmallestUnit);

        // Player A tries to fund again
        // Ensure approval is reset or sufficient if checking strictly, but contract should revert on state.
        // Actually, if we fund again, we need approval again if transferFrom happens.
        // But contract checks state `esc.playerAFunded` BEFORE transfer. So it should revert StakeAlreadyFunded.
        await expect(escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit))
            .to.be.revertedWithCustomError(escrow, 'StakeAlreadyFunded');

        // Player B tries to fund with wrong amount
        await expect(escrow.connect(playerB).fundStake(matchId, stakeAmountInSmallestUnit / 2n))
            .to.be.revertedWithCustomError(escrow, 'StakeMismatch'); // Mismatch check is before transfer

        // Player B funds stake successfully
        await cUsdToken.connect(playerB).approve(escrowAddress, stakeAmountInSmallestUnit);
        await expect(escrow.connect(playerB).fundStake(matchId, stakeAmountInSmallestUnit))
            .to.emit(escrow, 'StakeFunded')
            .withArgs(matchId, playerB.address, stakeAmountInSmallestUnit);

        // Verify state
        const matchData = await escrow.getMatch(matchId);
        expect(matchData.playerAFunded).to.be.true;
        expect(matchData.playerBFunded).to.be.true;
        expect(matchData.stake).to.equal(stakeAmountInSmallestUnit);
        expect(matchData.playerA).to.equal(playerA.address);
        expect(matchData.playerB).to.equal(playerB.address);

        // Verify contract holds the cUSD
        expect(await cUsdToken.balanceOf(escrowAddress)).to.equal(doubleStakeAmount);
    });

    it('reverts if user tries to fund without approving allowance', async () => {
        const matchId = toMatchId('allowanceFail');

        await cUsdToken.transfer(playerA.address, stakeAmountInSmallestUnit); // Give player A enough cUSD

        // Player A tries to fund without approving
        // Participant checks pass (slot empty), then allowance check fails.
        await expect(escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit))
            .to.be.revertedWithCustomError(escrow, 'InsufficientTokenAllowance');
    });

    it('reverts if user tries to fund with zero amount', async () => {
        const matchId = toMatchId('zeroStakeFail');

        await expect(escrow.connect(playerA).fundStake(matchId, 0n))
            .to.be.revertedWithCustomError(escrow, 'InvalidStakeAmount');
    });

    it('reverts if a non-participant tries to fund or mark ready', async () => {
        const matchId = toMatchId('guardsCUSD');
        const escrowAddress = await escrow.getAddress();

        await cUsdToken.transfer(playerA.address, stakeAmountInSmallestUnit);
        await cUsdToken.transfer(playerB.address, stakeAmountInSmallestUnit);

        await cUsdToken.connect(playerA).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit);
        await cUsdToken.connect(playerB).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerB).fundStake(matchId, stakeAmountInSmallestUnit);

        // Outsider tries to fund
        // This should revert NotParticipant (state check) BEFORE allowance check.
        await expect(escrow.connect(outsider).fundStake(matchId, stakeAmountInSmallestUnit))
            .to.be.revertedWithCustomError(escrow, 'NotParticipant');

        // Outsider tries to mark ready
        await expect(escrow.connect(outsider).markReady(matchId))
            .to.be.revertedWithCustomError(escrow, 'NotParticipant');
    });

    it('requires players to be funded before marking ready', async () => {
        const matchId = toMatchId('readyGateCUSD');
        const escrowAddress = await escrow.getAddress();
        await cUsdToken.transfer(playerA.address, stakeAmountInSmallestUnit);

        // Player A tries to mark ready without funding (playerA's address is not set in the contract yet)
        await expect(escrow.connect(playerA).markReady(matchId)).to.be.revertedWithCustomError(
            escrow,
            'NotParticipant' 
        );

        // Player A funds
        await cUsdToken.connect(playerA).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit);

        // Player A marks ready
        await expect(escrow.connect(playerA).markReady(matchId))
            .to.emit(escrow, 'PlayerReady')
            .withArgs(matchId, playerA.address);

        // Player A tries to mark ready again
        await expect(escrow.connect(playerA).markReady(matchId))
            .to.be.revertedWithCustomError(escrow, 'AlreadyReady');
    });

    it('pays out the winner with cUSD once both players are ready', async () => {
        const matchId = toMatchId('payoutCUSD');
        const escrowAddress = await escrow.getAddress();
        await cUsdToken.transfer(playerA.address, doubleStakeAmount); 
        await cUsdToken.transfer(playerB.address, doubleStakeAmount);

        await cUsdToken.connect(playerA).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit);

        await cUsdToken.connect(playerB).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerB).fundStake(matchId, stakeAmountInSmallestUnit);

        await escrow.connect(playerA).markReady(matchId);
        await escrow.connect(playerB).markReady(matchId);

        const totalPot = doubleStakeAmount; // 200 cUSD

        // Check contract balance before payout
        expect(await cUsdToken.balanceOf(escrowAddress)).to.equal(totalPot);

        // Owner initiates payout
        const payoutTx = escrow.connect(owner).payoutWinner(matchId, playerA.address);

        // Verify balances: Player A receives the pot, contract balance decreases
        await expect(payoutTx).to.changeTokenBalances(cUsdToken, [playerA, escrow], [totalPot, -totalPot]);

        // Verify event
        await expect(payoutTx)
            .to.emit(escrow, 'MatchResolved')
            .withArgs(matchId, playerA.address, totalPot);

        // Verify state after resolution
        const matchData = await escrow.getMatch(matchId);
        expect(matchData.resolved).to.be.true;
        expect(matchData.winner).to.equal(playerA.address);
        expect(matchData.stake).to.equal(0n); // Stake reset

        // Verify contract balance after payout
        expect(await cUsdToken.balanceOf(escrowAddress)).to.equal(0n);

        // Try to payout again
        await expect(escrow.connect(owner).payoutWinner(matchId, playerA.address)).to.be.revertedWithCustomError(
            escrow,
            'MatchAlreadyResolved',
        );
    });

    it('reverts payout if match is not ready or not fully funded', async () => {
        const matchId = toMatchId('payoutGuardsCUSD');
        const escrowAddress = await escrow.getAddress();
        await cUsdToken.transfer(playerA.address, stakeAmountInSmallestUnit);
        await cUsdToken.transfer(playerB.address, stakeAmountInSmallestUnit);

        await cUsdToken.connect(playerA).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit);
        // Only player A funded, player B not funded or ready

        // Try to payout when not fully funded
        await expect(escrow.connect(owner).payoutWinner(matchId, playerA.address))
            .to.be.revertedWithCustomError(escrow, 'NotFullyFunded');

        // Player B funds, but isn't ready
        await cUsdToken.connect(playerB).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerB).fundStake(matchId, stakeAmountInSmallestUnit);
        // Both funded, but only Player A is ready

        // Try to payout when not ready
        await expect(escrow.connect(owner).payoutWinner(matchId, playerA.address))
            .to.be.revertedWithCustomError(escrow, 'NotReady');
    });

    it('reverts payout with invalid winner address', async () => {
        const matchId = toMatchId('invalidWinnerCUSD');
        const escrowAddress = await escrow.getAddress();
        
        // Ensure sufficient cUSD is available for funding
        await cUsdToken.transfer(playerA.address, doubleStakeAmount);
        await cUsdToken.transfer(playerB.address, doubleStakeAmount);

        // Fund stakes for both players
        await cUsdToken.connect(playerA).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit);
        
        await cUsdToken.connect(playerB).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerB).fundStake(matchId, stakeAmountInSmallestUnit);

        // Mark both players ready
        await escrow.connect(playerA).markReady(matchId);
        await escrow.connect(playerB).markReady(matchId);

        // Try to payout with an address that is not playerA or playerB
        await expect(escrow.connect(owner).payoutWinner(matchId, outsider.address))
            .to.be.revertedWithCustomError(escrow, 'InvalidWinner');
    });

    it('reverts payout if contract does not have enough cUSD (simulated)', async () => {
        const matchId = toMatchId('insufficientFundsCUSD');
        const escrowAddress = await escrow.getAddress();
        // Ensure sufficient cUSD is available for funding
        await cUsdToken.transfer(playerA.address, stakeAmountInSmallestUnit);
        await cUsdToken.transfer(playerB.address, stakeAmountInSmallestUnit);

        // Fund stakes for both players
        await cUsdToken.connect(playerA).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit);
        
        await cUsdToken.connect(playerB).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerB).fundStake(matchId, stakeAmountInSmallestUnit);
        
        // Mark both players ready
        await escrow.connect(playerA).markReady(matchId);
        await escrow.connect(playerB).markReady(matchId);

        // Simulate contract having insufficient funds by draining its balance before payout
        const totalPot = doubleStakeAmount; // Total pot is 200 cUSD
        
        // Check initial contract balance after funding
        expect(await cUsdToken.balanceOf(escrowAddress)).to.equal(totalPot);

        // Drain contract balance using forceTransfer (backdoor in MockToken)
        await cUsdToken.forceTransfer(escrowAddress, owner.address, totalPot);
        
        // After this line, the contract balance should be 0.
        expect(await cUsdToken.balanceOf(escrowAddress)).to.equal(0n);

        // Now attempt payout, which should fail because contract has 0 cUSD
        await expect(escrow.connect(owner).payoutWinner(matchId, playerA.address))
            .to.be.revertedWithCustomError(escrow, 'TransferFailed');
    });


    it('returns correct match data', async () => {
        const matchId = toMatchId('getDataCUSD');
        const escrowAddress = await escrow.getAddress();
        await cUsdToken.transfer(playerA.address, stakeAmountInSmallestUnit);
        await cUsdToken.transfer(playerB.address, stakeAmountInSmallestUnit);

        await cUsdToken.connect(playerA).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit);

        await cUsdToken.connect(playerB).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerB).fundStake(matchId, stakeAmountInSmallestUnit);

        const matchDataInitial = await escrow.getMatch(matchId);
        expect(matchDataInitial.playerA).to.equal(playerA.address);
        expect(matchDataInitial.playerB).to.equal(playerB.address);
        expect(matchDataInitial.stake).to.equal(stakeAmountInSmallestUnit);
        expect(matchDataInitial.playerAFunded).to.be.true;
        expect(matchDataInitial.playerBFunded).to.be.true;
        expect(matchDataInitial.resolved).to.be.false;

        await escrow.connect(playerA).markReady(matchId);
        const matchDataAfterReady = await escrow.getMatch(matchId);
        expect(matchDataAfterReady.playerAReady).to.be.true;

        await escrow.connect(playerB).markReady(matchId);
        await escrow.connect(owner).payoutWinner(matchId, playerA.address);

        const matchDataResolved = await escrow.getMatch(matchId);
        expect(matchDataResolved.resolved).to.be.true;
        expect(matchDataResolved.winner).to.equal(playerA.address);
    });

    it('returns correct pot amount', async () => {
        const matchId = toMatchId('potAmountCUSD');
        const escrowAddress = await escrow.getAddress();
        expect(await escrow.potAmount(matchId)).to.equal(0n); // Before funding

        await cUsdToken.transfer(playerA.address, stakeAmountInSmallestUnit);
        await cUsdToken.transfer(playerB.address, stakeAmountInSmallestUnit);

        await cUsdToken.connect(playerA).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerA).fundStake(matchId, stakeAmountInSmallestUnit);
        expect(await escrow.potAmount(matchId)).to.equal(0n); // Still not fully funded

        await cUsdToken.connect(playerB).approve(escrowAddress, stakeAmountInSmallestUnit);
        await escrow.connect(playerB).fundStake(matchId, stakeAmountInSmallestUnit);
        expect(await escrow.potAmount(matchId)).to.equal(doubleStakeAmount); // Fully funded

        await escrow.connect(playerA).markReady(matchId);
        await escrow.connect(playerB).markReady(matchId);
        expect(await escrow.potAmount(matchId)).to.equal(doubleStakeAmount); // Ready, pot is correct

        await escrow.connect(owner).payoutWinner(matchId, playerA.address);
        expect(await escrow.potAmount(matchId)).to.equal(0n); // Resolved, pot is 0
    });
});
