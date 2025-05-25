// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract SonicityArtProxy {
    function _tokenURI(
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

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) { digits -= 1; buffer[digits] = bytes1(uint8(48 + uint256(value % 10))); value /= 10; }
        return string(buffer);
    }

    function _base64(bytes memory data) internal pure returns (string memory) {
        string memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        string memory result = new string(4 * ((data.length + 2) / 3));
        bytes memory table = bytes(TABLE);
        bytes memory output = bytes(result);

        for (uint256 i = 0; i < data.length; i += 3) {
            uint256 a = uint8(data[i]);
            uint256 b = i + 1 < data.length ? uint8(data[i + 1]) : 0;
            uint256 c = i + 2 < data.length ? uint8(data[i + 2]) : 0;

            uint256 triple = (a << 16) | (b << 8) | c;

            output[4 * i / 3]     = table[(triple >> 18) & 0x3F];
            output[4 * i / 3 + 1] = table[(triple >> 12) & 0x3F];
            output[4 * i / 3 + 2] = i + 1 < data.length ? table[(triple >> 6) & 0x3F] : '=';
            output[4 * i / 3 + 3] = i + 2 < data.length ? table[triple & 0x3F] : '=';
        }

        return string(output);
    }
}
