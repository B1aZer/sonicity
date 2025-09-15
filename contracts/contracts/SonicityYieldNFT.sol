// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IArtProxy {
    function tokenURI(
        uint256 tokenId,
        uint256 repAmount,
        uint256 mintTimestamp,
        bool isListable
    ) external view returns (string memory);
}

/**
 * @title SonicityYieldNFT
 * @dev ERC721 NFT contract for REP Forge yield NFTs
 * This contract allows minting of dynamic yield NFTs from staked REP
 */
contract SonicityYieldNFT is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // Token config
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant MAX_MINT_PER_PLAYER = 100;  // Per-player mint limit

    // Base URI
    string public baseURI;

    // Altar contract address - only this contract can call mintForAltar
    address public altarContract;

    // Art proxy for dynamic metadata
    address public artProxy;

    // Track how many NFTs each player has minted
    mapping(address => uint256) public playerMintCount;

    // Token ID counter for auto-generation
    uint256 private _tokenIdCounter;

    // Stake data for each token
    struct StakeData {
        uint256 repStaked;
        uint256 mintedAt;
    }

    mapping(uint256 => StakeData) public stakeInfo;
    mapping(uint256 => bool) public lockedForYield;

    // Events
    event AltarContractSet(address indexed altarContract);
    event ArtProxySet(address indexed artProxy);
    event PlayerMintLimitReached(address indexed player, uint256 totalMinted);

    // Constructor - initialize NFT contract
    constructor() ERC721("Sonicity Yield NFT", "SYNFT") Ownable(msg.sender) {
        baseURI = "http://localhost:3000/metadata/yield/";
        _tokenIdCounter = 1; // Start from 1 to avoid token ID 0
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

    /**
     * @dev Set the Art Proxy address
     * @param _artProxy The address of the Art Proxy contract
     */
    function setArtProxy(address _artProxy) external onlyOwner {
        require(_artProxy != address(0), "Invalid art proxy address");
        artProxy = _artProxy;
        emit ArtProxySet(_artProxy);
    }

    /**
     * @dev Mint NFT for Altar contract - only callable by Altar contract
     * @param to The address to mint the NFT to
     * @param tokenId The specific token ID to mint
     * @param repAmount The amount of REP staked for this NFT
     */
    function mintForAltar(address to, uint256 tokenId, uint256 repAmount) external {
        require(msg.sender == altarContract, "Only Altar contract can call this function");
        require(tokenId > 0 && tokenId <= MAX_SUPPLY, "Invalid token ID");
        require(_ownerOf(tokenId) == address(0), "Token already exists");
        require(repAmount > 0, "REP amount must be positive");
        require(playerMintCount[to] < MAX_MINT_PER_PLAYER, "Player has reached mint limit");
        
        stakeInfo[tokenId] = StakeData({
            repStaked: repAmount,
            mintedAt: block.timestamp
        });
        
        _safeMint(to, tokenId);
        
        // Update player mint count
        playerMintCount[to] += 1;
        
        if (playerMintCount[to] == MAX_MINT_PER_PLAYER) {
            emit PlayerMintLimitReached(to, playerMintCount[to]);
        }
    }

    /**
     * @dev Mint NFT for Altar contract with auto-generated token ID - only callable by Altar contract
     * @param to The address to mint the NFT to
     * @param repAmount The amount of REP staked for this NFT
     * @return tokenId The auto-generated token ID
     */
    function mintForAltarAuto(address to, uint256 repAmount) external returns (uint256 tokenId) {
        require(msg.sender == altarContract, "Only Altar contract can call this function");
        require(_tokenIdCounter <= MAX_SUPPLY, "Maximum supply reached");
        require(repAmount > 0, "REP amount must be positive");
        require(playerMintCount[to] < MAX_MINT_PER_PLAYER, "Player has reached mint limit");
        
        tokenId = _tokenIdCounter++;
        
        stakeInfo[tokenId] = StakeData({
            repStaked: repAmount,
            mintedAt: block.timestamp
        });
        
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
        
        // Clear stake data before burning
        delete stakeInfo[tokenId];
        delete lockedForYield[tokenId];
        
        _burn(tokenId);
    }

    /**
     * @dev Burn NFT - callable by token owner
     * @param tokenId The token ID to burn
     */
    function burn(uint256 tokenId) external {
        require(_ownerOf(tokenId) == msg.sender, "Not the token owner");
        
        // Clear stake data before burning
        delete stakeInfo[tokenId];
        delete lockedForYield[tokenId];
        
        _burn(tokenId);
    }

    // Direct minting removed - all minting now goes through the Altar contract

    /**
     * @dev Lock NFT for yield generation
     * @param tokenId The token ID to lock
     */
    function lockNFT(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not your NFT");
        lockedForYield[tokenId] = true;
    }

    /**
     * @dev Unlock NFT from yield generation
     * @param tokenId The token ID to unlock
     */
    function unlockNFT(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not your NFT");
        lockedForYield[tokenId] = false;
    }

    // Minting control functions removed - all minting now goes through the Altar contract
    
    // Set base URI for metadata
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }
    
    // Override base URI function
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
    
    // Return token URI with dynamic metadata
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        
        // If art proxy is set, use dynamic metadata
        if (artProxy != address(0)) {
            StakeData memory data = stakeInfo[tokenId];
            return IArtProxy(artProxy).tokenURI(
                tokenId,
                data.repStaked,
                data.mintedAt,
                !lockedForYield[tokenId]
            );
        }
        
        // Fallback to static metadata
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
