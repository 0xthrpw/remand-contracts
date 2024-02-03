const { ethers, network } = require('hardhat');
const { expect } = require('chai');

const chai = require('chai');
const { solidity } = require('ethereum-waffle');
chai.use(solidity);

// const { should } = require('chai').should();
const { withContracts } = require('./utils/fixture');

describe('/OTG/ Offer Testing General: Remand Multi', () => {

	let signers, addresses, admin, offerCreator, offerTarget, offerNonTarget;
	let remandMulti, erc20_1, erc20_2, erc20_3;
	let erc721_1, erc721_2, erc721_3, erc1155_1; 
	let contracts;
	
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


		contracts = await withContracts();

		remandMulti = contracts.remandMulti;

		erc20_1 = contracts.erc20_1;
		erc20_2 = contracts.erc20_2;
		erc20_3 = contracts.erc20_3;

		erc721_1 = contracts.erc721_1;
		erc721_2 = contracts.erc721_2;
		erc721_3 = contracts.erc721_3;

		erc1155_1 = contracts.erc1155_1;

		await erc20_1.mint(
			offerTarget.address,
			ethers.utils.parseEther('100000000')
		)

		await erc20_1.mint(
			offerNonTarget.address,
			ethers.utils.parseEther('100000000')
		)

		await erc20_2.mint(
			offerCreator.address,
			ethers.utils.parseEther('100000000')
		)

		await erc20_3.mint(
			offerCreator.address,
			ethers.utils.parseEther('100000000')
		)

		await erc721_1.mint(
			offerTarget.address,
			20
		)

		await erc721_2.mint(
			offerCreator.address,
			20
		)

		await erc721_3.mint(
			offerCreator.address,
			20
		)

		const erc1155Supplies = [
			10, 10, 10, 10, 10
		]

		for (let i = 0; i < erc1155Supplies.length; i++) {
			let groupId = ethers.BigNumber.from(i);
			let shiftedGroupId = groupId.shl(128);
			let itemIds = [];
			let itemAmounts = [];
			for (let j = 1; j <= erc1155Supplies[i]; j++) {
				itemIds.push(shiftedGroupId.add(j));
				itemAmounts.push(1);
			}
			const createItemsTx = await erc1155_1.createNFT(
				offerCreator.address,
				itemIds,
				itemAmounts,
				[]
			)
			await createItemsTx.wait();
		}

	});

	context('ERC721 Only', async () => {
		it('should create offer successfully', async () => {

			const askTokens = [{
				assetType: 0,
				assetAddress: erc20_1.address,
				id: 0,
				quantity: 1000
			}]

			const collateralTokens = [{
				assetType: 0,
				assetAddress: erc20_2.address,
				id: 0,
				quantity: 10000
			}]

			const feeTokens = [{
				assetType: 0,
				assetAddress: erc20_3.address,
				id: 0,
				quantity: 100
			}]

			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;

			// create offer struct
			const erc20Offer = {
				owner: offerCreator.address,
				term: 320000, //seconds
				target: offerTarget.address,
				acceptedAt: 0,
				deadline: blockTimestamp + 10000,
				askAssets: askTokens,
				collateralAssets: collateralTokens,
				feeAssets: feeTokens
			}

			// approve contract to transfer collateral tokens
			await erc20_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('20000')
			)

			// approve contract to transfer fee tokens
			await erc20_3.connect(offerCreator.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('200')
			)
			
			// create offer
			const newOffer = 
				await remandMulti.connect(offerCreator.signer).create(erc20Offer);

			expect(newOffer).to.be.ok;

			// get resulting offer key
			const newOfferReceipt = await newOffer.wait();
			const newOfferKey = newOfferReceipt.events[4].args.key;
			
			// should revert when trying to repay the offer before it has been accepted 
			await expect(
				remandMulti.connect(offerCreator.signer).repay(newOfferKey)
			).to.be.revertedWith('OfferNotAccepted');

			// offer target approves contract to transfer ask assets
			await erc20_1.connect(offerTarget.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('1000')
			)

			// accept offer
			const acceptedOffer = 
				await remandMulti.connect(offerTarget.signer).accept(newOfferKey);

			expect(acceptedOffer).to.be.ok;
		});
	});

	context('ERC721 Only', async () => {
		it('private offer', async () => {
			const askTokens = [{
				assetType: 1,
				assetAddress: erc721_1.address,
				id: 1,
				quantity: 0
			}]

			const collateralTokens = [{
				assetType: 1,
				assetAddress: erc721_2.address,
				id: 1,
				quantity: 0
			}]

			const feeTokens = [{
				assetType: 1,
				assetAddress: erc721_3.address,
				id: 1,
				quantity: 0
			}]

			// offer creator approves contract to transfer collateral assets
			await erc721_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				1
			)

			// offer creator approves contract to transfer fee assets
			await erc721_3.connect(offerCreator.signer).approve(
				remandMulti.address, 
				1
			)

			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;
			const term = 640000;

			// create private offer struct
			const erc721Offer = {
				owner: offerCreator.address,
				term: term, //seconds
				target: offerTarget.address,
				acceptedAt: 0,
				deadline: blockTimestamp + 100000,
				askAssets: askTokens,
				collateralAssets: collateralTokens,
				feeAssets: feeTokens
			}

			// create offer
			const newOffer = 
				await remandMulti.connect(offerCreator.signer).create(erc721Offer);

			// get resulting offer key
			const newOfferReceipt = await newOffer.wait();
			const newOfferKey = newOfferReceipt.events[4].args.key;


			// rescind offer
			const rescindOffer = 
				await remandMulti.connect(offerCreator.signer).rescind(newOfferKey);

			// const rescindOfferReceipt = await rescindOffer.wait();
			// console.log("rescindOffer events", rescindOfferReceipt.events)
			const rescindedOfferData = await remandMulti.getOfferTokens(newOfferKey);
			// console.log("rescindOffer tokens", rescindedOfferData)

			// offer creator reapproves collateral and fee tokens
			await erc721_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				1
			)

			await erc721_3.connect(offerCreator.signer).approve(
				remandMulti.address, 
				1
			)

			// make another offer with same parameters as before
			const fixedOffer = 
				await remandMulti.connect(offerCreator.signer).create(erc721Offer);

			// get resulting offer key
			const fixedOfferReceipt = await fixedOffer.wait();
			const fixedOfferKey = fixedOfferReceipt.events[4].args.key;

			// should revert when offer target specified and wrong user tries to accept
			await expect(
				remandMulti.connect(offerNonTarget.signer).accept(fixedOfferKey)
			).to.be.revertedWith('NotOfferTarget');

			// offer target approves contract to transfer ask assets
			await erc721_1.connect(offerTarget.signer).approve(
				remandMulti.address, 
				1
			)

			// offer target accepts offer
			const acceptedOffer = 
				await remandMulti.connect(offerTarget.signer).accept(fixedOfferKey);

			expect(acceptedOffer).to.be.ok;

			// should revert when trying to accept already accepted offer
			await expect(
				remandMulti.connect(offerTarget.signer).accept(fixedOfferKey)
			).to.be.revertedWith('OfferAlreadyAccepted');
			
			// should revert when trying to rescind accepted offer
			await expect(
				remandMulti.connect(offerCreator.signer).rescind(fixedOfferKey)
			).to.be.revertedWith('CantRescindAcceptedOffer');

			// should revert when incorrect user tries to rescind offer
			await expect(
				remandMulti.connect(offerTarget.signer).rescind(fixedOfferKey)
			).to.be.revertedWith('NotOfferOwner');

			// should revert when trying to remand collateral before term ends
			await expect(
				remandMulti.connect(offerTarget.signer).remand(fixedOfferKey)
			).to.be.revertedWith('IncompleteTerm');

			// fast forward to end of offer term
			const newTimestamp = blockTimestamp + term + 10;
			await network.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
    		await network.provider.send("evm_mine");

			// should revert when incorrect user tries to remand collateral 
			await expect(
				remandMulti.connect(offerNonTarget.signer).remand(fixedOfferKey)
			).to.be.revertedWith('NotOfferTarget');
			
			// remand collateral assetss
			const remandOffer = 
				await remandMulti.connect(offerTarget.signer).remand(fixedOfferKey);
			
			// const remandedData = await remandMulti.offers(fixedOfferKey);
			// console.log("remandedData", remandedData);

		});

		it('public offer, mixed assets', async () => {
			const askTokens = [{
				assetType: 0,
				assetAddress: erc20_1.address,
				id: 0,
				quantity: 40000
			}]

			const collateralTokens = [{
				assetType: 1,
				assetAddress: erc721_2.address,
				id: 2,
				quantity: 0
			}]

			const feeTokens = [{
				assetType: 0,
				assetAddress: erc20_2.address,
				id: 0,
				quantity: 500
			}]

			// const owner721_2 = await erc721_2.ownerOf(2);
			// console.log("owner721_2", owner721_2, offerCreator.address);

			// offer creator approves contract to transfer collateral assets
			await erc721_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				2
			)

			// offer creator approves contract to transfer fee assets
			await erc20_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('500')
			)

			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;
			const term = 1280000;

			// create public offer struct
			let ercMixedOffer = {
				owner: offerCreator.address,
				term: term, //seconds
				target: ethers.constants.AddressZero,
				acceptedAt: 0,
				deadline: blockTimestamp + 100000,
				askAssets: askTokens,
				collateralAssets: collateralTokens,
				feeAssets: feeTokens
			}

			// should revert when trying to create offer with incorrect owner address 
			ercMixedOffer.owner = offerNonTarget.address;
			await expect(
				remandMulti.connect(offerCreator.signer).create(ercMixedOffer)
			).to.be.revertedWith('OwnerMismatch');
			ercMixedOffer.owner = offerCreator.address;

			// should revert when creating offer with a value set for 'acceptedAt'
			ercMixedOffer.acceptedAt = blockTimestamp;
			await expect(
				remandMulti.connect(offerCreator.signer).create(ercMixedOffer)
			).to.be.revertedWith('NonZeroAcceptedAt');
			ercMixedOffer.acceptedAt = 0;

			// should revert when creating offer with term shorter than 'minimumTerm'
			ercMixedOffer.term = 43000;
			await expect(
				remandMulti.connect(offerCreator.signer).create(ercMixedOffer)
			).to.be.revertedWith('TermTooShort');
			ercMixedOffer.term = term;

			// make an offer
			const mixedOffer = 
				await remandMulti.connect(offerCreator.signer).create(ercMixedOffer);
			const mixedOfferReceipt = await mixedOffer.wait();
			const mixedOfferKey = mixedOfferReceipt.events[4].args.key;

			// fast forward a few minutes
			const newTimestamp = blockTimestamp + 1000;
			await network.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
    		await network.provider.send("evm_mine");
			
			// should revert when trying to repay an offer before its been accepted
			await expect(
				remandMulti.connect(offerCreator.signer).repay(mixedOfferKey)
			).to.be.revertedWith('OfferNotAccepted');

			// public user approves contract to transfer ask assets
			await erc20_1.connect(offerNonTarget.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('10000')
			)

			// public user accepts offer
			const acceptedOffer = 
				await remandMulti.connect(offerNonTarget.signer).accept(mixedOfferKey);
			
			// fast forward to end of term
			const termTimestamp = blockTimestamp + term;
			await network.provider.send("evm_setNextBlockTimestamp", [termTimestamp]);
			await network.provider.send("evm_mine");

			// offer owner approves contract to transfer ask assets out of their wallet
			await erc20_1.connect(offerCreator.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('50000')
			)

			// should revert when incorrect user tries repay ask assets
			await expect(
				remandMulti.connect(offerTarget.signer).repay(mixedOfferKey)
			).to.be.revertedWith('NotOfferOwner');

			// offer creator repays offer
			const repaidOffer = 
				await remandMulti.connect(offerCreator.signer).repay(mixedOfferKey);
		});
	});
	
	context('Mixed: ERC20 and ERC1155', async () => {
		it('expired public offer', async () => {			
			const askTokens = [{
				assetType: 0,
				assetAddress: erc20_1.address,
				id: 0,
				quantity: 10000
			}]

			const collateralTokens = [{
				assetType: 2,
				assetAddress: erc1155_1.address,
				id: 1,
				quantity: 1
			}]

			const feeTokens = [{
				assetType: 0,
				assetAddress: erc20_2.address,
				id: 0,
				quantity: 500
			}]

			// offer creator approves contract to transfer collateral assets
			await erc1155_1.connect(offerCreator.signer).setApprovalForAll(
				remandMulti.address, 
				true
			)

			// offer creator approves contract to transfer fee assets
			await erc20_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('500')
			)

			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;
			const term = 86400 * 2;

			// create mixed offer struct
			let erc1155MixedOffer = {
				owner: offerCreator.address,
				term: term, //seconds
				target: ethers.constants.AddressZero,
				acceptedAt: 0,
				deadline: blockTimestamp + 43200,
				askAssets: askTokens,
				collateralAssets: collateralTokens,
				feeAssets: feeTokens
			}

			// create mixed offer
			const accepted1155Offer = 
				await remandMulti.connect(offerCreator.signer).create(erc1155MixedOffer);
			
			//  get resulting offer key
			const mixedOffer1155Receipt = await accepted1155Offer.wait();
			const mixedOffer1155Key = mixedOffer1155Receipt.events[3].args.key;
			
			// fast forward past offer deadline
			const deadlineTimestamp = blockTimestamp + 43300;
			await network.provider.send("evm_setNextBlockTimestamp", [deadlineTimestamp]);
			await network.provider.send("evm_mine");

			// should revert when trying to accept offer past deadline
			await expect(
				remandMulti.connect(offerNonTarget.signer).accept(mixedOffer1155Key)
			).to.be.revertedWith('OfferExpired');
		});

		it('remanded collateral', async () => {			
			const askTokens = [{
				assetType: 0,
				assetAddress: erc20_1.address,
				id: 0,
				quantity: 10000
			}]

			const collateralTokens = [{
				assetType: 2,
				assetAddress: erc1155_1.address,
				id: 2,
				quantity: 1
			}]

			const feeTokens = [{
				assetType: 0,
				assetAddress: erc20_2.address,
				id: 0,
				quantity: 500
			}]

			await erc1155_1.connect(offerCreator.signer).setApprovalForAll(
				remandMulti.address, 
				true
			)

			await erc20_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('500')
			)

			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;
			const term = 86400 * 2;

			let erc1155MixedOffer = {
				owner: offerCreator.address,
				term: term, //seconds
				target: offerTarget.address,
				acceptedAt: 0,
				deadline: blockTimestamp + 43200,
				askAssets: askTokens,
				collateralAssets: collateralTokens,
				feeAssets: feeTokens
			}

			const accepted1155Offer = 
				await remandMulti.connect(offerCreator.signer).create(erc1155MixedOffer);
			
			const mixedOffer1155Receipt = await accepted1155Offer.wait();
			const mixedOffer1155Key = mixedOffer1155Receipt.events[3].args.key;
			
			await expect(
				remandMulti.connect(offerTarget.signer).remand(mixedOffer1155Key)
			).to.be.revertedWith('OfferNotAccepted');
		});

	});
});