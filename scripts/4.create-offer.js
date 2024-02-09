const { ethers } = require('hardhat');

const REMAND_CONTRACT_ADDRESS = '0xEAdE11841145a6dacF6302F593031c4AA8b428a8';
const ASK_TOKEN = '0x39B54e279d80B923842D1942EBb839E3982B8b2B';
const COLLATERAL_TOKEN = '0x2E51CEab2caD7c1e8d30D8405E94Cd17904FE8eE';
const FEE_TOKEN = '0x020aA9dbFf8dF3A7014A50937185694dA8cA363a';

const TAKER = '0xA374a008F63494c4530695eeEbD93f9bb94E7320';
// const TAKER = ethers.constants.AddressZero;

async function main() {
	const signers = await ethers.getSigners();
	const addresses = await Promise.all(
		signers.map(async signer => signer.getAddress())
	);
	const deployer = {
		provider: signers[0].provider,
		signer: signers[0],
		address: addresses[0]
	};
	console.log(`Operator: ${deployer.address}`);

	const RemandMulti = await ethers.getContractFactory('RemandMulti');
	const remandMulti = RemandMulti.attach(REMAND_CONTRACT_ADDRESS);

	const TestERC20 = await ethers.getContractFactory('TestERC20');
	const erc20_1 = await TestERC20.attach(FEE_TOKEN);

	const TestERC721 = await ethers.getContractFactory('TestERC721');
	const erc721_1 = await TestERC721.attach(COLLATERAL_TOKEN)

	// set approvals
	console.log('Approving Remand Contract...')

	// approve contract to transfer collateral assets
	const approveCollateral = await erc721_1.connect(deployer.signer).approve(
		remandMulti.address, 
		3
	)
	await approveCollateral.wait();

	// approve contract to transfer fee tokens
	const approveFee = await erc20_1.connect(deployer.signer).approve(
		remandMulti.address, 
		ethers.utils.parseEther('20000')
	)
	await approveFee.wait();

	// create offer
	console.log('Creating Offer...')
	
	const blockTimestamp = (await deployer.provider.getBlock('latest')).timestamp;
	const DEADLINE = blockTimestamp + 86400
	console.log("deadline", DEADLINE);
	const TERM = 864000; // 10 days

	const askTokens = [{
		assetType: 0,
		assetAddress: ASK_TOKEN,
		id: 0,
		quantity: ethers.utils.parseEther('1000000')
	}]

	const collateralTokens = [{
		assetType: 1,
		assetAddress: COLLATERAL_TOKEN,
		id: 3,
		quantity: 0
	}]

	const feeTokens = [{
		assetType: 0,
		assetAddress: FEE_TOKEN,
		id: 0,
		quantity: ethers.utils.parseEther('20000')
	}]

	const erc721Offer = {
		maker: deployer.address,
		term: TERM, //seconds
		taker: TAKER,
		acceptedAt: 0,
		deadline: DEADLINE,
		askAssets: askTokens,
		collateralAssets: collateralTokens,
		feeAssets: feeTokens
	}

	const newOffer = await remandMulti.connect(deployer.signer).create(erc721Offer);
	const newOfferReceipt = await newOffer.wait();
	console.log('Offer Created Successfully')

	const newOfferKey = newOfferReceipt.events[4].args.key;
	console.log("[OFFER KEY]: ", newOfferKey);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });