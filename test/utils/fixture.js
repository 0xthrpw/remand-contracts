const { ethers } = require('hardhat');

const withContracts = async () => {
	const signers = await ethers.getSigners();
	const addresses = await Promise.all(
		signers.map(async signer => signer.getAddress())
	);

	const RemandMulti = await ethers.getContractFactory('RemandMulti');
	const remandMulti = await RemandMulti.deploy();
	await remandMulti.deployed();

	/// erc20
	const TestERC20 = await ethers.getContractFactory('TestERC20');
	const erc20_1 = await TestERC20.deploy(
		'Ask Token 1',
		'ASK_1'
	);
	await erc20_1.deployed();

	const erc20_2 = await TestERC20.deploy(
		'Collateral Token 1',
		'COLLAT_1'
	);
	await erc20_2.deployed();

	const erc20_3 = await TestERC20.deploy(
		'Fee Token 1',
		'FEE_1'
	);
	await erc20_3.deployed();

	/// erc721
	const TestERC721 = await ethers.getContractFactory('TestERC721');
	const erc721_1 = await TestERC721.deploy(
		'FU Token 721',
		'FU_721',
		'',
		'',
		10000
	);

	/// erc1155
	const ProxyRegistry = await ethers.getContractFactory("contracts/test/ProxyRegistry.sol:ProxyRegistry");
	const proxyRegistry = await ProxyRegistry.deploy();
	const proxyRegistryDeployed = await proxyRegistry.deployed();

	const Fee1155 = await ethers.getContractFactory("Fee1155NFTLockable");
	let erc1155_1 = await Fee1155.deploy(
		'-', 
		addresses[0],
		proxyRegistry.address
	);
	
	return  {remandMulti, erc20_1, erc20_2, erc20_3, erc721_1, erc1155_1} 
}

exports.withContracts = withContracts;