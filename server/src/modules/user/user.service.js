"use strict";

const UserModel = require("../../database/models/user.model");
const { NotFoundException } = require("../../common/utils/errors-utils");
const { logger } = require("../../common/utils/logger-utils");

class UserService {
  /**
   * Find user by ID
   */
  async findUserById(userId) {
    const user = await UserModel.findById(userId, { password: false });
    if (user) {
      logger.info("User lookup succeeded", { userId });
    } else {
      logger.warn("User lookup returned null", { userId });
    }
    return user || null;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email) {
    const user = await UserModel.findOne({ email }, { password: false });
    return user || null;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const { name, bio, skills } = updateData;
    
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { name, bio, skills },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Update user role (admin only)
   */
  async updateRole(userId, role) {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Update reputation score
   */
  async updateReputationScore(userId, score) {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { reputationScore: score },
      { new: true }
    ).select("-password");

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }
}

module.exports = { UserService };
