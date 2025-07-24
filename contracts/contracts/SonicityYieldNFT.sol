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
    uint256 public constant MAX_MINT_PER_TX = 5;
    uint256 public mintPrice = 0; // Free minting
    bool public mintIsActive = false;

    // Base URI
    string public baseURI;

    // Altar contract address - only this contract can call mintForAltar
    address public altarContract;

    // Art proxy for dynamic metadata
    address public artProxy;

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
    event MintActiveSet(bool indexed mintActive);

    // Constructor - initialize NFT contract
    constructor() ERC721("Sonicity Yield NFT", "SYNFT") Ownable(msg.sender) {
        baseURI = "http://localhost:3000/metadata/yield/";
        mintIsActive = true; // Enable minting by default
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
        
        stakeInfo[tokenId] = StakeData({
            repStaked: repAmount,
            mintedAt: block.timestamp
        });
        
        _safeMint(to, tokenId);
    }

    // DEPRECATED: Mint function - allows users to mint NFTs
    // This method is deprecated and will be disabled on production
    // Use mintForAltar method instead which can only be called by the Altar contract
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

    // Set mint state (active/inactive)
    function setMintActive(bool _state) external onlyOwner {
        mintIsActive = _state;
        emit MintActiveSet(_state);
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
    
    // Withdraw funds from contract
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
