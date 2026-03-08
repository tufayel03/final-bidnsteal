const couponSeeds = [
  {
    code: "SPEED10",
    type: "percent",
    value: 10,
    maxUses: 100,
    minOrderAmount: 20,
    appliesTo: "store",
    isActive: true
  }
];

const campaignTemplateSeeds = [
  {
    key: "weekly-drop",
    name: "Weekly Drop",
    subject: "Your next BidnSteal drop is live",
    html: "<p>Fresh inventory and auctions are live now.</p>"
  }
];

module.exports = {
  productSeeds: [],
  couponSeeds,
  campaignTemplateSeeds
};
