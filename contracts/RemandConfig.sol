// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

contract RemandConfig {

	/// Return the magic value signifying the ability to receive ERC-721 items.
	function onERC721Received (
		address,
		address,
		uint256,
		bytes memory
	) public pure returns (bytes4) {
		return bytes4(
			keccak256(
				"onERC721Received(address,address,uint256,bytes)"
			)
		);
	}

	/// Return the magic value signifying the ability to receive ERC-1155 items.
	function onERC1155Received (
		address,
		address,
		uint256,
		uint256,
		bytes memory
	) public pure returns (bytes4) {
		return bytes4(
			keccak256(
				"onERC1155Received(address,address,uint256,uint256,bytes)"
			)
		);
	}

	/// Return the magic value signifying the ability to batch receive ERC-1155.
	function onERC1155BatchReceived (
		address,
		address,
		uint256[] memory,
		uint256[] memory,
		bytes memory
	) public pure returns (bytes4) {
		return bytes4(
			keccak256(
				"onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"
			)
		);
	}
}