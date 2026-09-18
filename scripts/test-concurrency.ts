import { mapWithConcurrency } from "../lib/concurrency";

const items = [1, 2, 3, 4, 5];

const results = await mapWithConcurrency(
  items,
  2,
  async (item) => {
    console.log("START:", item);

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );

    console.log("END:", item);

    return item * 10;
  }
);

console.log(results);