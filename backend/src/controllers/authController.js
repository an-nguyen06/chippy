import bcrypt from "bcrypt";
import User from "../models/user.js";
import Session from "../models/session.js";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_TTL = '30m'; //deploy: <15m
const REFRESH_TOKEN_TTL = 14*24*60*60*1000; //14 days in miliseconds

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
        console.error("error calling signUp", error);
        return res.status(500).json({message: "system error"});

    }
};

//API Signin
export const signIn = async (req, res) => {
    try {
        //get input
        const {username, password} = req.body;

        if(!username || !password){
            return res.status(400).json({message: "username/password missing"});

        }

        //get hashedPassword from database, compare with password input
        const user = await User.findOne({username});

        if(!user){
            return res.status(401).json({message: "username/password incorrect"});
        }

        //check password
        const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);

        if(!passwordCorrect){
            return res.status(401).json({message: "user/password incorrect"});
        }
        //if matches, get new accessToken with JWT
        const accessToken = jwt.sign(
            {userId: user._id},
            process.env.ACCESS_TOKEN_SECRET, 
            {expiresIn: ACCESS_TOKEN_TTL});

        //refresh token
        const refreshToken = crypto.randomBytes(64).toString("hex");

        //new session to save refresh token
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
        });

        //return refresh token through cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: REFRESH_TOKEN_TTL,
        })

        //acess token: back to res
    return res.status(200).json({message: `User ${user.displayName} has logged in`, accessToken});
    
    }
    catch (error) {
        console.error("error calling signIn", error);
        return res.status(500).json({message: "system error"});

    }
};

//API Signout
export const signOut = async (req, res) => {
    try {
        //get refresh token from cookie
        const token = req.cookies?.refreshToken;

        if(token){
        //delete refresh token from Session
        await Session.deleteOne({refreshToken: token});

        //delete Cookie
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });
    }
    return res.sendStatus(204);
    }
    catch (error){
        console.error("error calling signOut", error);
        return res.status(500).json({message: "system error"});
    }
};

// Exchange the HttpOnly refresh cookie for a new short-lived access token.
export const refreshAccessToken = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (typeof token !== 'string' || !token) {
            return res.status(401).json({message: 'Please sign in again'});
        }
        // Check expiry explicitly: MongoDB TTL cleanup is asynchronous.
        const session = await Session.findOne({refreshToken: token, expiresAt: {$gt: new Date()}});
        if (!session || !await User.exists({_id: session.userId})) {
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            });
            return res.status(401).json({message: 'Session expired. Please sign in again'});
        }
        const accessToken = jwt.sign({userId: session.userId}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: ACCESS_TOKEN_TTL});
        res.set('Cache-Control', 'no-store');
        return res.status(200).json({accessToken});
    } catch (error) {
        console.error('error refreshing access token', error);
        return res.status(500).json({message: 'system error'});
    }
};
