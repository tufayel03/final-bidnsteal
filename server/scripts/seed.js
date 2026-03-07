const { env } = require("../config/env");
const { connectToDatabase } = require("../config/db");
const { seedDatabase } = require("../services/seedService");

async function run() {
  await connectToDatabase(env.mongoUri);
  const result = await seedDatabase();
  console.log("Seed complete:", result);
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
