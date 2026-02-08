import UserModel from "../../database/models/user.model";
import { logger } from "../../common/utils/logger-utils";

export class UserService {
  public async findUserById(userId: string) {
    const user = await UserModel.findById(userId, {
      password: false,
    });
    if (user) {
      logger.info("User lookup succeeded", { userId });
    } else {
      logger.warn("User lookup returned null", { userId });
    }
    return user || null;
  }
}
