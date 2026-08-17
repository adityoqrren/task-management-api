export const encodeCursor = (data) => {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
};

export const decodeCursor = (cursor) => {
  try {
    return JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    );
  } catch {
    throw new Error("Invalid cursor");
  }
};