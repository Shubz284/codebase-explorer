import "dotenv/config";
import { embedText } from "../lib/embeddings";

async function test() {
  const embedding = await embedText("hello world");
  if(embedding.length == 768){
    console.log("Good to move")
  }else{
    console.log("Fuck you");
  }
  console.log("Embedding length:", embedding.length);
  console.log("First 5 values:", embedding.slice(0,5));
}


const query = "How is weather data fetched?";

const queryEmbedding = await embedText(query);

console.log(queryEmbedding.length);

test();