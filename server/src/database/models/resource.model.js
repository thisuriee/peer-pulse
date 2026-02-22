'use strict';

const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    cloudinary_url: {
      type: String,
      required: true,
      trim: true,
    },
    tutor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Indexes for faster lookups
resourceSchema.index({ tutor_id: 1 });
resourceSchema.index({ type: 1 });

const ResourceModel = mongoose.model('Resource', resourceSchema);

module.exports = ResourceModel;
