import prisma from "../../config/db.js";

export const getUserByUsername = async (username) => {
    return await prisma.users.findMany({
        where: {
            username: {
                startsWith: username,
                mode: 'insensitive'
            }
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

export const getUserByName = async (name) => {
    return await prisma.users.findMany({
        where: {
            name: {
                contains: name,
                mode: 'insensitive'
            }
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


export const getUserById = async (id) => {
    return await prisma.users.findFirst({
        where: {
            id
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

// export const getUser = async (nameToFind, userIdToFind) => {
//     console.log(`in getUser ${nameToFind} || ${userIdToFind}`);
//     const result =  await prisma.user.findMany({
//         where: {
//             ...(nameToFind && {
//                 name: {
//                     contains: nameToFind,
//                     mode: 'insensitive'
//                 }
//             }),
//             ...(userIdToFind && { id: userIdToFind })  // hanya ditambahkan jika defined
//         },
//         omit: {
//             password: true,
//             createdAt: true
//         },
//     });
//     return result;
// }