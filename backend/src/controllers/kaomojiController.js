import Kaomoji from "../models/kaomoji.js";
export const getKaomoji = async (req, res, next) => {
    try {
        const {search = "", category = ""} = req.query;
        const page = Number(req.query.page ?? 1), limit = Number(req.query.limit ?? 40);
        if (typeof search !== "string" || search.length > 80 || typeof category !== "string" || category.length > 100 || !Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger((page - 1) * limit)) return res.status(400).json({message: "Invalid search, category, or pagination"});
        const filter = {};
        if (category) filter.categories = category.toLowerCase();
        if (search.trim()) {
            const pattern = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.$or = [{text: {$regex: pattern, $options: "i"}}, {tags: {$regex: pattern, $options: "i"}}];
        }
        const [items, total] = await Promise.all([
            Kaomoji.find(filter).sort({_id: 1}).skip((page - 1) * limit).limit(limit).select("text categories").lean(),
            Kaomoji.countDocuments(filter),
        ]);
        return res.json({items, total, page, limit});
    } catch (error) {return next(error);}
};
export const getKaomojiCategories = async (_req, res, next) => {
    try {
        const categories = await Kaomoji.aggregate([
            {$unwind: "$categories"}, {$group: {_id: "$categories", count: {$sum: 1}}}, {$sort: {_id: 1}},
            {$project: {_id: 0, name: "$_id", count: 1}},
        ]);
        return res.json({categories});
    } catch (error) {return next(error);}
};
