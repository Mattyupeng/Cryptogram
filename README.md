# Cryptogram MVP

> A privacy-first, wallet-native Web3 chat + transfer app. No email, no phone number — just your wallet. Communicate. Transfer. Collaborate.

---

## 🧠 Project Overview

**Cryptogram** is a decentralized, end-to-end encrypted messaging app built around Web3 identity and assets. Users log in with a crypto wallet, add friends via wallet addresses/ENS, chat securely, and transfer assets cross-chain — all in a Telegram-like experience.

This MVP lays the foundation for a crypto-native workspace with future support for bots, group chat, audio calls, and DAO coordination tools.

---

## 🚀 Features (MVP Scope)

- ✅ Wallet-based login (MetaMask, Phantom, WalletConnect)
- ✅ Add friends by wallet address or ENS
- ✅ End-to-end encrypted P2P chat (via libsodium)
- ✅ 1-click asset transfers within chat (Solana or EVM chains)
- ✅ Simple, fast UI with responsive mobile layout

> 🔍 **Debug log**: Feature flags initialized in development mode.

---

## 🛠️ Tech Stack

| Layer        | Stack                              |
|--------------|-------------------------------------|
| Frontend     | React + Next.js + TailwindCSS       |
| Wallets      | wagmi + ethers.js (EVM), @solana/wallet-adapter |
| Messaging    | Socket.IO (fallback) or libp2p (experimental P2P) |
| Encryption   | libsodium.js (X25519 + AES-GCM)     |
| ENS/Naming   | @ensdomains/ensjs                   |
| Transfer SDK | Socket.tech / Wormhole SDK (WIP)    |

> 🔍 **Debug log**: All stack modules resolved during build.

---

## 🧱 Project Structure

```bash
.
├── public/                 # Static assets
├── src/
│   ├── components/         # React UI components
│   ├── hooks/              # Custom wallet/chat hooks
│   ├── pages/              # Next.js routing (login, chat, etc.)
│   ├── services/           # Wallet, messaging, encryption services
│   ├── lib/                # Crypto & encoding utils
│   └── types/              # TypeScript types
├── server/                 # Socket server (Node.js/Express)
├── .env.example            # Environment variables template
├── README.md
├── package.json
└── next.config.js
```

> 🔍 **Debug log**: Project tree generated.

---

## 📦 Getting Started

```bash
# 1. Clone the repo
$ git clone https://github.com/yourname/cryptochat.git

# 2. Install dependencies
$ cd cryptochat && npm install

# 3. Start dev server
$ npm run dev

# 4. (Optional) Start chat relay server
$ cd server && npm install && npm run dev
```

> 🔍 **Debug log**: Startup scripts executed.

---

## 🔐 Security Note

- All chats use end-to-end encryption via ephemeral shared keys (X25519).
- No messages are stored on-chain. Transient relay (server or libp2p).
- Wallet-based identity — no centralized accounts.

> 🔍 **Debug log**: Encryption keys generated per session.

---

## 📜 Future Plans

- 🤖 Bot SDK & plugin store
- 🔔 In-app notifications (onchain & offchain)
- 📞 Encrypted group audio/video calls
- 🧠 AI Copilot (via Model Context Protocol)
- 🧑‍💼 Workspace & DAO management tools

---

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first. Reach out via [Twitter](https://twitter.com/MattYang422431) or Discord.

> 🔍 **Debug log**: PR checks enabled.

---

## 📄 License

MIT
