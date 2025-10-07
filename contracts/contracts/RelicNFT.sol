// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title RelicNFT
 * @dev ERC721 NFT contract for Adventure Relics
 * This contract allows minting of Relic NFTs found during adventures
 * Relics are rare collectible items with different rarity tiers
 */
contract RelicNFT is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // Token config
    uint256 public constant MAX_SUPPLY = 500;  // Relic NFTs - 500 limit (rare!)
    uint256 public constant MAX_MINT_PER_PLAYER = 50;  // Per-player mint limit

    // Base URI
    string public baseURI;

    // Adventure System contract address - only this contract can mint
    address public adventureSystemAddress;

    // Track how many NFTs each player has minted
    mapping(address => uint256) public playerMintCount;

    // Token ID counter for auto-generation
    uint256 private _tokenIdCounter;

    // Relic metadata
    struct Relic {
        uint256 foundAt;        // Timestamp when found
        address finder;         // Player who found it
        uint8 rarity;          // Rarity level (1-5)
    }

    mapping(uint256 => Relic) public relics;

    // Events
    event AdventureSystemSet(address indexed adventureSystemAddress);
    event RelicMinted(address indexed player, uint256 indexed tokenId, uint8 rarity);
    event PlayerMintLimitReached(address indexed player, uint256 totalMinted);

    // Constructor - initialize NFT contract
    constructor() ERC721("Sonicity Relic", "RELIC") Ownable(msg.sender) {
        baseURI = "http://localhost:3000/metadata/relics/";
        _tokenIdCounter = 1; // Start from 1 to avoid token ID 0
    }

    /**
     * @dev Set the Adventure System contract address
     * @param _adventureSystemAddress The address of the Adventure System contract
     */
    function setAdventureSystemAddress(address _adventureSystemAddress) external onlyOwner {
        require(_adventureSystemAddress != address(0), "Invalid adventure system address");
        adventureSystemAddress = _adventureSystemAddress;
        emit AdventureSystemSet(_adventureSystemAddress);
    }

    /**
     * @dev Mint Relic NFT for Adventure System - only callable by Adventure System contract
     * @param to The address to mint the NFT to
     * @return tokenId The auto-generated token ID
     */
    function mintForAdventure(address to) external returns (uint256 tokenId) {
        require(msg.sender == adventureSystemAddress, "Only Adventure System can call this");
        require(_tokenIdCounter <= MAX_SUPPLY, "Maximum supply reached");
        require(playerMintCount[to] < MAX_MINT_PER_PLAYER, "Player has reached mint limit");
        
        tokenId = _tokenIdCounter++;
        
        // Generate random rarity (1-5)
        uint8 rarity = _generateRarity(tokenId);
        
        relics[tokenId] = Relic({
            foundAt: block.timestamp,
            finder: to,
            rarity: rarity
        });
        
        _safeMint(to, tokenId);
        
        // Update player mint count
        playerMintCount[to] += 1;
        
        emit RelicMinted(to, tokenId, rarity);
        
        if (playerMintCount[to] == MAX_MINT_PER_PLAYER) {
            emit PlayerMintLimitReached(to, playerMintCount[to]);
        }
    }

    /**
     * @dev Generate random rarity for a relic
     * @param tokenId The token ID for additional randomness
     * @return rarity The rarity level (1-5)
     * 
     * Rarity Distribution:
     * Common (1): 50%
     * Uncommon (2): 30%
     * Rare (3): 15%
     * Epic (4): 4%
     * Legendary (5): 1%
     */
    function _generateRarity(uint256 tokenId) internal view returns (uint8) {
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            tokenId,
            msg.sender
        ))) % 100;
        
        if (random < 1) return 5;        // 1% - Legendary
        if (random < 5) return 4;        // 4% - Epic
        if (random < 20) return 3;       // 15% - Rare
        if (random < 50) return 2;       // 30% - Uncommon
        return 1;                        // 50% - Common
    }

    /**
     * @dev Burn NFT - callable by token owner
     * @param tokenId The token ID to burn
     */
    function burn(uint256 tokenId) external {
        require(_ownerOf(tokenId) == msg.sender, "Not the token owner");
        
        // Clear relic data before burning
        delete relics[tokenId];
        
        _burn(tokenId);
    }

    /**
     * @dev Get relic metadata
     * @param tokenId The token ID
     * @return The relic metadata
     */
    function getRelicMetadata(uint256 tokenId) external view returns (Relic memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return relics[tokenId];
    }

    /**
     * @dev Get rarity name for display
     * @param rarity The rarity level (1-5)
     * @return The rarity name string
     */
    function getRarityName(uint8 rarity) public pure returns (string memory) {
        if (rarity == 5) return "Legendary";
        if (rarity == 4) return "Epic";
        if (rarity == 3) return "Rare";
        if (rarity == 2) return "Uncommon";
        return "Common";
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
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        return string(abi.encodePacked(
            baseURI,
            tokenId.toString(),
            ".json"
        ));
    }
    
    /**
     * @dev Get remaining mint allowance for a player
     * @param player The player address to check
     * @return The number of NFTs the player can still mint
     */
    function getRemainingMintAllowance(address player) external view returns (uint256) {
        if (playerMintCount[player] >= MAX_MINT_PER_PLAYER) {
            return 0;
        }
        return MAX_MINT_PER_PLAYER - playerMintCount[player];
    }

    /**
     * @dev Check if a player can mint a specific number of NFTs
     * @param player The player address to check
     * @param amount The number of NFTs to check
     * @return Whether the player can mint the specified amount
     */
    function canPlayerMint(address player, uint256 amount) external view returns (bool) {
        return playerMintCount[player] + amount <= MAX_MINT_PER_PLAYER;
    }

    /**
     * @dev Get current token ID counter (for testing and debugging)
     * @return The current token ID counter
     */
    function getTokenIdCounter() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // Withdraw funds from contract
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}

