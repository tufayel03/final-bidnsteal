function attachJsonTransform(schema) {
  schema.virtual("id").get(function getId() {
    return this._id.toString();
  });

  const transform = (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  };

  schema.set("toJSON", { virtuals: true, versionKey: false, transform });
  schema.set("toObject", { virtuals: true, versionKey: false, transform });
}

module.exports = { attachJsonTransform };
