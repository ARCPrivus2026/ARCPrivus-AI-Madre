const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function run(prompt){

  const completion = await client.chat.completions.create({

    model:"gpt-4o-mini",

    messages:[
      {
        role:"user",
        content:prompt
      }
    ]

  });

  return completion.choices[0].message.content;

}

module.exports = {
  run
};