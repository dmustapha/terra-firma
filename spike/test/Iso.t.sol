// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
import "forge-std/Test.sol";
interface IUR { function execute(bytes calldata, bytes[] calldata, uint256) external payable; }
interface IERC20 { function balanceOf(address) external view returns (uint256); }
contract IsoTest is Test {
    address constant UR = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    function setUp() public { vm.createSelectFork(vm.envString("RPC"), 111155803); vm.deal(address(this), 1 ether); }
    function _run(address out, uint24 fee, uint256 amt) internal {
        bytes[] memory i = new bytes[](2);
        i[0] = abi.encode(address(2), uint256(0.001 ether));
        i[1] = abi.encode(address(this), amt, uint256(1), abi.encodePacked(WETH, fee, out), false);
        IUR(UR).execute{value: 0.001 ether}(hex"0b00", i, block.timestamp);
        emit log_named_uint("out", IERC20(out).balanceOf(address(this)));
    }
    function test_A_pons_cb() public { _run(PONS, 3000, 1 << 255); }
    function test_B_nvda_explicit() public { _run(NVDA, 500, 0.001 ether); }
    function test_C_pons_explicit() public { _run(PONS, 3000, 0.001 ether); }
    function test_D_pons_1pct() public { _run(PONS, 10000, 1 << 255); }
}
