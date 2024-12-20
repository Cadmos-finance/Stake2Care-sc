// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @dev Foundry tests do not support importing custom contract with names  starting with "Test" substring
contract StETH is ERC20, Ownable {
    uint256 public constant wad = 1e18;
    uint256 public accrualFactor; //Accrual factor to rebase token

    constructor() ERC20("Test STETH", "TSETH") {
        accrualFactor = wad;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view override returns (uint256) {
        return (super.balanceOf(account) * accrualFactor) / wad;
    }

    function changeAccrual(uint256 newAccrual) public onlyOwner {
        require(newAccrual != 0);
        accrualFactor = newAccrual;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount * wad / accrualFactor);
    }

    function submit(address) public payable returns (uint256 assetAmount) {
        _mint(msg.sender, msg.value * wad / accrualFactor);
        return msg.value * wad / accrualFactor;
    }

    function withdraw(address payable _to, uint256 amount) public onlyOwner returns (uint256) {
        _to.transfer(amount);
        return amount;
    }

    function _transfer(address from, address to, uint256 amount) internal override(ERC20) {
        amount = (amount * wad) / accrualFactor;
        super._transfer(from, to, amount);
    }

    receive() external payable {
        submit(address(0));
    }
}
