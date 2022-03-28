const hash = async (password: string): Promise<string> => {
    const bcrypt = require("bcrypt");
    return bcrypt.hashSync(password, 5);
}

export {hash}