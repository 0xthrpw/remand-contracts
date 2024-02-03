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
			// console.log(newOfferReceipt.events[4].args);
			// console.log(duplicateOfferReceipt.events[4].args);


			//accept offer
			await askToken_1.connect(offerTarget.signer).approve(
				remandERC20.address, 
				ethers.utils.parseEther('10000')
			)
			await remandERC20.connect(offerTarget.signer).accept(newOfferKey);

			const offerUpdatedData = await remandERC20.offers(newOfferKey);
			// console.log("offerUpdatedData", offerUpdatedData);
		});
	});
});