// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;



// ███████╗████████╗ █████╗ ██╗  ██╗███████╗██████╗  ██████╗ █████╗ ██████╗ ███████╗
// ██╔════╝╚══██╔══╝██╔══██╗██║ ██╔╝██╔════╝╚════██╗██╔════╝██╔══██╗██╔══██╗██╔════╝
// ███████╗   ██║   ███████║█████╔╝ █████╗   █████╔╝██║     ███████║██████╔╝█████╗  
// ╚════██║   ██║   ██╔══██║██╔═██╗ ██╔══╝  ██╔═══╝ ██║     ██╔══██║██╔══██╗██╔══╝  
// ███████║   ██║   ██║  ██║██║  ██╗███████╗███████╗╚██████╗██║  ██║██║  ██║███████╗
// ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
//                                                                                 
// ===============================================================================================
// ==================================  MetaMorphoImpactVault  ====================================
// ===============================================================================================

// CADMOS: https://github.com/Cadmos-finance

// Primary Author(s)
// N.B.: https://github.com/nboueri
// J.A.T: https://github.com/jat9292 

//Openzeppelin Contracts v4.9.6

import "./ERC4626ImpactVault.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IMerklDistributor {
    /// @notice Toggles an operator's authorization to claim rewards on behalf of a user
    /// @param user User granting or revoking the authorization
    /// @param operator Operator address being authorized or deauthorized
    /// @dev When operator is address(0), it enables any address to claim for the user
    /// @dev Only the user themselves or governance can toggle operator status
    function toggleOperator(address user, address operator) external;
}

contract MetaMorphoImpactVault is ERC4626ImpactVault {
    IMerklDistributor public immutable MERKL_DISTRIBUTOR;

    event MerklOperatorToggled(address indexed operator);

    error ZeroMerklDistributor();

    constructor(
        IERC4626 underlyingVault_,
        string memory name_,
        string memory symbol_,
        uint256 minDeposit_,
        IMerklDistributor merklDistributor_
    ) ERC4626ImpactVault(underlyingVault_, name_, symbol_, minDeposit_) {
        if (address(merklDistributor_) == address(0)) revert ZeroMerklDistributor();
        MERKL_DISTRIBUTOR = merklDistributor_;
        IMerklDistributor(merklDistributor_).toggleOperator(address(this), msg.sender);// Authorize deployer as Merkl operator by default
    }

    /// @notice Owner-gated helper to authorize (or deauthorize) an operator on Merkl for THIS vault.
    /// @dev Merkl checks that msg.sender is the `user` (or governance). Here msg.sender at Merkl side
    ///      will be `address(this)` (the vault), so we must pass user = address(this).
    /// @param operator Operator to toggle. (Avoid operator=address(0) unless you *intentionally* want open claiming.)
    function toggleMerklOperator(address operator) external onlyOwner {
        MERKL_DISTRIBUTOR.toggleOperator(address(this), operator);
        emit MerklOperatorToggled(operator);
    }
}