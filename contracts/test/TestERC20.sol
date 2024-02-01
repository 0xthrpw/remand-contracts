// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/*
	It saves bytecode to revert on custom errors instead of using require
	statements. We are just declaring these errors for reverting with upon various
	conditions later in this contract.
*/
error SweepingTransferFailed();

/**
	@title A basic ERC-20 token.
	
*/
contract TestERC20 is
	ERC20, Ownable, ReentrancyGuard
{
	using SafeERC20 for IERC20;

	/// A version number for this Token contract's interface.
	uint256 public version = 1;

	/**
		Construct a new Token by providing it a name, ticker, and supply cap.

		@param _name The name of the new Token.
		@param _ticker The ticker symbol of the new Token.
	*/
	constructor (
		string memory _name,
		string memory _ticker
	) ERC20(_name, _ticker) { }

	/**
	 * @dev Destroys `amount` tokens from the caller.
	 *
	 * See {ERC20-_burn}.
	 */
	function burn(uint256 amount) public virtual {
			_burn(_msgSender(), amount);
	}

	/**
	* @dev Destroys `amount` tokens from `account`, deducting from the caller's
	* allowance.
	*
	* See {ERC20-_burn} and {ERC20-allowance}.
	*
	* Requirements:
	*
	* - the caller must have allowance for ``accounts``'s tokens of at least
	* `amount`.
	*/
	function burnFrom(address account, uint256 amount) public virtual {
		require(amount <= allowance(account, _msgSender()),
			"ERC20: burn amount exceeds allowance");
		uint256 decreasedAllowance = allowance(account, _msgSender()) - amount;

		_approve(account, _msgSender(), decreasedAllowance);
		_burn(account, amount);
	}

	/**
		Allows Token creator to mint `_amount` of this Token to the address `_to`.
		New tokens of this Token cannot be minted if it would exceed the supply cap.
		Users are delegated votes when they are minted Token.

		@param _to the address to mint Tokens to.
		@param _amount the amount of new Token to mint.
	*/
	function mint(address _to, uint256 _amount) external onlyOwner {
		_mint(_to, _amount);
	}

	/**
		Allows users to transfer tokens to a recipient, moving delegated votes with
		the transfer.

		@param recipient The address to transfer tokens to.
		@param amount The amount of tokens to send to `recipient`.
	*/
	function transfer(address recipient, uint256 amount) public override returns (bool) {
		_transfer(_msgSender(), recipient, amount);
		return true;
	}

	/**
		Allow the owner to sweep either Ether or a particular ERC-20 token from the
		contract and send it to another address. This allows the owner of the shop
		to withdraw their funds after the sale is completed.

		@param _token The token to sweep the balance from; if a zero address is sent
			then the contract's balance of Ether will be swept.
		@param _amount The amount of token to sweep.
		@param _destination The address to send the swept tokens to.
	*/
	function sweep (
		address _token,
		address _destination,
		uint256 _amount
	) external onlyOwner nonReentrant {

		// A zero address means we should attempt to sweep Ether.
		if (_token == address(0)) {
			(bool success, ) = payable(_destination).call{ value: _amount }("");
			if (!success) { revert SweepingTransferFailed(); }

		// Otherwise, we should try to sweep an ERC-20 token.
		} else {
			IERC20(_token).safeTransfer(_destination, _amount);
		}
	}
}
