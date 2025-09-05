// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SonicityRep
 * @dev ERC721 NFT contract for REP Forge NFTs
 * This contract allows minting of REP Forge NFTs for staking in the Altar contract
 */
contract SonicityRep is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // Maximum supply of REP Forge NFTs
    uint256 public constant MAX_SUPPLY = 2000;  // REP Station NFTs - 2k limit
    uint256 public constant MAX_MINT_PER_PLAYER = 100;  // Per-player mint limit
    
    // Base URI for token metadata
    string private _baseTokenURI;
    
    // Altar contract address
    address public altarContract;

    // Track how many NFTs each player has minted
    mapping(address => uint256) public playerMintCount;

    // Events
    event AltarContractSet(address indexed altarContract);
    event PlayerMintLimitReached(address indexed player, uint256 totalMinted);

    constructor() ERC721("Sonicity REP Forge", "SONICITY_REP") Ownable(msg.sender) {
        _baseTokenURI = "http://localhost:3000/metadata/rep/";
    }

    /**
     * @dev Set the Altar contract address
     * @param _altarContract The address of the Altar contract
     */
    function setAltarContract(address _altarContract) external onlyOwner {
        require(_altarContract != address(0), "Invalid altar contract address");
        altarContract = _altarContract;
        emit AltarContractSet(_altarContract);
    }

    // Minting control functions removed - all minting now goes through Altar contract

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

    // Direct minting removed - all minting now goes through the Altar contract

    /**
     * @dev Get the base URI for token metadata
     * @return The base URI string
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Set the base URI for token metadata
     * @param baseURI The new base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Get the token URI for a specific token
     * @param tokenId The token ID
     * @return The token URI string
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return string(abi.encodePacked(_baseURI(), tokenId.toString(), ".json"));
    }

    /**
     * @dev Withdraw contract balance to owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
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