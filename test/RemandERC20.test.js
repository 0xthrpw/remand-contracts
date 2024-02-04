const { ethers, network } = require('hardhat');
const { expect } = require('chai');
const { should } = require('chai').should();

describe('/OTG/ Offer Testing General: ERC20', () => {

	let signers, addresses, admin, offerCreator, offerTarget, offerNonTarget;
	let remandERC20, askToken_1, collateralToken_1, feeToken_1;

	before(async () => {
		signers = await ethers.getSigners();
		addresses = await Promise.all(
			signers.map(async signer => signer.getAddress())
		);
		admin = {
			provider: signers[0].provider,
			signer: signers[0],
			address: addresses[0]
		};

		offerCreator = {
			provider: signers[1].provider,
			signer: signers[1],
			address: addresses[1]
		}

		offerTarget = {
			provider: signers[2].provider,
			signer: signers[2],
			address: addresses[2]
		}

		offerNonTarget = {
			provider: signers[3].provider,
			signer: signers[3],
			address: addresses[3]
		}

		const RemandERC20 = await ethers.getContractFactory('RemandERC20');
		remandERC20 = await RemandERC20.connect(admin.signer).deploy();

		const TestERC20 = await ethers.getContractFactory('TestERC20');
		askToken_1 = await TestERC20.connect(admin.signer).deploy(
			'Ask Token 1',
			'ASK_1'
		);

		collateralToken_1 = await TestERC20.connect(admin.signer).deploy(
			'Collateral Token 1',
			'COLLAT_1'
		);

		feeToken_1 = await TestERC20.connect(admin.signer).deploy(
			'Fee Token 1',
			'FEE_1'
		);

		const mintAskToken = await askToken_1.mint(
			offerTarget.address,
			ethers.utils.parseEther('100000000')
		)

		const mintCollateralToken = await collateralToken_1.mint(
			offerCreator.address,
			ethers.utils.parseEther('100000')
		)

		const mintFeeToken = await feeToken_1.mint(
			offerCreator.address,
			ethers.utils.parseEther('1000000')
		)
	});

	context('Offer creation', async () => {
		it('should create offer successfully', async () => {
			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;
			const term = 100000;

			const offer = {
				owner: offerCreator.address, 
				term: term,
				target: offerTarget.address,
				acceptedAt: 0,
				deadline: blockTimestamp + 1000,
				askToken: askToken_1.address,
				askAmount: ethers.utils.parseEther('10000'),
				collateral: collateralToken_1.address,
				collateralAmount: ethers.utils.parseEther('100'),
				fee: feeToken_1.address,
				feeAmount: ethers.utils.parseEther('10'),
			}

			await collateralToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('200')
			)
			await feeToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('20')
			)

			const newOffer = 
				await remandERC20.connect(offerCreator.signer).create(offer);

			expect(newOffer).to.be.ok;

			const newOfferReceipt = await newOffer.wait();
			const newOfferKey = newOfferReceipt.events[4].args.key;
			const offerData = await remandERC20.offers(newOfferKey);
			// console.log("offerData", offerData)

			const duplicateOffer = 
				await remandERC20.connect(offerCreator.signer).create(offer);

			const duplicateOfferReceipt = await duplicateOffer.wait();

			//accept offer
			await askToken_1.connect(offerTarget.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('10000')
			)
			await remandERC20.connect(offerTarget.signer).accept(newOfferKey);

			const offerUpdatedData = await remandERC20.offers(newOfferKey);
			// console.log("offerUpdatedData", offerUpdatedData);

			// should revert when trying to rescind accepted offer
			await expect(
				remandERC20.connect(offerCreator.signer).rescind(newOfferKey)
			).to.be.revertedWith('CantRescindAcceptedOffer');
		});

		it('public offer expired', async () => {
			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;
			const term = 100000;

			const offer = {
				owner: offerCreator.address, 
				term: term,
				target: ethers.constants.AddressZero,
				acceptedAt: 0,
				deadline: blockTimestamp + 1000,
				askToken: askToken_1.address,
				askAmount: ethers.utils.parseEther('10000'),
				collateral: collateralToken_1.address,
				collateralAmount: ethers.utils.parseEther('100'),
				fee: feeToken_1.address,
				feeAmount: ethers.utils.parseEther('10'),
			}

			await collateralToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('200')
			)
			await feeToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('20')
			)

			// should revert when trying to create offer with incorrect owner address 
			offer.owner = offerNonTarget.address;
			await expect(
				remandERC20.connect(offerCreator.signer).create(offer)
			).to.be.revertedWith('OwnerMismatch');
			offer.owner = offerCreator.address;

			// should revert when creating offer with a value set for 'acceptedAt'
			offer.acceptedAt = blockTimestamp;
			await expect(
				remandERC20.connect(offerCreator.signer).create(offer)
			).to.be.revertedWith('NonZeroAcceptedAt');
			offer.acceptedAt = 0;

			// should revert when creating offer with term shorter than 'minimumTerm'
			offer.term = 43000;
			await expect(
				remandERC20.connect(offerCreator.signer).create(offer)
			).to.be.revertedWith('TermTooShort');
			offer.term = term;

			// should revert when creating offer where collateral and ask are same asset
			offer.askToken = collateralToken_1.address;
			await expect(
				remandERC20.connect(offerCreator.signer).create(offer)
			).to.be.revertedWith('AskIsCollateral');
			offer.askToken = askToken_1.address;

			// create offer
			const newOffer = 
				await remandERC20.connect(offerCreator.signer).create(offer);

			expect(newOffer).to.be.ok;

			// get resulting offer key
			const newOfferReceipt = await newOffer.wait();
			const newOfferKey = newOfferReceipt.events[4].args.key;

			// should revert when trying to repay an offer before its been accepted
			await expect(
				remandERC20.connect(offerCreator.signer).repay(newOfferKey)
			).to.be.revertedWith('OfferNotAccepted');

			// fast forward to end of offer deadline
			const deadlineTimestamp = blockTimestamp + offer.deadline + 10;
			await network.provider.send("evm_setNextBlockTimestamp", [deadlineTimestamp]);
    		await network.provider.send("evm_mine");

			// public user approves contract to transfer ask assets
			await askToken_1.connect(offerNonTarget.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('10000')
			)

			// should revert when trying to accept expired offer
			await expect(
				remandERC20.connect(offerNonTarget.signer).accept(newOfferKey)
			).to.be.revertedWith('OfferExpired');
		});

		it('rescind', async () => {
			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;
			const term = 100000;

			const offer = {
				owner: offerCreator.address, 
				term: term,
				target: ethers.constants.AddressZero,
				acceptedAt: 0,
				deadline: blockTimestamp + 1000,
				askToken: askToken_1.address,
				askAmount: ethers.utils.parseEther('10000'),
				collateral: collateralToken_1.address,
				collateralAmount: ethers.utils.parseEther('100'),
				fee: feeToken_1.address,
				feeAmount: ethers.utils.parseEther('10'),
			}

			await collateralToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('200')
			)
			await feeToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('20')
			)

			const newOffer = 
				await remandERC20.connect(offerCreator.signer).create(offer);

			expect(newOffer).to.be.ok;

			const newOfferReceipt = await newOffer.wait();
			const newOfferKey = newOfferReceipt.events[4].args.key;

			// should revert when incorrect user tries to rescind offer
			await expect(
				remandERC20.connect(offerTarget.signer).rescind(newOfferKey)
			).to.be.revertedWith('NotOfferOwner');

			await remandERC20.connect(offerCreator.signer).rescind(newOfferKey);

			
		});
		
		it('repay', async () => {
			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;
			const term = 100000;

			const offer = {
				owner: offerCreator.address, 
				term: term,
				target: ethers.constants.AddressZero,
				acceptedAt: 0,
				deadline: blockTimestamp + 1000,
				askToken: askToken_1.address,
				askAmount: ethers.utils.parseEther('10000'),
				collateral: collateralToken_1.address,
				collateralAmount: ethers.utils.parseEther('100'),
				fee: feeToken_1.address,
				feeAmount: ethers.utils.parseEther('10'),
			}

			await collateralToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('200')
			)
			await feeToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('20')
			)

			const newOffer = 
				await remandERC20.connect(offerCreator.signer).create(offer);

			expect(newOffer).to.be.ok;

			const newOfferReceipt = await newOffer.wait();
			const newOfferKey = newOfferReceipt.events[4].args.key;

			// user approves contract to transfer ask assets
			await askToken_1.connect(offerTarget.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('10000')
			)

			// should revert when trying to repay before offer is accepted
			await expect(
				remandERC20.connect(offerCreator.signer).repay(newOfferKey)
			).to.be.revertedWith('OfferNotAccepted');

			await remandERC20.connect(offerTarget.signer).accept(newOfferKey);

			// should revert when trying to accept already accepted offer
			await expect(
				remandERC20.connect(offerTarget.signer).accept(newOfferKey)
			).to.be.revertedWith('OfferAlreadyAccepted');

			// fast forward to half of offer term
			const halfwayTimestamp = blockTimestamp + (term / 2);
			await network.provider.send("evm_setNextBlockTimestamp", [halfwayTimestamp]);
			await network.provider.send("evm_mine");

			// should revert when trying to remand collateral before term ends
			await expect(
				remandERC20.connect(offerTarget.signer).remand(newOfferKey)
			).to.be.revertedWith('IncompleteTerm');

			// should revert when incorrect user trying to repay ask assets
			await expect(
				remandERC20.connect(offerNonTarget.signer).repay(newOfferKey)
			).to.be.revertedWith('NotOfferOwner');

			// user approves contract to transfer ask assets
			await askToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('10000')
			)
			
			// offer creator repays ask assets and closes offer
			await remandERC20.connect(offerCreator.signer).repay(newOfferKey)
		});

		it('remand collateral', async () => {
			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;
			const term = 100000;

			const offer = {
				owner: offerCreator.address, 
				term: term,
				target: offerTarget.address,
				acceptedAt: 0,
				deadline: blockTimestamp + 1000,
				askToken: askToken_1.address,
				askAmount: ethers.utils.parseEther('10000'),
				collateral: collateralToken_1.address,
				collateralAmount: ethers.utils.parseEther('100'),
				fee: feeToken_1.address,
				feeAmount: ethers.utils.parseEther('10'),
			}

			await collateralToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('200')
			)
			await feeToken_1.connect(offerCreator.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('20')
			)

			const newOffer = 
				await remandERC20.connect(offerCreator.signer).create(offer);

			expect(newOffer).to.be.ok;

			const newOfferReceipt = await newOffer.wait();
			const newOfferKey = newOfferReceipt.events[4].args.key;

			// public user approves contract to transfer ask assets
			await askToken_1.connect(offerTarget.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('10000')
			)

			// should revert when incorrect user tries accept private offer 
			await expect(
				remandERC20.connect(offerNonTarget.signer).accept(newOfferKey)
			).to.be.revertedWith('NotOfferTarget');

			// should revert when incorrect user tries to remand collateral 
			await expect(
				remandERC20.connect(offerTarget.signer).remand(newOfferKey)
			).to.be.revertedWith('OfferNotAccepted');

			await remandERC20.connect(offerTarget.signer).accept(newOfferKey);

			// should revert when trying to remand collateral before term ends
			await expect(
				remandERC20.connect(offerTarget.signer).remand(newOfferKey)
			).to.be.revertedWith('IncompleteTerm');

			// fast forward to end of offer term
			const termTimestamp = blockTimestamp + term + 10;
			await network.provider.send("evm_setNextBlockTimestamp", [termTimestamp]);
			await network.provider.send("evm_mine");

			// should revert when incorrect user tries to remand collateral 
			await expect(
				remandERC20.connect(offerNonTarget.signer).remand(newOfferKey)
			).to.be.revertedWith('NotOfferTarget');

			// offer target remands collateral assets and closes offer
			await remandERC20.connect(offerTarget.signer).remand(newOfferKey)
		});
	});
});