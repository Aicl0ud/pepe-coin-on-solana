import { initializeKeypair } from "./initializeKeypair"
import * as web3 from "@solana/web3.js"
import * as token from "@solana/spl-token"
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
  findMetadataPda,
} from "@metaplex-foundation/js"
import {
  DataV2,
  createCreateMetadataAccountV2Instruction,
  createUpdateMetadataAccountV2Instruction,
} from "@metaplex-foundation/mpl-token-metadata"
import * as fs from "fs"
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token"

async function createTokenMetadata(
  connection: web3.Connection,
  metaplex: Metaplex,
  mint: web3.PublicKey,
  user: web3.Keypair,
  name: string,
  symbol: string,
  description: string
) {
  // file to buffer
  const buffer = fs.readFileSync("assets/pepe.png")

  // buffer to metaplex file
  const file = toMetaplexFile(buffer, "pepe.png")

  // upload image and get image uri
  const imageUri = await metaplex.storage().upload(file)
  console.log("image uri:", imageUri)

  // upload metadata and get metadata uri (off chain metadata)
  const { uri } = await metaplex
    .nfts()
    .uploadMetadata({
      name: name,
      description: description,
      image: imageUri,
    })

  console.log("metadata uri:", uri)

  // get metadata account address
  const metadataPDA = await findMetadataPda(mint)

  // onchain metadata format
  const tokenMetadata = {
    name: name,
    symbol: symbol,
    uri: uri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  } as DataV2

  // transaction to create metadata account
  const transaction = new web3.Transaction().add(
    createCreateMetadataAccountV2Instruction(
      {
        metadata: metadataPDA,
        mint: mint,
        mintAuthority: user.publicKey,
        payer: user.publicKey,
        updateAuthority: user.publicKey,
      },
      {
        createMetadataAccountArgsV2: {
          data: tokenMetadata,
          isMutable: true,
        },
      }
    )
  )

  // send transaction
  const transactionSignature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [user]
  )

  console.log(
    `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

async function updateTokenMetadata(
  connection: web3.Connection,
  metaplex: Metaplex,
  mint: web3.PublicKey,
  user: web3.Keypair,
  name: string,
  symbol: string,
  description: string
) {
  // file to buffer
  const buffer = fs.readFileSync("assets/pepe.png")

  // buffer to metaplex file
  const file = toMetaplexFile(buffer, "pepe.png")

  // upload image and get image uri
  const imageUri = await metaplex.storage().upload(file)
  console.log("image uri:", imageUri)

  // upload metadata and get metadata uri (off chain metadata)
  const { uri } = await metaplex
    .nfts()
    .uploadMetadata({
      name: name,
      description: description,
      image: imageUri,
    })

  console.log("metadata uri:", uri)

  // get metadata account address
  const metadataPDA = await findMetadataPda(mint)

  // onchain metadata format
  const tokenMetadata = {
    name: name,
    symbol: symbol,
    uri: uri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  } as DataV2

  // transaction to update metadata account
  const transaction = new web3.Transaction().add(
    createUpdateMetadataAccountV2Instruction(
      {
        metadata: metadataPDA,
        updateAuthority: user.publicKey,
      },
      {
        updateMetadataAccountArgsV2: {
          data: tokenMetadata,
          updateAuthority: user.publicKey,
          primarySaleHappened: true,
          isMutable: true,
        },
      }
    )
  )

  // send transaction
  const transactionSignature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [user]
  )

  console.log(
    `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

async function mintTokens(
  connection: web3.Connection,
  payer: web3.Keypair,
  mint: web3.PublicKey,
  destination: web3.PublicKey,
  authority: web3.Keypair,
  amount: number
) {
  const mintInfo = await token.getMint(connection, mint)

  const transactionSignature = await token.mintTo(
    connection,
    payer,
    mint,
    destination,
    authority,
    amount * 10 ** mintInfo.decimals
  )

  console.log(
    `Mint Token Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

async function createNewMint(
  connection: web3.Connection,
  payer: web3.Keypair,
  mintAuthority: web3.PublicKey,
  freezeAuthority: web3.PublicKey,
  decimals: number
): Promise<web3.PublicKey> {

  const tokenMint = await token.createMint(
    connection,
    payer,
    mintAuthority,
    freezeAuthority,
    decimals
  );

  console.log(`The token mint account address is ${tokenMint}`)
  console.log(
    `Token Mint: https://explorer.solana.com/address/${tokenMint}?cluster=devnet`
  );

  return tokenMint;
}

async function createTokenAccount(
  connection: web3.Connection,
  payer: web3.Keypair,
  mint: web3.PublicKey,
  owner: web3.PublicKey
) {
  const tokenAccount = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    owner
  )

  console.log(
    `Token Account: https://explorer.solana.com/address/${tokenAccount.address}?cluster=devnet`
  )

  return tokenAccount
}

async function transferTokens(
  connection: web3.Connection,
  payer: web3.Keypair,
  source: web3.PublicKey,
  destination: web3.PublicKey,
  owner: web3.PublicKey,
  amount: number,
  mint: web3.PublicKey
) {
  const mintInfo = await token.getMint(connection, mint)

  const transactionSignature = await token.transfer(
    connection,
    payer,
    source,
    destination,
    owner,
    amount * 10 ** mintInfo.decimals
  )

  console.log(
    `Transfer Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

async function burnTokens(
  connection: web3.Connection,
  payer: web3.Keypair,
  account: web3.PublicKey,
  mint: web3.PublicKey,
  owner: web3.Keypair,
  amount: number
) {
  const transactionSignature = await token.burn(
    connection,
    payer,
    account,
    mint,
    owner,
    amount
  )

  console.log(
    `Burn Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

/**
 *
 * SHIP CHALLENGE
 *  
**/

async function challenge(connection: web3.Connection, user: web3.Keypair) {
  // setup accounts
  // const mint = new web3.PublicKey("PUBLIC_ADDRESS")
  const mint: web3.Keypair = await web3.Keypair.generate()
  console.log(`mint secretKey: ${mint.secretKey}`);

  // get associated token account address for use
  const tokenATA = await token.getAssociatedTokenAddress(
    mint.publicKey,
    user.publicKey
  )
  console.log(`Your mint publickey is ${mint.publicKey.toBase58()}`);

  const name = "PEPE the frog"
  const description = "HODL!!!"
  const symbol = "PEPE"
  const decimals = 2
  const amount = 100

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      })
    )
  // file to buffer
  const buffer = fs.readFileSync("assets/pepe.png") // YOUR filename
  // buffer to metaplex file
  const file = toMetaplexFile(buffer, "pepe.png") // YOUR filename
  // upload image and get image uri
  const imageUri = await metaplex.storage().upload(file)
  console.log("image uri:", imageUri)
  // upload metadata and get metadata uri (off chain metadata)
  const { uri } = await metaplex
    .nfts()
    .uploadMetadata({
      name: name,
      description: description,
      image: imageUri,
    })
  console.log("metadata uri:", uri)

  // get metadata account address
  const metadataPDA = await findMetadataPda(mint.publicKey)

  // onchain metadata format
  const tokenMetadata = {
    name: name,
    symbol: symbol,
    uri: uri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  } as DataV2

  // initialize transaction
  const transaction = new web3.Transaction()

  transaction.add(
    // Create new account
    web3.SystemProgram.createAccount({
      fromPubkey: user.publicKey,
      newAccountPubkey: mint.publicKey,
      space: token.MINT_SIZE,
      lamports: await token.getMinimumBalanceForRentExemptMint(connection),
      programId: token.TOKEN_PROGRAM_ID,
    }),
    // Create new token mint
    token.createInitializeMintInstruction(
      mint.publicKey, // mint pubkey
      decimals, // decimals
      user.publicKey, // mint authority (an auth to mint token)
      null // freeze authority (we use null first, the auth can let you freeze user's token account)
    ),
    // Create metadata
    createCreateMetadataAccountV2Instruction(
      {
        metadata: metadataPDA,
        mint: mint.publicKey,
        mintAuthority: user.publicKey,
        payer: user.publicKey,
        updateAuthority: user.publicKey,
      },
      {
        createMetadataAccountArgsV2: {
          data: tokenMetadata,
          isMutable: true,
        },
      }
    )
  )

  transaction.add(
    token.createAssociatedTokenAccountInstruction(
      user.publicKey,
      tokenATA,
      user.publicKey,
      mint.publicKey
    )
  )
  transaction.add(
    token.createMintToInstruction(
      mint.publicKey,
      tokenATA,
      user.publicKey,
      amount * Math.pow(10, decimals)
    )
  )

  // send transaction
  const transactionSignature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [user, mint]
  )
  console.log(
    `Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"))
  const user = await initializeKeypair(connection)
  const balance = await connection.getBalance(user.publicKey)
  console.log("Current balance is", balance / web3.LAMPORTS_PER_SOL)
  console.log("PublicKey:", user.publicKey.toBase58())
  // MAKE SURE YOU REPLACE THIS ADDRESS WITH YOURS!
  const MINT_ADDRESS = "HkZ1k4LsdAaVTkoHAjjVfXyoMBcCfChyK5gPKTdwf9TG"
  await challenge(connection, user)
  // metaplex setup
  // const metaplex = Metaplex.make(connection)
  //   .use(keypairIdentity(user))
  //   .use(
  //     bundlrStorage({
  //       address: "https://devnet.bundlr.network",
  //       providerUrl: "https://api.devnet.solana.com",
  //       timeout: 60000,
  //     })
  //   )

  // Calling the token 
  // await createTokenMetadata(
  //   connection,
  //   metaplex,
  //   new web3.PublicKey(MINT_ADDRESS),
  //   user,
  //   "PEPE The Frog", // Token name - REPLACE THIS WITH YOURS
  //   "PEPE",     // Token symbol - REPLACE THIS WITH YOURS
  //   "HODL!!!" // Token description - REPLACE THIS WITH YOURS
  // )

  /*
  const mint = await createNewMint(
    connection,
    user,           // We'll pay the fees
    user.publicKey, // We're the mint authority
    user.publicKey, // And the freeze authority >:)
    2               // Only two decimals!
  )

  const tokenAccount = await createTokenAccount(
    connection,
    user,
    mint,
    user.publicKey   // Associating our address with the token account
  )

  // // Mint 100 tokens to our address
  await mintTokens(connection, user, mint, tokenAccount.address, user, 100)

  const receiver = web3.Keypair.generate().publicKey

  const receiverTokenAccount = await createTokenAccount(
    connection,
    user,
    mint,
    new web3.PublicKey('6fY8YHLFHhb1duGhadboNK31MXrRYvFjKJV43GmDgDPy')
  )


  await transferTokens(
    connection,
    user,
    tokenAccount.address,
    receiverTokenAccount.address,
    user.publicKey,
    50,
    mint
  )
  */

}

main()
  .then(() => {
    console.log("Finished successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
