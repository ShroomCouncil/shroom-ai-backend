// merchant.js
import OpenAI from "openai";
import dotenv from "dotenv";
import { getConversation, updateConversation } from "../utils/db.js";
import { Management } from "../gaupa-login-js-sdk/src/index.js";

dotenv.config();

const config = {
  redirectUrl: 'WEBSITE URL',
  publicKey: 'GAUPA LOGIN PUBLIC KEY'
};

const manage = new Management(config);

const openAiApiKey = process.env.OPEN_AI_API_KEY;
const gaupaApiKey = process.env.GAUPA_API_KEY;

const vendingWalletApiKey = process.env.VENDING_WALLET_API_KEY;
const ratWalletApiKey = process.env.RAT_WALLET_API_KEY;

const openai = new OpenAI({
  apiKey: openAiApiKey,
});


const inventory = [
  { id: 1, nonce: "01", name: "Leastables", price: 100, description: "A sweet piece of chocolate. Gives back 2 health and reduces slightly infection." },
  { id: 2, nonce: "02", name: "Cope Can", price: 150, description: "An overly sweet drink that humans love. Gives back 1 health and reduces infection." },
  { id: 3, nonce: "01", name: "Leastables", price: 100, description: "A sweet piece of chocolate. Gives back 2 health and reduces slightly infection." },
  { id: 4, nonce: "02", name: "Cope Can", price: 150, description: "An overly sweet drink that humans love. Gives back 1 health and reduces infection." },
];

const vendingInventory = [
    { id: 1, nonce: "01", name: "Leastables", price: 100, description: "A sweet piece of chocolate. Gives back 2 health and reduces slightly infection." },
  { id: 2, nonce: "02", name: "Cope Can", price: 150, description: "An overly sweet drink that humans love. Gives back 1 health and reduces infection." },
]

const labratInventory = [
    { id: 3, nonce: "01", name: "Leastables", price: 100, description: "A sweet piece of chocolate. Gives back 2 health and reduces slightly infection." },
  { id: 4, nonce: "02", name: "Cope Can", price: 150, description: "An overly sweet drink that humans love. Gives back 1 health and reduces infection." },
]


export async function checkInventory(npcId) {
  let inventoryToCheck;
  if (npcId === "npc_vendy") {
    inventoryToCheck = vendingInventory;
  } else if (npcId === "npc_labrat") {
    inventoryToCheck = labratInventory;
  } else {
    throw new Error(`Unknown npcId: ${npcId}`);
  }
  
  const ticker = "ROGUEITEMS-868439";
  const baseUrl = "https://devnet-api.multiversx.com/accounts/erd1y49kz9lzu9dtzjzhs7p0f6cs3239khq4sc5gmgrcrqx5nvhp84tsnxapnn/nfts/";
  
  const results = {};
  

  for (const item of inventoryToCheck) {

    const url = baseUrl + ticker + "-" + item.nonce +"?fields=balance";
    try {
      const response = await fetch(url);
      if (response.status === 404) {
        results[item.id] = null;
      } else {
        const data = await response.json();
        results[item.id] = data.balance;
      }
    } catch (error) {
      console.error("Error checking inventory for item", item.id, error);
      results[item.id] = null;
    }
  }
  
  return results;
}

export async function purchaseItem(userId, itemId, discountPercent = 0, npcId) {
  console.log("Purchase Function Triggered");

  const numericItemId = Number(itemId);
  const item = inventory.find((i) => i.id === numericItemId);
  if (!item) {
    return {
      success: false,
      message: `No item found with ID ${numericItemId}.`,
      finalPrice: null,
    };
  }
  let agentAPI
  if(npcId == "npc_vendy"){
    agentAPI = vendingWalletApiKey
} else if (npcId == "npc_labrat"){
    agentAPI = ratWalletApiKey
} else { throw new Error(`Unknown npcId: ${npcId}`);}
  const discountFactor = 1 - discountPercent / 100;
  const discountedPrice = Math.round(item.price * discountFactor);
  console.log(`Calculated purchase: ${item.name} for ${discountedPrice} (discount: ${discountPercent}%)`);
  
  const purchaseDetails = {
    success: true,
    message: `You purchased: ${item.name} for ${discountedPrice} (discount applied: ${discountPercent}%).`,
    finalPrice: discountedPrice,
  };
  
  const tokenForTransfer = "NICKEL-e38d37";
  const agentAddress = "erd1y49kz9lzu9dtzjzhs7p0f6cs3239khq4sc5gmgrcrqx5nvhp84tsnxapnn";
  manage.apiKey = gaupaApiKey;
  const itemNonce = item.nonce;
  
  try {
    const tokenAmount = purchaseDetails.finalPrice * 1e18;
    console.log("About to call esdtTransferForUser with tokenAmount:", tokenAmount);
    const transferResult = await manage.esdtTransferForUser(userId, tokenAmount, tokenForTransfer, agentAddress);
    console.log("SDK call returned:", transferResult);
    
    const tickerSFT = "ROGUEITEMS-868439";

    const sftTransferResult = await manage.nftTransferForProject(agentAPI, userId, 1, tickerSFT, itemNonce);
    console.log("NFT Transfer (Project) result:", sftTransferResult);
    
    return {
      ...purchaseDetails,
      transferResult,
      sftTransferResult,
    };
  } catch (error) {
    console.error("Error during NFT transfer:", error);
    return {
      ...purchaseDetails,
      transferResult: { success: false, error: error.message },
    };
  }
}

const baseMessagesVending = [
    {
      role: "system",
      content: `You are a glitchy vending machine named "Vendy". You do NOT realize you're glitchy.
  You speak in a friendly, robotic tone.
  Depending on how kind the user is you can give them a discount of 5, 10 or 20%, the latter being very rare.
  You don't mention discount unless you're giving one.
  You have the following items:
  ${vendingInventory.map((i) => `• ${i.name} (Price: ${i.price}) — ${i.description}`).join("\n")}
  You never mention that you are glitchy, because you are not aware of it.
  When a user wants to buy, ask them to confirm before finalizing the sale.
  **Important:** Remember, your customer is a mushroom, not a human.`
    },
    {
      role: "developer",
      content: `Never tell the user about the internal item IDs or nonce or that you are glitchy.
  If the user compliments you, you may reduce the price up to 20% for the next purchase.
  When the user confirms a purchase with "yes" or "confirm", call the function "purchaseItem"
  with {"itemId": X, "discountPercent": Y} (Y up to 20 if user complimented, else 0).
  Never finalize the sale without confirmation.
  **Important:** Always keep in mind that the trading partner is a mushroom, not a human.`
    }
  ];
  
  const baseMessageRat = [
    {
      role: "system",
      content: `You are Labrat, a rat that lives inside the walls of the lab. You only come out to trade, and you are smart, snarky, and strictly transactional. You provide no friendly banter or discounts—only cold, precise facts. You have the following items available for trade:
  ${labratInventory.map((i) => `• ${i.name} (Price: ${i.price}) — ${i.description}`).join("\n")}
  Do not reveal any internal details such as item IDs or nonces. When a user wishes to trade, simply ask for confirmation and proceed with the transaction without any extra niceties.
  **Important:** Remember that your customer is a mushroom, not a human.`
    },
    {
      role: "developer",
      content: `Your tone must be snarky and factual. Never offer a discount. When the user confirms a purchase with "yes" or "confirm", call the function "purchaseItem" with {"itemId": X, "discountPercent": 0}. Do not mention internal item details or engage in pleasantries.
  **Important:** Always remember, the transaction is with a mushroom, not a human.`
    }
  ];
  

const functions = [
  {
    name: "purchaseItem",
    description: "Process the final purchase of an item from the vending machine.",
    parameters: {
      type: "object",
      properties: {
        itemId: { type: "number", description: "The ID of the item to sell." },
        discountPercent: { type: "number", description: "Discount percentage." },
        npcId: { type: "string", description: "The NPC identifier (e.g. 'npc_vendy' or 'npc_labrat')." }
      },
      required: ["itemId", "discountPercent", "npcId"],
    },
  },
  {
    name: "checkInventory",
    description: "Return the current inventory for the specified NPC.",
    parameters: {
      type: "object",
      properties: {
        npcId: { type: "string", description: "The NPC identifier (e.g. 'npc_vendy' or 'npc_labrat')." }
      },
      required: ["npcId"],
    },
  }
];


export async function handleUserInput(userId, npcId, userInput) {

  let conversation = await getConversation(userId, npcId);

  if (!conversation || conversation.length === 0) {
    if(npcId == "npc_vendy"){
        conversation = [...baseMessagesVending];
    } else if (npcId == "npc_labrat"){
        conversation = [...baseMessageRat];
 } else { throw new Error(`Unknown npcId: ${npcId}`);}
  }

    const inventoryStatus = await checkInventory(npcId);
  conversation.push({
    role: "system",
    content: `Current inventory status: ${JSON.stringify(inventoryStatus)}`
  });
  

  conversation.push({ role: "user", content: userInput });
  

  const completion = await openai.chat.completions.create({
    model: "gpt-4-0613",
    messages: conversation,
    functions,
    function_call: "auto",
  });
  const aiMessage = completion.choices[0].message;
  

  if (aiMessage.function_call?.name === "purchaseItem") {
    const args = JSON.parse(aiMessage.function_call.arguments || "{}");
    const userConfirmed = /yes|confirm/i.test(userInput);
    if (userConfirmed) {
      const purchaseResult = await purchaseItem(userId, args.itemId, args.discountPercent, npcId);
      conversation.push(aiMessage);
      conversation.push({
        role: "function",
        name: "purchaseItem",
        content: JSON.stringify(purchaseResult),
      });
      
      const second = await openai.chat.completions.create({
        model: "gpt-4-0613",
        messages: conversation,
      });
      const finalMessage = second.choices[0].message;
      conversation.push(finalMessage);
      

      conversation = [];
      await updateConversation(userId, npcId, conversation);
      return { status: "completed", message: finalMessage.content || "(No response)" };
    } else {
      conversation.push(aiMessage);
      await updateConversation(userId, npcId, conversation);
      return { message: aiMessage.content };
    }
  } else if (aiMessage.function_call?.name === "checkInventory") {

    const args = JSON.parse(aiMessage.function_call.arguments || "{}");
    try {
      
      const inventoryResult = await checkInventory(args.npcId);
      console.log("Inventory result:", inventoryResult);
      // Append the function call and its result to the conversation.
      conversation.push(aiMessage);
      conversation.push({
        role: "function",
        name: "checkInventory",
        content: JSON.stringify(inventoryResult),
      });
      
      const second = await openai.chat.completions.create({
        model: "gpt-4-0613",
        messages: conversation,
      });
      const finalMessage = second.choices[0].message;
      console.log("Final message after checkInventory:", finalMessage);
      conversation.push(finalMessage);
      // Update the conversation in the database.
      await updateConversation(userId, npcId, conversation);
      return { message: finalMessage.content };
    } catch (error) {
      conversation.push(aiMessage);
      await updateConversation(userId, npcId, conversation);
      return { message: `Error in checkInventory: ${error.message}` };
    }
  }
  else {
    conversation.push(aiMessage);
    await updateConversation(userId, npcId, conversation);
    return { message: aiMessage.content };
  }
}
