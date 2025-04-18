const Voting = artifacts.require("Voting");

module.exports = function(deployer) {
  // Provide candidate names, admin addresses, and required signatures
  const candidateNames = ["Alice", "Bob", "Charlie"];
  const adminAddresses = [
    "0xfA0A9a8784109E847386e0EC15AEE1E7f31e78ae", // Admin 1
    "0xc2d77ed17A508892A4f5ae803935d3432fDf68c2", // Admin 2 
    "0x55DC00D1B1a0E94606b64d5eF2137a8cd538dc17"  // Admin 3 
  ];
  const requiredSignatures = 2; // Minimum required signatures for actions

  // Deploy the contract
  deployer.deploy(Voting, candidateNames, adminAddresses, requiredSignatures);
};
