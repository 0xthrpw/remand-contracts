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

			const askTokens = [
				{
					assetType: 0,
					assetAddress: erc20_1.address,
					id: 0,
					quantity: 1000
				}
			]

			const collateralTokens = [
				{
					assetType: 0,
					assetAddress: erc20_2.address,
					id: 0,
					quantity: 10000
				}
			]

			const feeTokens = [
				{
					assetType: 0,
					assetAddress: erc20_3.address,
					id: 0,
					quantity: 100
				}
			]

			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;

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


			await erc20_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('20000')
			)
			await erc20_3.connect(offerCreator.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('200')
			)

			const newOffer = 
				await remandMulti.connect(offerCreator.signer).create(erc20Offer);

			expect(newOffer).to.be.ok;

			console.log("new offer", erc20Offer)

			const newOfferReceipt = await newOffer.wait();
			const newOfferKey = newOfferReceipt.events[4].args.key;
			const offerData = await remandMulti.getOfferTokens(newOfferKey);
			console.log("offertokens", offerData)

			// const duplicateOffer = 
			// 	await remandMulti.connect(offerCreator.signer).create(erc20Offer);

			// const duplicateOfferReceipt = await duplicateOffer.wait();
			// console.log(newOfferReceipt.events[4].args);
			// console.log(duplicateOfferReceipt.events[4].args);


			//accept offer
			await erc20_1.connect(offerTarget.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('1000')
			)

			const acceptedOffer = 
				await remandMulti.connect(offerTarget.signer).accept(newOfferKey);

			expect(acceptedOffer).to.be.ok;
			// const offerUpdatedData = await remandERC20.offers(newOfferKey);
			// console.log("offerUpdatedData", offerUpdatedData);
		});
	});

	context('ERC721 Only', async () => {
		it('should create offer successfully', async () => {
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

			await erc721_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				1
			)

			await erc721_3.connect(offerCreator.signer).approve(
				remandMulti.address, 
				1
			)

			const blockTimestamp = (await admin.provider.getBlock('latest')).timestamp;
			const term = 640000;

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

			const newOffer = 
				await remandMulti.connect(offerCreator.signer).create(erc721Offer);

			const newOfferReceipt = await newOffer.wait();
			const newOfferKey = newOfferReceipt.events[4].args.key;
			const offerData = await remandMulti.getOfferTokens(newOfferKey);
			console.log("offertokens", offerData)

			// rescind offer

			const rescindOffer = 
				await remandMulti.connect(offerCreator.signer).rescind(newOfferKey);

			const rescindOfferReceipt = await rescindOffer.wait();
			console.log("rescindOffer events", rescindOfferReceipt.events)
			const rescindedOfferData = await remandMulti.getOfferTokens(newOfferKey);
			console.log("rescindOffer tokens", rescindedOfferData)

			// reapprove tokens
			await erc721_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				1
			)

			await erc721_3.connect(offerCreator.signer).approve(
				remandMulti.address, 
				1
			)

			// make another offer
			const fixedOffer = 
				await remandMulti.connect(offerCreator.signer).create(erc721Offer);
			const fixedOfferReceipt = await fixedOffer.wait();
			const fixedOfferKey = fixedOfferReceipt.events[4].args.key;

			// target accepts offer
			await erc721_1.connect(offerTarget.signer).approve(
				remandMulti.address, 
				1
			)

			await expect(
				remandMulti.connect(offerNonTarget.signer).accept(fixedOfferKey)
			).to.be.revertedWith('NotOfferTarget');

			const acceptedOffer = 
				await remandMulti.connect(offerTarget.signer).accept(fixedOfferKey);

			expect(acceptedOffer).to.be.ok;

			await expect(
				remandMulti.connect(offerTarget.signer).accept(fixedOfferKey)
			).to.be.revertedWith('OfferAlreadyAccepted');
			
			await expect(
				remandMulti.connect(offerCreator.signer).rescind(fixedOfferKey)
			).to.be.revertedWith('CantRescindAcceptedOffer');

			await expect(
				remandMulti.connect(offerTarget.signer).remand(fixedOfferKey)
			).to.be.revertedWith('IncompleteTerm');

			const newTimestamp = blockTimestamp + term + 10;

			await network.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
    		await network.provider.send("evm_mine");
			
			const remandOffer = 
				await remandMulti.connect(offerTarget.signer).remand(fixedOfferKey);
			
			const remandedData = await remandMulti.offers(fixedOfferKey);
			console.log("remandedData", remandedData);

		});
	});
});