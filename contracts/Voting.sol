// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Voting {
    // Define a list of admin addresses for multi-signature protection.
    address[] public admins;
    uint public requiredSignatures;

    // Voting phases.
    enum Phase { Registration, Voting, Ended }
    Phase public currentPhase;

    // Structures for candidate and voter.
    struct Candidate {
        string name;
        uint voteCount;
    }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        address delegate;
        uint vote;
    }

    Candidate[] public candidates;
    mapping(address => Voter) public voters;

    // Events to help track actions.
    event VoterRegistered(address voter);
    event VoteCasted(address voter, uint candidate);
    event PhaseChanged(Phase newPhase);

    // --- Constructor ---
    // Now you pass candidate names, an array of admin addresses, and how many signatures you require.
    constructor(
        string[] memory _candidateNames, 
        address[] memory _admins, 
        uint _requiredSignatures
    ) {
        // Check that the number of admins is at least the required signatures.
        require(_admins.length >= _requiredSignatures, "Not enough admins for required signatures");
        admins = _admins;
        requiredSignatures = _requiredSignatures;
        currentPhase = Phase.Registration;

        // Add candidates.
        for (uint i = 0; i < _candidateNames.length; i++) {
            candidates.push(Candidate({name: _candidateNames[i], voteCount: 0}));
        }
    }

    // --- Multi-signature verification mechanism ---
    // This modifier verifies that the provided signatures meet the required count.
    modifier multiSigCheck(bytes32 _dataHash, bytes[] memory signatures) {
        require(_verifyMultiSig(_dataHash, signatures), "Multi-signature verification failed");
        _;
    }

    // Loop through each signature and verify if it came from an admin.
    function _verifyMultiSig(bytes32 _dataHash, bytes[] memory signatures) internal view returns (bool) {
        uint validSigCount = 0;
        address[] memory seen = new address[](signatures.length);

        for (uint i = 0; i < signatures.length; i++) {
            address signer = recoverSigner(_dataHash, signatures[i]);
            if (isAdmin(signer)) {
                // Check against duplicates.
                bool duplicate = false;
                for (uint j = 0; j < i; j++) {
                    if (seen[j] == signer) {
                        duplicate = true;
                        break;
                    }
                }
                if (!duplicate) {
                    seen[validSigCount] = signer;
                    validSigCount++;
                }
            }
        }
        return (validSigCount >= requiredSignatures);
    }

    // Recover signer address from a given signature.
    function recoverSigner(bytes32 message, bytes memory sig) public pure returns (address) {
        require(sig.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        // Use assembly to extract r, s, and v from the signature.
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        return ecrecover(prefixed(message), v, r, s);
    }

    // Prefix the hash as used in the personal_sign method.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    // Check if an address is in the list of admin addresses.
    function isAdmin(address _addr) public view returns (bool) {
        for (uint i = 0; i < admins.length; i++) {
            if (admins[i] == _addr) {
                return true;
            }
        }
        return false;
    }

    // --- Functions protected by multi-signature ---

    // Voter registration now requires multi-signature verification.
    // When calling, pass a bytes[] array of signatures (from admin accounts) for the message:
    // keccak256(abi.encodePacked("registerVoter", _voter))
    function registerVoter(address _voter, bytes[] memory signatures)
        public
        multiSigCheck(keccak256(abi.encodePacked("registerVoter", _voter)), signatures)
    {
        require(!voters[_voter].isRegistered, "Voter already registered.");
        voters[_voter].isRegistered = true;
        emit VoterRegistered(_voter);
    }

    // Change the phase with multi-signature verification.
    // The message should be: keccak256(abi.encodePacked("changePhase", _phase))
    function changePhase(Phase _phase, bytes[] memory signatures)
        public
        multiSigCheck(keccak256(abi.encodePacked("changePhase", _phase)), signatures)
    {
        require(uint(_phase) > uint(currentPhase), "Can only move to next phase");
        currentPhase = _phase;
        emit PhaseChanged(_phase);
    }

    // --- Voting function ---
    function vote(uint _candidateIndex) public {
        // Check that the current phase is Voting.
        require(currentPhase == Phase.Voting, "Voting phase is not active");
        Voter storage sender = voters[msg.sender];
        require(sender.isRegistered, "Not registered to vote.");
        require(!sender.hasVoted, "Already voted.");
        require(_candidateIndex < candidates.length, "Invalid candidate.");

        sender.hasVoted = true;
        sender.vote = _candidateIndex;
        candidates[_candidateIndex].voteCount += 1;
        emit VoteCasted(msg.sender, _candidateIndex);
    }

    // --- Getter functions ---
    function getCandidatesCount() public view returns (uint) {
        return candidates.length;
    }

    function getCandidate(uint index) public view returns (string memory name, uint voteCount) {
        require(index < candidates.length, "Invalid candidate index");
        Candidate storage candidate = candidates[index];
        return (candidate.name, candidate.voteCount);
    }

    function getWinner() public view returns (string memory winnerName) {
        require(currentPhase == Phase.Ended, "Voting has not ended");
        uint maxVotes = 0;
        uint winnerIndex = 0;
        for (uint i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerIndex = i;
            }
        }
        winnerName = candidates[winnerIndex].name;
    }

    function getPhase() public view returns (Phase) {
        return currentPhase;
    }

    function isRegistered(address _voter) public view returns (bool) {
        return voters[_voter].isRegistered;
    }

    function hasVoted(address _voter) public view returns (bool) {
        return voters[_voter].hasVoted;
    }

    // --- Additional Functionality for Token-based Voting ---
    // Add a token balance to each voter.
    mapping(address => uint) public voterTokens;

    // A function to distribute tokens for voting.
    function distributeTokens(address[] memory _voters, uint[] memory _tokens) public onlyAdmin {
        require(_voters.length == _tokens.length, "Voters and tokens arrays must have the same length.");
        for (uint i = 0; i < _voters.length; i++) {
            voterTokens[_voters[i]] += _tokens[i];
        }
    }

    // Check the number of tokens a voter has.
    function getVoterTokens(address _voter) public view returns (uint) {
        return voterTokens[_voter];
    }

    // Modifier to restrict access to admin only.
    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "You must be an admin.");
        _;
    }
}
