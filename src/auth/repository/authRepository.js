import prisma from '../../config/db.js';

export const addUser = async ({ email, username, name, password }) => {
    return await prisma.users.create({
        data: {
            email, username, name, password
        },
        omit: { password },
    });
};

export const getUserByEmail = async (email) => {
    return await prisma.users.findUnique({
        where: {
            email
        },
        select: {
            id: true,
            username: true,
            name: true,
            email: true,
            createdAt: true
        }
    });
};

export const getUserByUsername = async (username) => {
    return await prisma.users.findUnique({
        where: {
            username
        }
    });
};

export const getUserByEmailOrUsername = async (email) => {
    return await prisma.users.findFirst({
        where: {
            OR: [
                { email: email },
                { username: email }
            ]
        }
    });
};

export const addToken = async (refreshToken) => {
    return await prisma.authentications.create({
        data: { token: refreshToken }
    });
}

export const deleteToken = async (refreshToken) => {
    return await prisma.authentications.deleteMany({
        where: { token: refreshToken }
    });
}

export const getToken = async (refreshToken) => {
    return await prisma.authentications.findFirst({
        where: {
            token: refreshToken
        }
    });
};


