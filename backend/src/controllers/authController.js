import bcrypt from "bcrypt"
import User from "../models/user.js";

//API signUp
export const signUp = async (req, res) => {
    try {
        const {username, password, email, firstName, lastName} = req.body;

        if(!username || !password || !email || !firstName || !lastName){
            return res.status(400).json({message: "cannot miss username, password, email, first name and last name"});
        }

        //check if username already exists
        const duplicate = await User.findOne({username});

        if(duplicate) {
            return res.status(409).json({message: "username already exists"});
        }

        //hashing password
        const hashedPassword = await bcrypt.hash(password, 10); // salt=10

        //create new user
        await User.create({
            username,
            hashedPassword,
            email,
            displayName: `${firstName} ${lastName}`,
        });

        //return
        return res.sendStatus(204);
    } catch (error) {
        console.error("error calling singUp", error);
        return res.status(500).json({message: "system error"});

    }
};

//API Signin
export const signIn = async (req, res) => {
}
