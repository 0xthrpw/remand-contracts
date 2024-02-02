const { ethers } = require('hardhat');
const { expect } = require('chai');
const { should } = require('chai').should();
const { withContracts } = require('./utils/fixture');

describe('/OTG/ Offer Testing General: Remand Multi', () => {

	let signers, addresses, admin, offerCreator, offerTarget, offerNonTarget;
	let remandMulti, erc20_1, erc20_2, erc20_3;
	let erc721_1, erc1155_1; 
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


		// const { remandMulti, erc20_1, erc20_2, erc20_3 } = withContracts();

		contracts = await withContracts();

		remandMulti = contracts.remandMulti;
		erc20_1 = contracts.erc20_1;
		erc20_2 = contracts.erc20_2;
		erc20_3 = contracts.erc20_3;

		erc721_1 = contracts.erc721_1;
		erc1155_1 = contracts.erc1155_1;
		// console.log(contracts)

		// const mintAskToken = await askToken_1.mint(
		// 	offerTarget.address,
		// 	ethers.utils.parseEther('100000000')
		// )

		// const mintCollateralToken = await collateralToken_1.mint(
		// 	offerCreator.address,
		// 	ethers.utils.parseEther('100000')
		// )

		// const mintFeeToken = await feeToken_1.mint(
		// 	offerCreator.address,
		// 	ethers.utils.parseEther('1000000')
		// )
	});

	context('Offer creation', async () => {
		it('should create offer successfully', async () => {
			// const offer = {
			// 	owner: offerCreator.address, 
			// 	term: 100000,
			// 	target: offerTarget.address,
			// 	acceptedAt: 0,
			// 	askToken: erc20_1.address,
			// 	askAmount: ethers.utils.parseEther('10000'),
			// 	collateral: collateralToken_1.address,
			// 	collateralAmount: ethers.utils.parseEther('100'),
			// 	fee: feeToken_1.address,
			// 	feeAmount: ethers.utils.parseEther('10'),
			// }



			await erc20_1.connect(offerCreator.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('200')
			)
			await erc20_2.connect(offerCreator.signer).approve(
				remandMulti.address, 
				ethers.utils.parseEther('20')
			)

			// const newOffer = 
			// 	await remandERC20.connect(offerCreator.signer).create(offer);

			// expect(newOffer).to.be.ok;

			// const newOfferReceipt = await newOffer.wait();
			// const newOfferKey = newOfferReceipt.events[4].args.key;
			// const offerData = await remandERC20.offers(newOfferKey);
			// console.log("offerData", offerData)

			// const duplicateOffer = 
			// 	await remandERC20.connect(offerCreator.signer).create(offer);

			// const duplicateOfferReceipt = await duplicateOffer.wait();
			// console.log(newOfferReceipt.events[4].args);
			// console.log(duplicateOfferReceipt.events[4].args);


			// //accept offer
			// await askToken_1.connect(offerTarget.signer).approve(
			// 	remandERC20.address, 
			// 	ethers.utils.parseEther('10000')
			// )
			// await remandERC20.connect(offerTarget.signer).accept(newOfferKey);

			// const offerUpdatedData = await remandERC20.offers(newOfferKey);
			// console.log("offerUpdatedData", offerUpdatedData);
		});
	});
});