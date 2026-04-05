import { Connection, Keypair, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

function getRelayer(): Keypair {
  const key = process.env.RELAY_SECRET_KEY;
  if (!key) throw new Error("RELAY_SECRET_KEY not set");
  return Keypair.fromSecretKey(bs58.decode(key));
}

export async function POST(request: Request) {
  try {
    const { transaction } = await request.json();
    if (!transaction) {
      return Response.json({ error: "Missing transaction" }, { status: 400 });
    }

    const relayer = getRelayer();
    const connection = new Connection(RPC, "confirmed");

    // Deserialize the partially-signed transaction (member has already signed)
    const tx = Transaction.from(Buffer.from(transaction, "base64"));

    // Relayer pays: set fee payer and sign
    tx.feePayer = relayer.publicKey;
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.partialSign(relayer);

    const raw = tx.serialize();
    const sig = await connection.sendRawTransaction(raw, {
      skipPreflight: false,
    });
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    return Response.json({ signature: sig });
  } catch (err: any) {
    console.error("relay-join error:", err);
    return Response.json(
      { error: err?.message ?? "Relay failed" },
      { status: 500 }
    );
  }
}
