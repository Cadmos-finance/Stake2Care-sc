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
// =================================  IERC4626ImpactVault  =======================================
// ===============================================================================================
//
// CADMOS: https://github.com/Cadmos-finance

// Primary Author(s)
// N.B.: https://github.com/nboueri
// J.A.T: https://github.com/jat9292 

import "./IImpactVault.sol";

/// @title Interface of the ImpactVault Contract
/// @author N.B.
/// @notice Used to donate gains stemming from a positively rebasing token
interface IERC4626ImpactVault is IImpactVault {

    error BadTokenWithdrawal();

    function recoverERC20(address token, uint256 amount) external;

    event RecoveredERC20(address indexed token, uint256 amount);
}
