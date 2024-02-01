// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

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


/**
	Thrown when wrong user tries to accept private offer
*/
error NotOfferTarget();

/**
	Thrown when wrong user tries to rescind offer
*/
error NotOfferOwner();

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
	@custom:benediction DEVS BENEDICAT ET PROTEGAT CONTRACTVS MEAM
	@title Remand: NFT, ERC20 and native ETH Collateral Lending
	@author throw; <@0xthrpw>

	Time based token lending that is completely independent of price.
	
	This contract allows users to borrow and lend tokens for a term and in return
	for fees. it is completely up to the users to determine what constitutes a 
	'fair' offer. 

	@custom:date January 30th, 2024.
*/
contract RemandERC721 is Ownable, ReentrancyGuard {
	using SafeERC20 for IERC20;
	
	enum AssetType {
		Native,
		ERC20,
		ERC721,
		ERC1155
	}

	struct Offer {
		address owner;
		address target;

		address collateral;
		address fee;

		uint256 principalAmount;
		uint256 feeAmount;

		uint256 term;
		uint256 acceptedAt;

		AssetType collateralType;
		AssetType feeType;
	}

	/// keccak(owner, target, collateral, nonce) => Offer struct
	mapping ( bytes32 => Offer ) public offers;

	/// address => nonce
	mapping ( address => uint256 ) public nonces;

	/**
		Emitted on offer creation.
	*/
	event Created(
		address indexed owner,
		address indexed target,
		address indexed collateral,
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

	}

	/**
		Handle ETH deposits
	*/
	receive ( ) external payable { }

	/**
		Create new offer
		deposit collateral
		deposit fee
	*/
	function create (
		Offer calldata _offer
	) external nonReentrant {

		bytes32 key = keccak256(
			abi.encodePacked(
				_offer.owner, 
				_offer.target, 
				_offer.collateral, 
				nonces[msg.sender]
			)
		);

		// transfer collateral

		// transfer fee

		offers[key] = _offer;

		unchecked { 
			nonces[msg.sender]++;
		}

		emit Created(
			_offer.owner, 
			_offer.target, 
			_offer.collateral,
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
		if(offer.owner != msg.sender){
			revert NotOfferOwner();
		}

		if (offer.acceptedAt != 0) {
			revert CantRescindAcceptedOffer();
		}

		delete offers[_key];

		// transfer collateral back to owner

		// transfer fee back to owner
		emit Rescinded(
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

		emit Repaid(
			_key
		);
	}

	/**
		Accept offer
		deposit ask (sent to offer owner)
		receive fee
	*/
	function accept (
		bytes32 _key
	) external nonReentrant {
		Offer memory offer = offers[_key];
		if ( offer.target != address(0) && offer.target != msg.sender) {
			revert NotOfferTarget();
		}

		if ( offer.acceptedAt != 0 ) {
			revert OfferAlreadyAccepted();
		}
		// update offer state

		// transfer ask to offer owner

		// transfer fee from contract to target

		emit Accepted(
			msg.sender,
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

		// require valid offer
		if ( offer.acceptedAt == 0) {
			revert OfferNotAccepted();
		}

		// require term is expired
		if ( offer.acceptedAt + offer.term < block.timestamp ) {
			revert IncompleteTerm();
		}


		// update offer state

		// transfer collateral to target

		emit Remanded(
			msg.sender,
			_key
		);
	}

}