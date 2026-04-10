'use strict';

const mongoose = require('mongoose');

const libraryAccessSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tutor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revoked'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

// Indexes
libraryAccessSchema.index({ student_id: 1, tutor_id: 1 }, { unique: true });
libraryAccessSchema.index({ tutor_id: 1, status: 1 });
libraryAccessSchema.index({ student_id: 1, status: 1 });

const LibraryAccessModel = mongoose.model('LibraryAccess', libraryAccessSchema);

module.exports = LibraryAccessModel;
