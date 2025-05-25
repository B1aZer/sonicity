// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IArtProxy {
    function tokenURI(
        uint256 tokenId,
        uint256 repAmount,
        uint256 mintTimestamp,
        bool isListable
    ) external view returns (string memory);
}

contract SonicityYieldNFT is ERC721Enumerable, Ownable {
    struct StakeData {
        uint256 repStaked;
        uint256 mintedAt;
    }

    mapping(uint256 => StakeData) public stakeInfo;
    mapping(uint256 => bool) public lockedForYield;

    uint256 public currentTokenId;
    address public artProxy;

    constructor() ERC721("SonicityYieldNFT", "SYNFT") {}

    function setArtProxy(address _proxy) external onlyOwner {
        artProxy = _proxy;
    }

    function mint(uint256 repAmount) external returns (uint256) {
        require(repAmount > 0, "REP must be positive");

        // Here you would burn or stake REP points
        // burnREP(msg.sender, repAmount);

        currentTokenId++;
        uint256 newId = currentTokenId;

        stakeInfo[newId] = StakeData({
            repStaked: repAmount,
            mintedAt: block.timestamp
        });

        _safeMint(msg.sender, newId);
        return newId;
    }

    function lockNFT(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not your NFT");
        lockedForYield[tokenId] = true;
    }

    function unlockNFT(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not your NFT");
        lockedForYield[tokenId] = false;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Does not exist");
        StakeData memory data = stakeInfo[tokenId];
        return IArtProxy(artProxy).tokenURI(
            tokenId,
            data.repStaked,
            data.mintedAt,
            !lockedForYield[tokenId]
        );
    }
}
