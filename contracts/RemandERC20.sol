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
	@title Remand: ERC20 Collateral Lending
	@author throw; <@0xthrpw>

	Time based token lending that is independent of asset price.
	
	This contract allows users to borrow and lend tokens for a term in return
	for fees. if the borrower does not return the 'ask' token by the end of the 
	term, then the lender can remand the collateral. it is completely up to the 
	users to determine what constitutes a 'fair' offer. 

	@custom:date January 30th, 2024.
*/
contract RemandERC20 is Ownable, ReentrancyGuard {
	using SafeERC20 for IERC20;

	struct Offer {
		address maker;
		uint96 term;
		address taker;
		uint48 acceptedAt;
		uint48 deadline;
		address askToken;
		uint96 askAmount;
		address collateral;
		uint96 collateralAmount;
		address fee;
		uint96 feeAmount;
	}

	/// keccak(maker, taker, collateral, nonce) => Offer struct
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
		minimumTerm = 1 days;
	}

	/**
		Create new offer
		deposit collateral
		deposit fee
	*/
	function create (
		Offer calldata _offer
	) external nonReentrant {
		if (_offer.maker != msg.sender) {
			revert OwnerMismatch();
		}

		if (_offer.acceptedAt != 0) {
			revert NonZeroAcceptedAt();
		}

		if ( _offer.collateral == _offer.askToken ) {
			revert AskIsCollateral();
		}

		if ( _offer.term < minimumTerm ) {
			revert TermTooShort();
		}

		bytes32 key = keccak256(
			abi.encodePacked(
				_offer.maker, 
				_offer.taker, 
				_offer.collateral, 
				nonces[msg.sender]
			)
		);

		if ( offers[key].maker != address(0)) {
			revert OfferAlreadyExists();
		}

		// transfer collateral
		IERC20(_offer.collateral).safeTransferFrom(
			msg.sender,
			address(this),
			_offer.collateralAmount
		);

		// transfer fee
		IERC20(_offer.fee).safeTransferFrom(
			msg.sender,
			address(this),
			_offer.feeAmount
		);

		offers[key] = _offer;

		unchecked { 
			nonces[msg.sender]++;
		}

		emit Created(
			_offer.maker, 
			_offer.taker, 
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

		if(offer.maker != msg.sender){
			revert NotOfferOwner();
		}

		if (offer.acceptedAt != 0) {
			revert CantRescindAcceptedOffer();
		}

		delete offers[_key];

		// transfer collateral back to maker
		IERC20(offer.collateral).safeTransfer(
			msg.sender,
			offer.collateralAmount
		);

		// transfer fee back to maker
		IERC20(offer.fee).safeTransfer(
			msg.sender,
			offer.feeAmount
		);

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

		// transfer ask from taker to offer maker
		IERC20(offer.askToken).safeTransferFrom(
			msg.sender,
			offer.maker,
			offer.askAmount
		);
		// transfer fee from contract to taker
		IERC20(offer.fee).safeTransfer(
			msg.sender,
			offer.feeAmount
		);

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

		// transfer ask from maker to original taker
		IERC20(offer.askToken).safeTransferFrom(
			msg.sender,
			offer.taker,
			offer.askAmount
		);

		// return collateral to original maker
		IERC20(offer.collateral).safeTransfer(
			msg.sender,
			offer.collateralAmount
		);

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

		// transfer collateral to taker
		IERC20(offer.collateral).safeTransfer(
			msg.sender,
			offer.collateralAmount
		);

		delete offers[_key];

		emit Remanded(
			msg.sender,
			_key
		);
	}

}