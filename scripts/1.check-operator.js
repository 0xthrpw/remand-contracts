const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
	const signers = await ethers.getSigners();
	const addresses = await Promise.all(signers.map(async signer => signer.getAddress()));
	const deployer = { provider: signers[0].provider, signer: signers[0], address: addresses[0] };
	console.log(
		`Operating from:`, 
		deployer.address
	);

	const balance = await deployer.provider.getBalance( deployer.address );
	const ethBalance = ethers.utils.formatEther(balance.toString());
	
	console.log(
		`Balance:`, ethBalance, `ETH`
	);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });