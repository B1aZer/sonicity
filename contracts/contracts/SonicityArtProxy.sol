// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title SonicityArtProxy
 * @dev Contract for generating dynamic SVG images and metadata for Sonicity Yield NFTs
 * This contract creates on-chain SVG with REP amount, mint date, and status
 */
contract SonicityArtProxy {
    
    /**
     * @dev Generate token URI with dynamic metadata
     * @param tokenId The token ID
     * @param repStaked The amount of REP staked
     * @param mintedAt The mint timestamp
     * @param isListable Whether the NFT is listable
     * @return The base64-encoded JSON metadata
     */
    function tokenURI(
        uint256 tokenId,
        uint256 repStaked,
        uint256 mintedAt,
        bool isListable
    ) external pure returns (string memory) {
        string memory name = string(abi.encodePacked("Sonicity Yield NFT #", _toString(tokenId)));
        string memory description = "This NFT represents staked REP and yield rights in the Sonicity economy.";

        string memory image = _generateSVG(repStaked, mintedAt, isListable);

        string memory metadata = string(abi.encodePacked(
            '{',
                '"name":"', name, '",',
                '"description":"', description, '",',
                '"attributes":[',
                    '{"trait_type":"REP Committed","value":', _toString(repStaked), '},',
                    '{"trait_type":"Minted","display_type":"date","value":', _toString(mintedAt), '},',
                    '{"trait_type":"Listable","value":"', isListable ? "Yes" : "No", '"}',
                '],',
                '"image":"data:image/svg+xml;base64,', image, '"',
            '}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,", _base64(bytes(metadata))
        ));
    }

    /**
     * @dev Generate SVG image with dynamic data
     * @param repStaked The amount of REP staked
     * @param mintedAt The mint timestamp
     * @param isListable Whether the NFT is listable
     * @return The base64-encoded SVG
     */
    function _generateSVG(uint256 repStaked, uint256 mintedAt, bool isListable) internal pure returns (string memory) {
        string memory text = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350">',
                '<rect width="100%" height="100%" fill="#f2f0e8"/>',
                '<text x="20" y="40" font-size="20" fill="#333">Sonicity Yield NFT</text>',
                '<text x="20" y="80" font-size="14" fill="#666">REP: ', _toString(repStaked), '</text>',
                '<text x="20" y="110" font-size="14" fill="#666">Minted: ', _toString(mintedAt), '</text>',
                '<text x="20" y="140" font-size="14" fill="#666">Listable: ', isListable ? "Yes" : "No", '</text>',
            '</svg>'
        ));

        return _base64(bytes(text));
    }

    // ========== Utils ==========

    /**
     * @dev Convert uint256 to string
     * @param value The value to convert
     * @return The string representation
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) { digits -= 1; buffer[digits] = bytes1(uint8(48 + uint256(value % 10))); value /= 10; }
        return string(buffer);
    }

    /**
     * @dev Encode bytes to base64 (simplified to avoid stack too deep)
     * @param data The data to encode
     * @return The base64-encoded string
     */
    function _base64(bytes memory data) internal pure returns (string memory) {
        string memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 len = data.length;
        if (len == 0) return "";
        
        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        bytes memory table = bytes(TABLE);
        
        uint256 i = 0;
        uint256 j = 0;
        
        while (i < len) {
            uint256 a = i < len ? uint8(data[i]) : 0;
            uint256 b = i + 1 < len ? uint8(data[i + 1]) : 0;
            uint256 c = i + 2 < len ? uint8(data[i + 2]) : 0;
            
            uint256 triple = (a << 16) | (b << 8) | c;
            
            result[j] = table[(triple >> 18) & 0x3F];
            result[j + 1] = table[(triple >> 12) & 0x3F];
            result[j + 2] = i + 1 < len ? table[(triple >> 6) & 0x3F] : bytes1('=');
            result[j + 3] = i + 2 < len ? table[triple & 0x3F] : bytes1('=');
            
            i += 3;
            j += 4;
        }
        
        return string(result);
    }
}
