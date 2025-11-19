import { expect } from 'chai'
import { ethers } from 'hardhat'

const toMatchId = (value: string) => ethers.encodeBytes32String(value)

describe('PocketPokerEscrow', () => {
  const stake = ethers.parseEther('0.5')

  async function deploy() {
    const [owner, playerA, playerB, outsider] = await ethers.getSigners()
    const Escrow = await ethers.getContractFactory('PocketPokerEscrow')
    const escrow = await Escrow.deploy()
    await escrow.waitForDeployment()
    return { escrow, owner, playerA, playerB, outsider }
  }

  it('collects stakes from both players with mismatch protection', async () => {
    const { escrow, playerA, playerB } = await deploy()
    const matchId = toMatchId('stakeGuard')

    await expect(escrow.connect(playerA).fundStake(matchId, { value: stake }))
      .to.emit(escrow, 'StakeFunded')
      .withArgs(matchId, playerA.address, stake)

    await expect(escrow.connect(playerA).fundStake(matchId, { value: stake }))
      .to.be.revertedWithCustomError(escrow, 'StakeAlreadyFunded')

    await expect(escrow.connect(playerB).fundStake(matchId, { value: stake / 2n }))
      .to.be.revertedWithCustomError(escrow, 'StakeMismatch')

    await escrow.connect(playerB).fundStake(matchId, { value: stake })
    const data = await escrow.getMatch(matchId)
    expect(data.playerAFunded).to.be.true
    expect(data.playerBFunded).to.be.true
  })

  it('prevents non-participants from funding or marking ready once seats are filled', async () => {
    const { escrow, playerA, playerB, outsider } = await deploy()
    const matchId = toMatchId('guards')
    await escrow.connect(playerA).fundStake(matchId, { value: stake })
    await escrow.connect(playerB).fundStake(matchId, { value: stake })

    await expect(escrow.connect(outsider).fundStake(matchId, { value: stake }))
      .to.be.revertedWithCustomError(escrow, 'NotParticipant')
    await expect(escrow.connect(outsider).markReady(matchId)).to.be.revertedWithCustomError(
      escrow,
      'NotParticipant',
    )
  })

  it('requires funded players before marking ready', async () => {
    const { escrow, playerA } = await deploy()
    const matchId = toMatchId('readyGate')
    await expect(escrow.connect(playerA).markReady(matchId)).to.be.revertedWithCustomError(
      escrow,
      'NotParticipant',
    )
    await escrow.connect(playerA).fundStake(matchId, { value: stake })
    await expect(escrow.connect(playerA).markReady(matchId))
      .to.emit(escrow, 'PlayerReady')
      .withArgs(matchId, playerA.address)
  })

  it('pays out the winner once both players are ready', async () => {
    const { escrow, owner, playerA, playerB } = await deploy()
    const matchId = toMatchId('payout')

    await escrow.connect(playerA).fundStake(matchId, { value: stake })
    await escrow.connect(playerB).fundStake(matchId, { value: stake })
    await escrow.connect(playerA).markReady(matchId)
    await escrow.connect(playerB).markReady(matchId)

    const totalPot = stake * 2n
    const tx = escrow.connect(owner).payoutWinner(matchId, playerA.address)
    await expect(tx).to.changeEtherBalances([playerA, escrow], [totalPot, -totalPot])
    await expect(tx)
      .to.emit(escrow, 'MatchResolved')
      .withArgs(matchId, playerA.address, totalPot)

    await expect(escrow.connect(owner).payoutWinner(matchId, playerA.address)).to.be.revertedWithCustomError(
      escrow,
      'MatchAlreadyResolved',
    )
  })

  it('blocks payout attempts from non-owners', async () => {
    const { escrow, playerA, playerB } = await deploy()
    const matchId = toMatchId('ownerOnly')
    await escrow.connect(playerA).fundStake(matchId, { value: stake })
    await escrow.connect(playerB).fundStake(matchId, { value: stake })
    await escrow.connect(playerA).markReady(matchId)
    await escrow.connect(playerB).markReady(matchId)

    await expect(
      escrow.connect(playerA).payoutWinner(matchId, playerA.address),
    ).to.be.revertedWithCustomError(escrow, 'OwnableUnauthorizedAccount').withArgs(playerA.address)
  })
})
