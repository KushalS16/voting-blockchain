let web3;
let contract;

const contractAddress = "0xF2D07cE7b2f5Ae4E23a343B4F5F402A519160b52"; // Replace with your contract address
const contractABI = [
  {
    "inputs": [
      { "internalType": "string[]", "name": "_candidateNames", "type": "string[]" },
      { "internalType": "address[]", "name": "_admins", "type": "address[]" },
      { "internalType": "uint256", "name": "_requiredSignatures", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "internalType": "enum Voting.Phase", "name": "newPhase", "type": "uint8" }],
    "name": "PhaseChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "address", "name": "voter", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "candidate", "type": "uint256" }
    ],
    "name": "VoteCasted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "internalType": "address", "name": "voter", "type": "address" }],
    "name": "VoterRegistered",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getCandidatesCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }],
    "name": "getCandidate",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "uint256", "name": "voteCount", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWinner",
    "outputs": [{ "internalType": "string", "name": "winnerName", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPhase",
    "outputs": [{ "internalType": "enum Voting.Phase", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_voter", "type": "address" }],
    "name": "isRegistered",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_voter", "type": "address" }],
    "name": "hasVoted",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_voter", "type": "address" },
      { "internalType": "bytes[]", "name": "signatures", "type": "bytes[]" }
    ],
    "name": "registerVoter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "enum Voting.Phase", "name": "_phase", "type": "uint8" },
      { "internalType": "bytes[]", "name": "signatures", "type": "bytes[]" }
    ],
    "name": "changePhase",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_candidateIndex", "type": "uint256" }],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

window.addEventListener("load", async () => {
  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      connectWallet();
    } catch (error) {
      console.error("MetaMask connection error:", error);
    }
  } else {
    alert("Please install MetaMask to use this application.");
  }
});

async function connectWallet() {
  web3 = new Web3(window.ethereum);
  const accounts = await web3.eth.getAccounts();
  document.getElementById("walletAddress").innerText = `Connected: ${accounts[0]}`;
  contract = new web3.eth.Contract(contractABI, contractAddress);
  console.log("✅ Contract connected:", contract.options.address);
  loadCandidates();
}

// 🔘 Manual connect button
document.getElementById('connectWalletBtn').addEventListener('click', async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      document.getElementById('walletAddress').textContent = `Connected: ${accounts[0]}`;
      connectWallet();
    } catch (err) {
      console.error('User rejected connection:', err);
      document.getElementById('walletAddress').textContent = 'Connection rejected';
    }
  } else {
    alert('MetaMask not found. Please install MetaMask extension!');
  }
});

// ✅ Register Voter (multi-signature)
document.getElementById("registerBtn").addEventListener("click", async () => {
  if (!contract || !web3) {
    alert("Connect MetaMask first.");
    return;
  }

  const voterAddress = document.getElementById("voterAddress").value;
  const accounts = await web3.eth.getAccounts();

  if (!web3.utils.isAddress(voterAddress)) {
    alert("Invalid Ethereum address.");
    return;
  }

  const msgHash = web3.utils.soliditySha3("registerVoter", voterAddress);

  const sig1 = "0xYourRealSignature1"; // Replace with actual admin signatures
  const sig2 = "0xYourRealSignature2";
  const signatures = [sig1, sig2];

  try {
    console.log("📤 Sending registration transaction...");
    await contract.methods.registerVoter(voterAddress, signatures).send({ from: accounts[0] });
    document.getElementById("registerStatus").innerText = "✅ Voter registered successfully!";
  } catch (err) {
    console.error("❌ Registration error:", err);
    document.getElementById("registerStatus").innerText = "❌ Registration failed.";
  }
});

// 📥 Load Candidates
async function loadCandidates() {
  if (!contract) return;
  const select = document.getElementById("candidateSelect");
  select.innerHTML = "";

  try {
    const count = await contract.methods.getCandidatesCount().call();
    for (let i = 0; i < count; i++) {
      const candidate = await contract.methods.getCandidate(i).call();
      console.log(`Candidate ${i}:`, candidate.name);
      const option = document.createElement("option");
      option.value = i;
      option.innerText = candidate.name;
      select.appendChild(option);
    }
  } catch (err) {
    console.error("❌ Error loading candidates:", err);
  }
}

// 🗳️ Vote
document.getElementById("voteBtn").addEventListener("click", async () => {
  const index = document.getElementById("candidateSelect").value;
  const accounts = await web3.eth.getAccounts();

  try {
    await contract.methods.vote(index).send({ from: accounts[0] });
    document.getElementById("voteStatus").innerText = "✅ Vote cast successfully!";
  } catch (err) {
    console.error("❌ Voting error:", err);
    document.getElementById("voteStatus").innerText = "❌ Voting failed.";
  }
});

// 📊 Show Results
document.getElementById("resultBtn").addEventListener("click", async () => {
  const resultList = document.getElementById("resultList");
  resultList.innerHTML = "";

  try {
    const count = await contract.methods.getCandidatesCount().call();
    for (let i = 0; i < count; i++) {
      const candidate = await contract.methods.getCandidate(i).call();
      const li = document.createElement("li");
      li.innerText = `${candidate.name}: ${candidate.voteCount} votes`;
      resultList.appendChild(li);
    }
  } catch (err) {
    console.error("❌ Error loading results:", err);
  }
});

// 🔄 Admin: Change Voting Phase
document.getElementById("changePhaseBtn").addEventListener("click", async () => {
  const newPhase = parseInt(document.getElementById("phaseSelect").value);
  const accounts = await web3.eth.getAccounts();

  const msgHash = web3.utils.soliditySha3("changePhase", newPhase);
  const sig1 = "0xYourPhaseSig1"; // Replace with valid admin signatures
  const sig2 = "0xYourPhaseSig2";
  const signatures = [sig1, sig2];

  try {
    await contract.methods.changePhase(newPhase, signatures).send({ from: accounts[0] });
    document.getElementById("phaseStatus").innerText = "✅ Phase changed successfully!";
  } catch (err) {
    console.error("❌ Phase change error:", err);
    document.getElementById("phaseStatus").innerText = "❌ Failed to change phase.";
  }
});

