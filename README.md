# NPC Backend - MultiversX Hackathon PoC

This AI backend provides conversation logic and merchant interactions for two NPCs:

1. **Vendy** – A glitchy vending machine that doesn’t realize it’s glitchy.  
2. **Labrat** – A snarky, strictly transactional rat that lives inside lab walls.

Both NPCs use the Gaupa SDK for authentication and item transfers, and interact with the user to buy or sell items. The backend supports conversation history storage and function calling via OpenAI’s Chat Completion API.

---

## Features

- **NPC-Specific Conversations**  
  - **Vendy (npc_vendy):**  
    - Glitchy vending machine with a friendly, robotic tone.  
    - May offer discounts up to 20% if complimented.  
    - Sells items from `vendingInventory`.  
    - Knows that its customer is a mushroom, not a human.
  - **Labrat (npc_labrat):**  
    - A rat that lives inside lab walls; smart, snarky, and purely transactional.  
    - Never offers discounts.  
    - Sells items from `labratInventory`.  
    - Knows that its customer is a mushroom, not a human.

- **Function Calls**  
  - `purchaseItem` – Finalizes an item sale and triggers token transfers via the Gaupa SDK.  
  - `checkInventory` – Queries the current NFT balance for each item and returns an object mapping item IDs to balances. If an item is out-of-stock, its balance will be `null`.

- **Conversation Context**  
  - Maintains conversation state in a database (or in-memory store).  
  - Optionally resets the conversation after a successful purchase.

- **Integration with Gaupa SDK**  
  - Authenticates users via `auth.login()` and retrieves user data via `auth.fetchUserData()`.  
  - Uses `manage.*` methods for transfer operations.

---

## Requirements

- **Node.js** or [Bun](https://bun.sh)
- **OpenAI API Key** for Chat Completion calls
- **Gaupa SDK** with valid configuration
- **Database** (optional, if conversation history is stored in SQL/NoSQL)

---
