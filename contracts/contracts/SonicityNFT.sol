// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SonicityNFT
 * @dev Basic NFT contract for the Sonicity game
 */
contract SonicityNFT is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // Token config
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MAX_MINT_PER_TX = 10;
    uint256 public mintPrice = 0.01 ether;
    bool public mintIsActive = false;

    // Base URI
    string public baseURI;

    // Constructor - initialize NFT contract
    constructor() ERC721("Sonicity Land NFT", "SONIC") Ownable(msg.sender) {
        baseURI = "http://localhost:3000/metadata/";
        mintIsActive = true;  // Enable minting by default
    }

    // Mint function - allows users to mint NFTs
    function mint(uint256 _numTokens) external payable {
        require(mintIsActive, "Minting is not active");
        require(_numTokens > 0 && _numTokens <= MAX_MINT_PER_TX, "Invalid token count");
        require(totalSupply() + _numTokens <= MAX_SUPPLY, "Exceeds max supply");
        require(mintPrice * _numTokens <= msg.value, "Insufficient payment");
        
        for (uint256 i = 0; i < _numTokens; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(msg.sender, tokenId);
        }
    }

    // Set mint state (active/inactive)
    function setMintActive(bool _state) external onlyOwner {
        mintIsActive = _state;
    }
    
    // Set mint price
    function setMintPrice(uint256 _price) external onlyOwner {
        mintPrice = _price;
    }
    
    // Set base URI for metadata
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }
    
    // Override base URI function
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
    
    // Return token URI with metadata JSON URL
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        
        // Returns URL to JSON metadata file
        // The JSON should follow ERC721 metadata standard:
        // {
        //     "name": "Land Plot #1",
        //     "description": "A plot of land in Sonicity",
        //     "image": "https://api.sonicity.game/images/1.jpg",
        //     "attributes": [
        //         {
        //             "trait_type": "District",
        //             "value": "Central"
        //         },
        //         {
        //             "trait_type": "Building Slots",
        //             "value": 5
        //         }
        //     ]
        // }
        return string(abi.encodePacked(
            baseURI,
            tokenId.toString(),
            ".json"
        ));
    }
    
    // Withdraw funds from contract
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
} 