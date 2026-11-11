// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
import "forge-std/Test.sol";
interface IUR { function execute(bytes calldata, bytes[] calldata, uint256) external payable; }
interface IERC20 { function balanceOf(address) external view returns (uint256); }
contract URProbeTest is Test {
    address constant UR = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    function setUp() public { vm.createSelectFork(vm.envString("RPC_URL"), 111155803); vm.deal(address(this), 1 ether); }
    function _go(bytes memory cmd, bytes memory leg) internal {
        bytes[] memory i = new bytes[](2);
        i[0] = abi.encode(address(2), uint256(0.001 ether)); i[1] = leg;
        IUR(UR).execute{value: 0.001 ether}(cmd, i, block.timestamp);
        assertGt(IERC20(PONS).balanceOf(address(this)), 0);
    }
    function test_v3_explicit_withHopArray() public { _go(hex"0b00", abi.encode(address(this), uint256(0.001 ether), uint256(1), abi.encodePacked(WETH, uint24(3000), PONS), false, new uint256[](0))); }
    function test_v2_cb_withHopArray() public { address[] memory p = new address[](2); p[0]=WETH; p[1]=PONS; _go(hex"0b08", abi.encode(address(this), uint256(1<<255), uint256(1), p, false, new uint256[](0))); }
    function test_v2_explicit_withHopArray() public { address[] memory p = new address[](2); p[0]=WETH; p[1]=PONS; _go(hex"0b08", abi.encode(address(this), uint256(0.001 ether), uint256(1), p, false, new uint256[](0))); }
}
