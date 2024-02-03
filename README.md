# remand-contracts

## install

`npm install`

## overview

This contract allows users to borrow, lend and earn fees using ERC20, ERC721 and ERC1155 tokens.  Users can create private or global lending offers using any combination of the three aforementioned token types for a fixed term measured in seconds. The user is responsible for determining what constitutes a fair offer.

### create
All successfully created offers are assigned a unique 'key' that is used to refer to the offer data.  A user can create an offer by calling the 'create' function and specifying the following offer properties.

Once an offer is created, the assets listed in 'collateralAssets' and 'feeAssets' will be transferred to the contract.

`taker`
- A specific address which will be the only account that can accept the offer
- The zero address, allowing anyone to accept the offer if they can satisfy it

`term`
The amount of time measured in seconds, that the offer maker can borrow the specified ask tokens.

`deadline`
The block timestamp where the offer will expire

`askAssets`
An array of ERC20, ERC721, ERC1155 tokens (Assets) that the offer maker would like to borrow.

`collateralAssets`
An array of ERC20, ERC721, ERC1155 tokens (Assets) that the offer maker has provided as collateral during the term of the borrow.

`feeAssets`
An array of ERC20, ERC721, ERC1155 tokens (Assets) that the offer taker will receive for accepting the offer and providing the ask assets.

### rescind
The offer maker can rescind an offer by calling the 'rescind' function and specifying the offer key, but only before the offer has been accepted.

Rescinding an offer will return the items listed in the offer's 'collateralAssets' and 'feeAssets' to the user.

### accept
If an address is specified as an offer's 'taker', then that offer can only be accepted by that address.  If the offer taker is left blank (set as the zero address), then anyone who can provide the ask assets can accept the offer.  The offer taker receives the fee assets immediately upon accepting an offer.

Once an offer is accepted, the term begins and assets listed in 'askAssets' will be transferred from the offer taker (accept function caller) to the contract.  The assets listed in 'feeAssets' will be transferred from the contract to the offer taker (accept function caller).

### repay
The offer maker should repay the offer by calling the 'repay' function before the offer term has transpired.  If the 'term' of the offer has passed, the offer maker can still pay back the askAssets, but must do so before the offer taker calls the 'remand' function and withdraws the offer collateral.

Once an offer is repaid, assets listed in 'askAssets' will be transferred from the offer maker to the offer taker, and assets listed in 'collateralAssets' will be transferred from the contract back to the offer maker.

### remand
If an offer term has transpired, the offer taker can call the 'remand' function and withdraw the offer collateral.  This will delete the offer and end the interaction, the offer taker should consider their original ask assets as lost.

Once an offer is remanded, assets listed in 'collateralAssets' will be transferred to the offer taker and the offer maker will no longer have any right to them.
