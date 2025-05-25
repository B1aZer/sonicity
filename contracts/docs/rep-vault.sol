contract YieldVault {
    IERC20 public sonicToken;
    SonicityYieldNFT public nft;

    uint256 public totalStakedREP;
    mapping(uint256 => uint256) public claimed;
    mapping(uint256 => bool) public isEligible;

    uint256 public totalRewards;
    uint256 public lastDistribution;

    constructor(address _token, address _nft) {
        sonicToken = IERC20(_token);
        nft = SonicityYieldNFT(_nft);
    }

    function depositRewards(uint256 amount) external {
        sonicToken.transferFrom(msg.sender, address(this), amount);
        totalRewards += amount;
        lastDistribution = block.timestamp;
    }

    function claim(uint256 tokenId) external {
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        (, uint256 repStaked,) = nft.stakeInfo(tokenId);

        uint256 share = (repStaked * totalRewards) / nft.totalStakedREP();
        uint256 toClaim = share - claimed[tokenId];

        claimed[tokenId] += toClaim;
        sonicToken.transfer(msg.sender, toClaim);
    }
}
