// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import { 
	RemandConfig 
} from "./RemandConfig.sol";

import { 
	Ownable 
} from "@openzeppelin/contracts/access/Ownable.sol";

import { 
	ReentrancyGuard 
} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {
	IERC20,
	SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {
	IERC721
} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {
	IERC1155
} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";


/**
	Thrown when wrong user tries to accept private offer or remand collateral
*/
error NotOfferTarget();

/**
	Thrown when wrong user tries to rescind offer
*/
error NotOfferOwner();

/**
	Thrown when user attempts to create offer for other address
*/
error OwnerMismatch();

/**
	Thrown when attempting to remand collateral from unaccepted offer
*/
error OfferNotAccepted();

/**
	Thrown when attempting to remand collateral before expired term
*/
error IncompleteTerm();

/**
	Thrown when attempting to accept already accepted offer
*/
error OfferAlreadyAccepted();

/**
	Thrown when attempting to rescind already accepted offer
*/
error CantRescindAcceptedOffer();

/**
	Thrown when creating an offer with a preset value for 'acceptedAt'
*/
error NonZeroAcceptedAt();

/**
 	Thrown when creating an offer with calculated key collision
*/
error OfferAlreadyExists();

/**
 	Thrown when creating an offer where collateral is the same as ask contract
*/
error AskIsCollateral();

/**
 	Thrown when attempting to accept an offer after the offer deadline
*/
error OfferExpired();

/**
 	Thrown when attempting to create an offer with a term that is less than the 
	contract's 'minimumTerm';
*/
error TermTooShort();

/**
	@custom:benediction DEVS BENEDICAT ET PROTEGAT CONTRACTVS MEAM
	@title Remand: ERC20, ERC721 and ERC1155 Collateral Lending
	@author throw; <@0xthrpw>

	Time based token lending that is independent of asset price.
	
	This contract allows users to borrow and lend tokens for a term in return
	for fees. if the borrower does not return the 'ask' token(s) by the end of the 
	term, then the lender can remand the collateral. it is completely up to the 
	users to determine what constitutes a 'fair' offer. 

	@custom:date January 30th, 2024.
*/
contract RemandMulti is Ownable, ReentrancyGuard, RemandConfig {
	using SafeERC20 for IERC20;

	enum AssetType {
		ERC20,
		ERC721,
		ERC1155
	}

	struct Asset {
		uint256 quantity;
		uint256 id;
		address assetAddress;
		AssetType assetType;
	}

	struct Offer {
		address maker;
		uint96 term;
		address taker;
		uint48 acceptedAt;
		uint48 deadline;

		Asset[] askAssets;
		Asset[] collateralAssets;
		Asset[] feeAssets;
	}

	/// keccak(maker, taker, nonce) => Offer struct
	mapping ( bytes32 => Offer ) public offers;

	/// address => nonce
	mapping ( address => uint256 ) public nonces;

	/// the minimum term length in seconds 
	uint256 public immutable minimumTerm;

	/**
		Emitted on offer creation.
	*/
	event Created(
		address indexed maker,
		address indexed taker,
		bytes32 key
	);

	/**
		Emitted on offer rescinded.
	*/
	event Rescinded(
		bytes32 indexed key
	);

	/**
		Emitted on offer accepted.
	*/
	event Accepted(
		address indexed acceptedBy,
		bytes32 key
	);

	/**
		Emitted on offer repaid.
	*/
	event Repaid(
		bytes32 indexed key
	);

	/**
		Emitted on collateral remanded.
	*/
	event Remanded(
		address indexed remandedBy,
		bytes32 key
	);

	/**
	
	*/
	constructor () {
		minimumTerm = 1 days;
	}

	/**
		Helper function to retrieve offer data, native getters don't return
		struct arrays
	*/
	function getOfferTokens ( 
		bytes32 _key 
	) external view returns ( Asset[] memory, Asset[] memory, Asset[] memory ) {
		return (
			offers[_key].askAssets, 
			offers[_key].collateralAssets, 
			offers[_key].feeAssets
		);
	}

	/**
		Create new offer
		deposit collateral
		deposit fee
	*/
	function create (
		Offer calldata _offer
	) external nonReentrant {
		if ( _offer.maker != msg.sender ) {
			revert OwnerMismatch();
		}

		if ( _offer.acceptedAt != 0 ) {
			revert NonZeroAcceptedAt();
		}

		if ( _offer.term < minimumTerm ) {
			revert TermTooShort();
		}

		bytes32 key = keccak256(
			abi.encodePacked(
				_offer.maker, 
				_offer.taker, 
				nonces[msg.sender]
			)
		);

		if ( offers[key].maker != address(0)) {
			revert OfferAlreadyExists();
		}

		// transfer collateral
		_handleAssetTransfers(_offer.collateralAssets, msg.sender, address(this));

		// transfer fee
		_handleAssetTransfers(_offer.feeAssets, msg.sender, address(this));

		offers[key] = _offer;

		unchecked { 
			nonces[msg.sender]++;
		}

		emit Created(
			_offer.maker, 
			_offer.taker, 
			key
		);
	}

	/**
		Rescind offer
		withdraw collateral
		withdraw fee
	*/
	function rescind (
		bytes32 _key
	) external nonReentrant {
		Offer memory offer = offers[_key];

		if(offer.maker != msg.sender){
			revert NotOfferOwner();
		}

		if (offer.acceptedAt != 0) {
			revert CantRescindAcceptedOffer();
		}

		delete offers[_key];

		// transfer collateral assets back to maker
		_handleAssetTransfers(offer.collateralAssets, address(this), msg.sender);

		// transfer fee assets back to maker
		_handleAssetTransfers(offer.feeAssets, address(this), msg.sender);

		emit Rescinded(
			_key
		);
	}

	/**
		Accept offer
		deposit ask (sent to offer maker)
		receive fee
	*/
	function accept (
		bytes32 _key
	) external nonReentrant {
		Offer memory offer = offers[_key];
		if ( offer.taker != address(0) && offer.taker != msg.sender) {
			revert NotOfferTarget();
		}

		if ( offer.acceptedAt != 0 ) {
			revert OfferAlreadyAccepted();
		}

		if ( offer.deadline != 0 && block.timestamp > offer.deadline ) {
			revert OfferExpired();
		}

		// update offer state
		offers[_key].acceptedAt = uint48(block.timestamp);
		offers[_key].taker = msg.sender;

		// transfer ask assets from taker to offer maker
		_handleAssetTransfers(offer.askAssets, msg.sender, offer.maker);

		// transfer fee assets from contract to taker
		_handleAssetTransfers(offer.feeAssets, address(this), msg.sender);

		emit Accepted(
			msg.sender,
			_key
		);
	}

	/**
		Repay offer
		return ask 
		withdraw collateral
	*/
	function repay (
		bytes32 _key
	) external nonReentrant {
		Offer memory offer = offers[_key];

		if(offer.maker != msg.sender){
			revert NotOfferOwner();
		}

		if( offer.acceptedAt == 0 ) {
			revert OfferNotAccepted();
		}

		delete offers[_key];

		// transfer ask assets from maker to original taker
		_handleAssetTransfers(offer.askAssets, msg.sender, offer.taker);

		// return collateral assets to original maker
		_handleAssetTransfers(offer.collateralAssets, address(this), msg.sender);

		emit Repaid(
			_key
		);
	}

	/**
		Remand collateral
		close offer
		receive collateral
	*/
	function remand (
		bytes32 _key
	) external nonReentrant {
		Offer memory offer = offers[_key];

		// require caller is offer taker
		if ( offer.taker != msg.sender) {
			revert NotOfferTarget();
		}

		// require offer is accepted
		if ( offer.acceptedAt == 0) {
			revert OfferNotAccepted();
		}

		// require term is expired
		if ( offer.acceptedAt + offer.term > block.timestamp ) {
			revert IncompleteTerm();
		}

		delete offers[_key];

		// transfer collateral assets to taker
		_handleAssetTransfers(offer.collateralAssets, address(this), msg.sender);

		emit Remanded(
			msg.sender,
			_key
		);
	}

/**
		iterate through array of assets and handle transfers according to the 
		assets's type (ERC20, ERC721 or ERC1155)
	*/
	function _handleAssetTransfers ( 
		Asset[] memory _assets,
		address from,
		address to
	) internal {
		for (uint256 i; i < _assets.length; ) {
			if (_assets[i].assetType == AssetType.ERC20) {
				if ( from == address(this) ) {
					IERC20(_assets[i].assetAddress).safeTransfer(
						to,
						_assets[i].quantity
					);
				} else {
					IERC20(_assets[i].assetAddress).safeTransferFrom(
						from,
						to,
						_assets[i].quantity
					);
				}
			}

			if (_assets[i].assetType == AssetType.ERC721) {
				IERC721(_assets[i].assetAddress).transferFrom(
					from,
					to,
					_assets[i].id
				);
			}

			if (_assets[i].assetType == AssetType.ERC1155) {
				IERC1155(_assets[i].assetAddress).safeTransferFrom(
					from,
					to,
					_assets[i].id,
					_assets[i].quantity,
					""
				);
			}

			unchecked {
				++i;
			}
		}
	}
}