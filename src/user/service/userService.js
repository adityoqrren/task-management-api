import { NotFoundError } from "../../exceptions/errors.js";
import { getUserByName, getUserByUsername, getUserById } from "../repository/userRepository.js"

export const getUserByNameOrUsernameService = async ({ name, username }) => {
    if (name != null) {
        const user = await getUserByName(name);
        return user;
    } else {
        const user = await getUserByUsername(username);
        return user;
    }
}

export const getUserByIdService = async (id) => {
    const user = await getUserById(id);
    if (!user) {
        throw new NotFoundError('user with that id is not found');
    }
    return user;
}