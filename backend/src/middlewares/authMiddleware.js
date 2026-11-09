import jwt from 'jsonwebtoken';
import User from '../models/user.js';


//authorization: verifying user 
export const protectedRoute = (req, res, next) => {
    try {
        //get access token from header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

        if(!token){
            return res.status(401).json({message: "cannot find access token"});
        }

        //verifying token
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decodedUser) => {
            if(err){
                console.error(err);
                return res
                .status(403)
                .json({message: 'expired/incorrent access token'});
            }

        //find user
        const user = await User.findById(decodedUser.userId).select('-hashedPassword');

        if(!user) {
            return res.status(404).json({message: 'nonexistent user'})
        }

        //return user to req
        req.user = user;
        next();
    });
}

    catch(error){
        console.error('error authorizing jwt in authMiddleware', error);
        return res.status(500).json({message: 'system error'});
    }
};
