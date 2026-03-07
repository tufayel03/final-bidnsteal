const Order = require("../models/Order");

function isExpectedAuctionOrderIndex(index) {
  const filter = index?.partialFilterExpression?.sourceAuctionId;
  const filterType = filter?.$type;
  return Boolean(
    index?.unique &&
      index?.key &&
      Object.keys(index.key).length === 1 &&
      index.key.sourceAuctionId === 1 &&
      (filterType === "objectId" || filterType === 7)
  );
}

async function listIndexes(collection) {
  try {
    return await collection.indexes();
  } catch (error) {
    if (error?.code === 26 || error?.codeName === "NamespaceNotFound") {
      return [];
    }
    throw error;
  }
}

async function ensureOrderIndexes() {
  const indexes = await listIndexes(Order.collection);
  const conflicting = indexes.filter(
    (index) =>
      index?.name !== "_id_" &&
      index?.key &&
      Object.keys(index.key).length === 1 &&
      index.key.sourceAuctionId === 1 &&
      !isExpectedAuctionOrderIndex(index)
  );

  for (const index of conflicting) {
    await Order.collection.dropIndex(index.name);
  }

  await Order.collection.createIndex(
    { sourceAuctionId: 1 },
    {
      name: "sourceAuctionId_1",
      unique: true,
      partialFilterExpression: { sourceAuctionId: { $type: "objectId" } }
    }
  );
}

async function ensureRuntimeIndexes() {
  await ensureOrderIndexes();
}

module.exports = { ensureRuntimeIndexes };
