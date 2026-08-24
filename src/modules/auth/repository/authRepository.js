import prisma from '../../../db/db.js';

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

export const addRefreshToken = async (userId, tokenHash, tx) => {
    const client = tx ?? prisma;
    await client.refreshTokens.create({
        data: {
            userId,
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
}

export const updateRefreshToken = async (tokenId, tx) => {
    const client = tx ?? prisma;
    return await client.refreshTokens.update({
        where: { id: tokenId },
        data: { revoked: true },
    });
}

export const deleteRefreshToken = async (tokenId) => {
    return await prisma.refreshTokens.deleteMany({
        where: { id: tokenId }
    });
}

export const getRefreshToken = async (tokenHash, revoked) => {
    return await prisma.refreshTokens.findFirst({
        where: {
            tokenHash,
            revoked
        }
    });
};


