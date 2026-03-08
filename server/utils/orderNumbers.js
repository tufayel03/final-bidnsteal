const Order = require("../models/Order");
const Sequence = require("../models/Sequence");

const ORDER_SEQUENCE_KEY = "order_number";
const ORDER_NUMBER_DIGITS = 5;

async function seedOrderSequence() {
  const existingSequence = await Sequence.findOne({ key: ORDER_SEQUENCE_KEY });
  if (existingSequence) {
    return existingSequence;
  }

  const [latestNumericOrder] = await Order.aggregate([
    {
      $match: {
        orderNumber: { $regex: "^[0-9]+$" }
      }
    },
    {
      $project: {
        numericValue: { $toLong: "$orderNumber" }
      }
    },
    { $sort: { numericValue: -1 } },
    { $limit: 1 }
  ]);

  const totalOrders = await Order.countDocuments();
  const seedValue = Math.max(Number(latestNumericOrder?.numericValue || 0), totalOrders);

  try {
    return await Sequence.create({
      key: ORDER_SEQUENCE_KEY,
      value: seedValue
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Sequence.findOne({ key: ORDER_SEQUENCE_KEY });
    }
    throw error;
  }
}

function formatOrderNumber(value) {
  const numericValue = Number(value || 0);
  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new Error("Order sequence value is invalid.");
  }

  return String(numericValue).padStart(ORDER_NUMBER_DIGITS, "0");
}

async function makeOrderNumber() {
  await seedOrderSequence();
  const sequence = await Sequence.findOneAndUpdate(
    { key: ORDER_SEQUENCE_KEY },
    { $inc: { value: 1 } },
    { new: true }
  );

  return formatOrderNumber(sequence?.value);
}

module.exports = {
  makeOrderNumber
};
