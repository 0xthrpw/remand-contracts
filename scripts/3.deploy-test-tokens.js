const { ethers } = require('hardhat');

const TESTER_ADDRESS = '0xA374a008F63494c4530695eeEbD93f9bb94E7320';

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

	//

	console.log('Deploying ERC20 Token Contract...');

	const TestERC20 = await ethers.getContractFactory('TestERC20');
	const erc20_1 = await TestERC20.deploy(
		'Mucho Dinero ERC20 Token ',
		'D1NER0'
	);
	await erc20_1.deployed();

	console.log(`TestERC20 deployed to: ${erc20_1.address}`);
	console.log(`$ npx hardhat verify --network goerli ${erc20_1.address}`);

	console.log(' ');
	console.log('Minting T3ST Tokens to deployer...');
	const mintERC20Tokens = await erc20_1.mint(
		deployer.address,
		ethers.utils.parseEther('100000000')
	)
	await mintERC20Tokens.wait();

	console.log('Minting T3ST Tokens to tester...');
	const mintERC20TokensAgain = await erc20_1.mint(
		TESTER_ADDRESS,
		ethers.utils.parseEther('100000000')
	)
	await mintERC20TokensAgain.wait();


	//

	console.log('Deploying ERC721 Token Contract...');

	const TestERC721 = await ethers.getContractFactory('TestERC721');
	const erc721_1 = await TestERC721.deploy(
		'Funny looking Trees',
		'TREES',
		'https://ipfs.io/ipfs/QmVjYK7kTLYJCQsmwfsAZKVTNfPcq96XpbVmSVJcznCUdQ/',
		'',
		10000
	);
	await erc721_1.deployed();

	console.log(`TestERC721 deployed to: ${erc721_1.address}`);
	console.log(`$ npx hardhat verify --network goerli ${erc721_1.address}`);

	console.log(' ');
	console.log('Minting ERC721 Tokens...');

	const mintERC721Tokens = await erc721_1.mint(
		deployer.address,
		40
	);
	await mintERC721Tokens.wait();

	const mintERC721TokensAgain = await erc721_1.mint(
		TESTER_ADDRESS,
		40
	);
	await mintERC721TokensAgain.wait();

	//

	console.log('Deploying ERC1155 Token Contract...');

	const ProxyRegistry = await ethers.getContractFactory("contracts/test/ProxyRegistry.sol:ProxyRegistry");
	const proxyRegistry = await ProxyRegistry.deploy();
	const proxyRegistryDeployed = await proxyRegistry.deployed();

	const Fee1155 = await ethers.getContractFactory("Fee1155NFTLockable");
	let erc1155_1 = await Fee1155.deploy(
		'-', 
		deployer.address,
		proxyRegistry.address
	);
	await erc1155_1.deployed();

	console.log(`TestERC1155 deployed to: ${erc1155_1.address}`);
	console.log(`$ npx hardhat verify --network goerli ${erc1155_1.address} '-' ${deployer.address} ${proxyRegistry.address}`);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });