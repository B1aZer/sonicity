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
    uint256 public constant MAX_SUPPLY = 5000;  // Lower supply than houses
    uint256 public constant MAX_MINT_PER_TX = 5;
    uint256 public mintPrice = 0;  // Free minting
    bool public mintIsActive = false;

    // Base URI
    string public baseURI;

    // Altar contract address - only this contract can call mintForAltar
    address public altarContract;

    // Constructor - initialize NFT contract
    constructor() ERC721("Sonicity Farm NFT", "SFARM") Ownable(msg.sender) {
        baseURI = "http://localhost:3000/metadata/farms/";
        mintIsActive = true;  // Enable minting by default
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
     * @dev Mint NFT for Altar contract - only callable by Altar contract
     * @param to The address to mint the NFT to
     * @param tokenId The specific token ID to mint
     */
    function mintForAltar(address to, uint256 tokenId) external {
        require(msg.sender == altarContract, "Only Altar contract can call this function");
        require(tokenId > 0 && tokenId <= MAX_SUPPLY, "Invalid token ID");
        require(!_exists(tokenId), "Token already exists");
        
        _safeMint(to, tokenId);
    }

    /**
     * @dev Set the Altar contract address
     * @param _altarContract The address of the Altar contract
     */
    function setAltarContract(address _altarContract) external onlyOwner {
        require(_altarContract != address(0), "Invalid altar contract address");
        altarContract = _altarContract;
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