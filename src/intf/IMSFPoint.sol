// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

//    █████████   ███████████     █████████   ███████████     ███████████    █████████   ██████   █████ █████   ████     █████████  █████   ███   █████ █████ ███████████ ███████████ ██████████ ███████████   █████         █████████   ██████   █████ ██████████  
//   ███░░░░░███ ░░███░░░░░███   ███░░░░░███ ░░███░░░░░███   ░░███░░░░░███  ███░░░░░███ ░░██████ ░░███ ░░███   ███░     ███░░░░░███░░███   ░███  ░░███ ░░███ ░█░░░███░░░█░█░░░░░░███ ░░███░░░░░█░░███░░░░░███ ░░███         ███░░░░░███ ░░██████ ░░███ ░░███░░░░███ 
//  ░███    ░███  ░███    ░███  ░███    ░███  ░███    ░███    ░███    ░███ ░███    ░███  ░███░███ ░███  ░███  ███      ░███    ░░░  ░███   ░███   ░███  ░███ ░   ░███  ░ ░     ███░   ░███  █ ░  ░███    ░███  ░███        ░███    ░███  ░███░███ ░███  ░███   ░░███
//  ░███████████  ░██████████   ░███████████  ░██████████     ░██████████  ░███████████  ░███░░███░███  ░███████       ░░█████████  ░███   ░███   ░███  ░███     ░███         ███     ░██████    ░██████████   ░███        ░███████████  ░███░░███░███  ░███    ░███
//  ░███░░░░░███  ░███░░░░░███  ░███░░░░░███  ░███░░░░░███    ░███░░░░░███ ░███░░░░░███  ░███ ░░██████  ░███░░███       ░░░░░░░░███ ░░███  █████  ███   ░███     ░███        ███      ░███░░█    ░███░░░░░███  ░███        ░███░░░░░███  ░███ ░░██████  ░███    ░███
//  ░███    ░███  ░███    ░███  ░███    ░███  ░███    ░███    ░███    ░███ ░███    ░███  ░███  ░░█████  ░███ ░░███      ███    ░███  ░░░█████░█████░    ░███     ░███      ████     █ ░███ ░   █ ░███    ░███  ░███      █ ░███    ░███  ░███  ░░█████  ░███    ███ 
//  █████   █████ █████   █████ █████   █████ ███████████     ███████████  █████   █████ █████  ░░█████ █████ ░░████   ░░█████████     ░░███ ░░███      █████    █████    ███████████ ██████████ █████   █████ ███████████ █████   █████ █████  ░░█████ ██████████  
// ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░░░░░░░     ░░░░░░░░░░░  ░░░░░   ░░░░░ ░░░░░    ░░░░░ ░░░░░   ░░░░     ░░░░░░░░░       ░░░   ░░░      ░░░░░    ░░░░░    ░░░░░░░░░░░ ░░░░░░░░░░ ░░░░░   ░░░░░ ░░░░░░░░░░░ ░░░░░   ░░░░░ ░░░░░    ░░░░░ ░░░░░░░░░░   
//
//
//    ,ad8888ba,         db         88888888ba,    88b           d88    ,ad8888ba,     ad88888ba
//   d8"'    `"8b       d88b        88      `"8b   888b         d888   d8"'    `"8b   d8"     "8b
//  d8'                d8'`8b       88        `8b  88`8b       d8'88  d8'        `8b  Y8,
//  88                d8'  `8b      88         88  88 `8b     d8' 88  88          88  `Y8aaaaa,
//  88               d8YaaaaY8b     88         88  88  `8b   d8'  88  88          88    `"""""8b,
//  Y8,             d8""""""""8b    88         8P  88   `8b d8'   88  Y8,        ,8P          `8b
//   Y8a.    .a8P  d8'        `8b   88      .a8P   88    `888'    88   Y8a.    .a8P   Y8a     a8P
//    `"Y8888Y"'  d8'          `8b  88888888Y"'    88     `8'     88    `"Y8888Y"'     "Y88888P"
//
// ===============================================================================================
// =======================================  IMSFPoint  ===========================================
// ===============================================================================================
// ARAB BANK SWITZZERLAND: https://github.com/ArabBankSwitzerland
// CADMOS: https://github.com/Cadmos-finance

// Primary Author(s)
// N.B.: https://github.com/nboueri
// J.A.T: https://github.com/jat9292 

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/// @title Interface of MSF Point
/// @author N.B.
interface IMSFPoint is IERC20 {


    /* ========== MUTATIVE FUNCTIONS ========== */

    function mint(address to, uint256 amount) external;

    function burn(uint256 value) external;

    function burnFrom(address account, uint256 value) external;


}
