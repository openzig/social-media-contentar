import Router from "express";
import { Request, Response } from "express-serve-static-core";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
    apiKey: "",
});

router.route("/chat").post(async (req: Request, res: Response) => {
    let chat_messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [{
        role: "system",
        content: "You are a social media creator, and your job is to reply user's comments to your article." + 
                 "Please keep the response as short as possible. Also, The response should be as mean as possible." +
                 "Please use Chinese"
    }];

    const comments_chain: Array<OpenAI.Chat.ChatCompletionMessageParam> = req.body.messages;
    console.log(comments_chain)
    chat_messages = chat_messages.concat(comments_chain);
    const params: OpenAI.Chat.ChatCompletionCreateParams = {
        messages: chat_messages,
        model: 'gpt-3.5-turbo',
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    };
    console.log(params)
    const response: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
    console.log(response)
    res.json(response.choices[0].message);
});

export default router;
