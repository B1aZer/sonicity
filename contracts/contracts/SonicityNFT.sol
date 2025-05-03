// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title SonicityNFT
 * @dev NFT collection for the Sonicity game, representing virtual land plots
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
    
    // Land plot metadata
    mapping(uint256 => LandPlot) public landPlots;
    
    // Structure to store land attributes
    struct LandPlot {
        uint8 district;      // District number (0-9)
        uint8 size;          // Size of the plot (1-5)
        uint8 elevation;     // Elevation level (0-10)
        uint8 resourceType;  // Resource type (0-5) - 0: None, 1: Water, 2: Energy, etc.
        uint8 resourceLevel; // Resource abundance (0-10)
    }

    // Constructor - initialize NFT contract
    constructor() ERC721("Sonicity Land NFT", "SONIC") Ownable(msg.sender) {
        baseURI = "https://api.sonicity.game/metadata/";
        // TODO: ENABLE BY DEFAULT FOR TESTS
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
            
            // Generate random attributes for the land plot
            generateLandAttributes(tokenId);
        }
    }
    
    // Generate pseudo-random attributes for land plots
    function generateLandAttributes(uint256 tokenId) internal {
        // Simple randomness from block values - not truly random but ok for this demo
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, tokenId)));
        
        landPlots[tokenId] = LandPlot(
            uint8(rand % 10),                    // district (0-9)
            uint8((rand >> 8) % 5) + 1,          // size (1-5)
            uint8((rand >> 16) % 11),            // elevation (0-10)
            uint8((rand >> 24) % 6),             // resourceType (0-5)
            uint8((rand >> 32) % 11)             // resourceLevel (0-10)
        );
    }
    
    // Get land plot data for a token
    function getLandPlot(uint256 tokenId) external view returns (LandPlot memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return landPlots[tokenId];
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
    
    // Withdraw funds from contract
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
} 