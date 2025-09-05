// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SonicityFarm
 * @dev NFT contract for farm buildings in the Sonicity game
 */
contract SonicityFarm is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // Token config
    uint256 public constant MAX_SUPPLY = 4000;  // Farm NFTs - 4k limit
    uint256 public constant MAX_MINT_PER_PLAYER = 100;  // Per-player mint limit

    // Base URI
    string public baseURI;

    // Altar contract address - only this contract can call mintForAltar
    address public altarContract;

    // Track how many NFTs each player has minted
    mapping(address => uint256) public playerMintCount;

    // Events
    event PlayerMintLimitReached(address indexed player, uint256 totalMinted);

    // Constructor - initialize NFT contract
    constructor() ERC721("Sonicity Farm NFT", "SFARM") Ownable(msg.sender) {
        baseURI = "http://localhost:3000/metadata/farms/";
    }

    /**
     * @dev Mint NFT for Altar contract - only callable by Altar contract
     * @param to The address to mint the NFT to
     * @param tokenId The specific token ID to mint
     */
    function mintForAltar(address to, uint256 tokenId) external {
        require(msg.sender == altarContract, "Only Altar contract can call this function");
        require(tokenId > 0 && tokenId <= MAX_SUPPLY, "Invalid token ID");
        require(_ownerOf(tokenId) == address(0), "Token already exists");
        require(playerMintCount[to] < MAX_MINT_PER_PLAYER, "Player has reached mint limit");
        
        _safeMint(to, tokenId);
        
        // Update player mint count
        playerMintCount[to] += 1;
        
        if (playerMintCount[to] == MAX_MINT_PER_PLAYER) {
            emit PlayerMintLimitReached(to, playerMintCount[to]);
        }
    }

    /**
     * @dev Burn NFT - only callable by Altar contract
     * @param tokenId The token ID to burn
     */
    function burnForAltar(uint256 tokenId) external {
        require(msg.sender == altarContract, "Only Altar contract can call this function");
        require(_ownerOf(tokenId) == altarContract, "Token not owned by Altar");
        
        _burn(tokenId);
    }

    /**
     * @dev Burn NFT - callable by token owner
     * @param tokenId The token ID to burn
     */
    function burn(uint256 tokenId) external {
        require(_ownerOf(tokenId) == msg.sender, "Not the token owner");
        
        _burn(tokenId);
    }

    /**
     * @dev Set the Altar contract address
     * @param _altarContract The address of the Altar contract
     */
    function setAltarContract(address _altarContract) external onlyOwner {
        require(_altarContract != address(0), "Invalid altar contract address");
        altarContract = _altarContract;
    }

    // These functions are no longer needed as direct minting is removed
    // All minting now goes through the Altar contract
    
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
}