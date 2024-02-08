const { ethers } = require('hardhat');

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
	const remandMulti = await RemandMulti.connect(deployer.signer).deploy();
	const remandMultiDeployed = await remandMulti.deployed();

	console.log('Deploying RemandMulti Contract...');
	console.log(`RemandMulti deployed to: ${remandMulti.address}`);

	console.log(`$ npx hardhat verify --network goerli ${remandMulti.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });