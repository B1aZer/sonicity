// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title SonicityArtProxy
 * @dev Contract for generating dynamic SVG images and metadata for Sonicity Yield NFTs
 * This contract creates on-chain SVG with REP amount, mint date, and status
 */
contract SonicityArtProxy {
    
    // Struct to hold tier styling information
    struct TierStyle {
        string tierName;
        string backgroundColor;
        string borderColor;
        string textColor;
        string accentColor;
        string prestigeIcon;
    }

    // Struct to hold SVG generation parameters
    struct SVGParams {
        uint256 repStaked;
        uint256 mintedAt;
        bool isListable;
        TierStyle style;
    }

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
        string memory name = _generateName(tokenId);
        string memory description = "This NFT represents staked REP and yield rights in the Sonicity economy.";
        string memory image = _generateSVG(repStaked, mintedAt, isListable);
        string memory attributes = _generateAttributes(repStaked, mintedAt, isListable);
        
        string memory metadata = string(abi.encodePacked(
            '{"name":"', name, '","description":"', description, '","attributes":', attributes, ',"image":"data:image/svg+xml;base64,', image, '"}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,", _base64(bytes(metadata))
        ));
    }

    /**
     * @dev Generate the NFT name
     * @param tokenId The token ID
     * @return The name string
     */
    function _generateName(uint256 tokenId) internal pure returns (string memory) {
        return string(abi.encodePacked("Sonicity Yield NFT #", _toString(tokenId)));
    }

    /**
     * @dev Generate the attributes array with prestige tier
     * @param repStaked The amount of REP staked
     * @param mintedAt The mint timestamp
     * @param isListable Whether the NFT is listable
     * @return The attributes JSON string
     */
    function _generateAttributes(uint256 repStaked, uint256 mintedAt, bool isListable) internal pure returns (string memory) {
        // Determine tier name and rarity
        string memory tierName;
        string memory rarity;
        
        if (repStaked >= 101) {
            tierName = "Legendary";
            rarity = "Ultra Rare";
        } else if (repStaked >= 51) {
            tierName = "Gold";
            rarity = "Rare";
        } else if (repStaked >= 11) {
            tierName = "Silver";
            rarity = "Uncommon";
        } else {
            tierName = "Bronze";
            rarity = "Common";
        }
        
        string memory repAttr = string(abi.encodePacked('{"trait_type":"REP Staked","value":', _toString(repStaked), '}'));
        string memory tierAttr = string(abi.encodePacked('{"trait_type":"Prestige Tier","value":"', tierName, '"}'));
        string memory rarityAttr = string(abi.encodePacked('{"trait_type":"Rarity","value":"', rarity, '"}'));
        string memory mintAttr = string(abi.encodePacked('{"trait_type":"Minted","display_type":"date","value":', _toString(mintedAt), '}'));
        string memory listableAttr = string(abi.encodePacked('{"trait_type":"Tradeable","value":"', isListable ? "Yes" : "No", '"}'));
        
        return string(abi.encodePacked('[', repAttr, ',', tierAttr, ',', rarityAttr, ',', mintAttr, ',', listableAttr, ']'));
    }

    /**
     * @dev Get tier styling based on REP amount
     * @param repStaked The amount of REP staked
     * @return style The tier styling information
     */
    function _getTierStyle(uint256 repStaked) internal pure returns (TierStyle memory style) {
        if (repStaked >= 101) {
            // LEGENDARY - Ultra-rare, whale status
            style.tierName = "LEGENDARY";
            style.backgroundColor = "#1a0033"; // Deep purple
            style.borderColor = "#ff6b35"; // Bright orange
            style.textColor = "#ffd700"; // Gold
            style.accentColor = "#ff6b35"; // Orange accents
            style.prestigeIcon = "[CROWN]";
        } else if (repStaked >= 51) {
            // GOLD - Elite tier
            style.tierName = "GOLD";
            style.backgroundColor = "#2d1810"; // Dark brown
            style.borderColor = "#ffd700"; // Gold
            style.textColor = "#ffd700"; // Gold
            style.accentColor = "#ffed4e"; // Light gold accents
            style.prestigeIcon = "[STAR]";
        } else if (repStaked >= 11) {
            // SILVER - Established player
            style.tierName = "SILVER";
            style.backgroundColor = "#1f2937"; // Dark gray
            style.borderColor = "#c0c0c0"; // Silver
            style.textColor = "#e5e7eb"; // Light gray
            style.accentColor = "#f3f4f6"; // Light silver accents
            style.prestigeIcon = "[DIAMOND]";
        } else {
            // BRONZE - Aspiring player
            style.tierName = "BRONZE";
            style.backgroundColor = "#451a03"; // Dark brown
            style.borderColor = "#cd7c2f"; // Bronze
            style.textColor = "#fbbf24"; // Light bronze
            style.accentColor = "#f59e0b"; // Light bronze accents
            style.prestigeIcon = "[SHIELD]";
        }
    }

    /**
     * @dev Generate SVG image with dynamic prestige tiers
     * @param repStaked The amount of REP staked
     * @param mintedAt The mint timestamp
     * @param isListable Whether the NFT is listable
     * @return The base64-encoded SVG
     */
    function _generateSVG(uint256 repStaked, uint256 mintedAt, bool isListable) internal pure returns (string memory) {
        TierStyle memory style = _getTierStyle(repStaked);
        
        SVGParams memory params = SVGParams({
            repStaked: repStaked,
            mintedAt: mintedAt,
            isListable: isListable,
            style: style
        });
        
        return _buildSVG(params);
    }

    /**
     * @dev Build the complete SVG using the provided parameters
     * @param params The SVG generation parameters
     * @return The base64-encoded SVG
     */
    function _buildSVG(SVGParams memory params) internal pure returns (string memory) {
        string memory svgStart = _generateSVGDefs(params.style);
        string memory background = _generateBackground();
        string memory titleSection = _generateTitleSection(params.style);
        string memory repSection = _generateRepSection(params.repStaked, params.style);
        string memory detailsSection = _generateDetailsSection(params.mintedAt, params.isListable, params.style);
        string memory decorativeElements = _generateDecorativeElements(params.repStaked, params.style.accentColor);
        
        string memory svg = string(abi.encodePacked(
            svgStart,
            background,
            titleSection,
            repSection,
            detailsSection,
            decorativeElements,
            '</svg>'
        ));
        
        return _base64(bytes(svg));
    }

    /**
     * @dev Generate SVG definitions and gradients
     * @param style The tier styling information
     * @return The SVG definitions section
     */
    function _generateSVGDefs(TierStyle memory style) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
            '<defs>',
            '<linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:', style.backgroundColor, ';stop-opacity:1" />',
            '<stop offset="100%" style="stop-color:', style.borderColor, ';stop-opacity:0.3" />',
            '</linearGradient>',
            '<linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:', style.borderColor, ';stop-opacity:1" />',
            '<stop offset="100%" style="stop-color:', style.accentColor, ';stop-opacity:1" />',
            '</linearGradient>',
            '</defs>'
        ));
    }

    /**
     * @dev Generate background elements
     * @return The background SVG section
     */
    function _generateBackground() internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect width="100%" height="100%" fill="url(#bgGrad)"/>',
            '<rect x="10" y="10" width="380" height="380" rx="20" ry="20" fill="none" stroke="url(#borderGrad)" stroke-width="4"/>'
        ));
    }

    /**
     * @dev Generate title section with tier badge
     * @param style The tier styling information
     * @return The title SVG section
     */
    function _generateTitleSection(TierStyle memory style) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect x="30" y="30" width="340" height="80" rx="10" ry="10" fill="', style.borderColor, '" opacity="0.2"/>',
            '<text x="200" y="55" font-family="Arial,sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="', style.textColor, '">SONICITY YIELD NFT</text>',
            '<text x="200" y="85" font-family="Arial,sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="', style.accentColor, '">', style.tierName, ' ', style.prestigeIcon, '</text>'
        ));
    }

    /**
     * @dev Generate REP amount section
     * @param repStaked The amount of REP staked
     * @param style The tier styling information
     * @return The REP section SVG
     */
    function _generateRepSection(uint256 repStaked, TierStyle memory style) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect x="30" y="130" width="340" height="100" rx="10" ry="10" fill="', style.textColor, '" opacity="0.1"/>',
            '<text x="200" y="160" font-family="Arial,sans-serif" font-size="14" text-anchor="middle" fill="', style.textColor, '" opacity="0.8">REP STAKED</text>',
            '<text x="200" y="200" font-family="Arial,sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="', style.accentColor, '">', _toString(repStaked), '</text>'
        ));
    }

    /**
     * @dev Generate details section
     * @param mintedAt The mint timestamp
     * @param isListable Whether the NFT is listable
     * @param style The tier styling information
     * @return The details section SVG
     */
    function _generateDetailsSection(uint256 mintedAt, bool isListable, TierStyle memory style) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect x="30" y="250" width="340" height="120" rx="10" ry="10" fill="', style.backgroundColor, '" opacity="0.5"/>',
            '<text x="50" y="280" font-family="Arial,sans-serif" font-size="14" fill="', style.textColor, '">Minted: ', _formatTimestamp(mintedAt), '</text>',
            '<text x="50" y="305" font-family="Arial,sans-serif" font-size="14" fill="', style.textColor, '">Status: ', isListable ? "Tradeable" : "Locked", '</text>',
            '<text x="50" y="330" font-family="Arial,sans-serif" font-size="14" fill="', style.textColor, '">Tier: ', style.tierName, '</text>',
            '<text x="50" y="355" font-family="Arial,sans-serif" font-size="12" fill="', style.textColor, '" opacity="0.7">Prestige NFT | On-chain Metadata</text>'
        ));
    }

    /**
     * @dev Generate decorative elements based on tier
     * @param repStaked The amount of REP staked
     * @param accentColor The accent color for decorations
     * @return The decorative elements SVG
     */
    function _generateDecorativeElements(uint256 repStaked, string memory accentColor) internal pure returns (string memory) {
        if (repStaked >= 101) {
            // Legendary - Crown pattern
            return string(abi.encodePacked(
                '<polygon points="350,50 360,40 370,50 365,60" fill="', accentColor, '" opacity="0.6"/>',
                '<polygon points="350,350 360,360 370,350 365,340" fill="', accentColor, '" opacity="0.6"/>',
                '<polygon points="50,50 40,40 30,50 35,60" fill="', accentColor, '" opacity="0.6"/>',
                '<polygon points="50,350 40,360 30,350 35,340" fill="', accentColor, '" opacity="0.6"/>'
            ));
        } else if (repStaked >= 51) {
            // Gold - Star pattern
            return string(abi.encodePacked(
                '<circle cx="60" cy="60" r="8" fill="', accentColor, '" opacity="0.5"/>',
                '<circle cx="340" cy="60" r="8" fill="', accentColor, '" opacity="0.5"/>',
                '<circle cx="60" cy="340" r="8" fill="', accentColor, '" opacity="0.5"/>',
                '<circle cx="340" cy="340" r="8" fill="', accentColor, '" opacity="0.5"/>'
            ));
        } else if (repStaked >= 11) {
            // Silver - Diamond pattern
            return string(abi.encodePacked(
                '<rect x="55" y="55" width="10" height="10" rx="2" fill="', accentColor, '" opacity="0.4"/>',
                '<rect x="335" y="55" width="10" height="10" rx="2" fill="', accentColor, '" opacity="0.4"/>',
                '<rect x="55" y="335" width="10" height="10" rx="2" fill="', accentColor, '" opacity="0.4"/>',
                '<rect x="335" y="335" width="10" height="10" rx="2" fill="', accentColor, '" opacity="0.4"/>'
            ));
        } else {
            // Bronze - Shield pattern
            return string(abi.encodePacked(
                '<rect x="58" y="58" width="4" height="4" fill="', accentColor, '" opacity="0.3"/>',
                '<rect x="338" y="58" width="4" height="4" fill="', accentColor, '" opacity="0.3"/>',
                '<rect x="58" y="338" width="4" height="4" fill="', accentColor, '" opacity="0.3"/>',
                '<rect x="338" y="338" width="4" height="4" fill="', accentColor, '" opacity="0.3"/>'
            ));
        }
    }

    /**
     * @dev Format timestamp to readable date
     * @param timestamp The timestamp to format
     * @return Formatted date string
     */
    function _formatTimestamp(uint256 timestamp) internal pure returns (string memory) {
        // Simple formatting - could be enhanced
        return string(abi.encodePacked("Block ", _toString(timestamp)));
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
